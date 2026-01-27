import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import JSZip from 'jszip';

interface ParsedQuestion {
  id: number;
  questionText: string;
  questionHtml: string;
  options: Array<{ label: string; text: string; html: string }>;
  qtype: string;
  difficulty: string;
  answer: string;
  positiveMarks: number;
  negativeMarks: number;
  sortid: string;
  solutionHtml: string;
}

@Component({
  selector: 'app-question-import',
  standalone: false,
  templateUrl: './question-import.component.html',
  styleUrls: ['./question-import.component.scss']
})
export class QuestionImportComponent implements OnInit {
  questionForm!: FormGroup;


  ngOnInit(): void {

  }
  selectedFile: File | null = null;
  parsedQuestions: ParsedQuestion[] = [];
  errorMessage = '';
  isProcessing = false;
  currentStep: 'upload' | 'preview' | 'success' = 'upload';


  constructor(private fb: FormBuilder) {
    this.questionForm = this.fb.group({
      questionType: ['mcq-single', Validators.required],
      questionText: ['', Validators.required],
      marks: [1, [Validators.required, Validators.min(0)]],
      difficulty: ['medium'],
      options: this.fb.array([]),
      trueFalseAnswer: [null],
      subjectiveAnswer: [''],
      matrixLeft: this.fb.array([]),
      matrixRight: this.fb.array([])
    });
  }

  /* ================= FILE ================= */

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.docx')) {
      this.selectedFile = file;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Please upload a valid DOCX file';
    }
  }

  async processDocx() {
    if (!this.selectedFile) return;

    this.isProcessing = true;
    this.errorMessage = '';

    try {
      const buffer = await this.readFile(this.selectedFile);
      const zip = await JSZip.loadAsync(buffer);

      const documentXml = await zip.file('word/document.xml')!.async('string');
      const relsXml = await zip
        .file('word/_rels/document.xml.rels')!
        .async('string');

      const images = await this.extractImages(zip);
      const relMap = this.parseImageRelationships(relsXml);

      this.parsedQuestions = this.parseQuestions(
        documentXml,
        images,
        relMap
      );

      this.currentStep =
        this.parsedQuestions.length > 0 ? 'preview' : 'upload';
    } catch (e) {
      console.error(e);
      this.errorMessage = 'Failed to process DOCX file';
    } finally {
      this.isProcessing = false;
    }
  }

  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as ArrayBuffer);
      reader.onerror = rej;
      reader.readAsArrayBuffer(file);
    });
  }

  /* ================= IMAGES ================= */

  private async extractImages(zip: JSZip): Promise<Map<string, string>> {
    const images = new Map<string, string>();
    const files = Object.keys(zip.files).filter(f =>
      f.startsWith('word/media/')
    );

    for (const path of files) {
      const base64 = await zip.file(path)!.async('base64');
      const name = path.split('/').pop()!;
      images.set(name, `data:image/png;base64,${base64}`);
    }
    return images;
  }

  private parseImageRelationships(xml: string): Map<string, string> {
    const map = new Map<string, string>();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const rels = doc.getElementsByTagName('Relationship');

    for (let i = 0; i < rels.length; i++) {
      const id = rels[i].getAttribute('Id');
      const target = rels[i].getAttribute('Target');
      if (id && target?.startsWith('media/')) {
        map.set(id, target.replace('media/', ''));
      }
    }
    return map;
  }

  /* ================= PARAGRAPH EXTRACTION ================= */

  private extractParagraphs(
    xmlDoc: Document,
    images: Map<string, string>,
    relMap: Map<string, string>
  ): string[] {
    const paragraphs: string[] = [];
    const pNodes = xmlDoc.getElementsByTagNameNS('*', 'p');

    for (let i = 0; i < pNodes.length; i++) {
      let html = '';

      // text
      const textNodes = pNodes[i].getElementsByTagNameNS('*', 't');
      for (let j = 0; j < textNodes.length; j++) {
        html += textNodes[j].textContent;
      }

      // images in THIS paragraph
      const drawings = pNodes[i].getElementsByTagNameNS('*', 'drawing');
      for (let d = 0; d < drawings.length; d++) {
        const blip = drawings[d].getElementsByTagNameNS('*', 'blip')[0];
        const rId = blip?.getAttribute('r:embed');
        if (!rId) continue;

        const imageName = relMap.get(rId);
        const data = imageName ? images.get(imageName) : null;

        if (data) {
          html += `<img src="${data}" style="max-width:100%;margin:10px 0" />`;
        }
      }

      paragraphs.push(html.trim());
    }

    return paragraphs.filter(p => p.length > 0);
  }

  /* ================= CORE PARSER ================= */

  private parseQuestions(
    xml: string,
    images: Map<string, string>,
    relMap: Map<string, string>
  ): ParsedQuestion[] {
    const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    const paragraphs = this.extractParagraphs(xmlDoc, images, relMap);

    const questions: ParsedQuestion[] = [];
    let current: ParsedQuestion | null = null;
    let inSolution = false;

    paragraphs.forEach(p => {
      if (p.startsWith('[Q]')) {
        if (current) questions.push(current);

        current = {
          id: questions.length + 1,
          questionText: p.replace('[Q]', '').trim(),
          questionHtml: '',
          options: [],
          qtype: 'mcq',
          difficulty: 'medium',
          negativeMarks: 0,
          positiveMarks: 0,
          answer: '',
          sortid: '',
          solutionHtml: ''
        };

        current.questionHtml = this.convertToHtml(
          current.questionText
        );
        inSolution = false;
        return;
      }

      if (!current) return;

      if (p.startsWith('[qtype]')) {
        current.qtype = p.replace('[qtype]', '').trim();
      } else if (p.startsWith('[DIFFICULTY]')) {
        current.difficulty = p.replace('[DIFFICULTY]', '').trim();
      } else if (p.startsWith('[ans]')) {
        current.answer = p.replace('[ans]', '').trim();
      } else if (p.startsWith('[Marks]')) {
        const raw = p.replace('[Marks]', '').trim();
        const nums = raw.match(/-?\d+/g)?.map(Number) || [];

        if (nums.length === 1) {
          // Only positive mark
          current.positiveMarks = Math.abs(nums[0]);
          current.negativeMarks = 0;
        } else if (nums.length >= 2) {
          current.positiveMarks = Math.abs(nums[0]);
          current.negativeMarks = Math.abs(nums[1]);
        }
      }
      else if (p.startsWith('[sortid]')) {
        current.sortid = p.replace('[sortid]', '').trim();
      } else if (p.startsWith('[soln]')) {
        inSolution = true;

        const solnText = p.replace('[soln]', '').trim();
        if (solnText) {
          current.solutionHtml += this.convertToHtml(solnText);
        }
      } else if (/^\([a-d]\)/.test(p)) {
        const label = p[1];
        const text = p.replace(/^\([a-d]\)\s*/, '');
        current.options.push({
          label,
          text,
          html: this.convertToHtml(text)
        });
      } else if (inSolution) {
        current.solutionHtml += this.convertToHtml(p);
      } else {
        current.questionText += ' ' + p;
        current.questionHtml = this.convertToHtml(
          current.questionText
        );
      }
    });

    if (current) questions.push(current);

    return questions;
  }

  /* ================= HTML FORMAT ================= */

  private convertToHtml(text: string): string {
    let html = text;

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    return html;
  }

  /* ================= UI ================= */

  submitAllQuestions() {

    const payload = this.buildBulkQuestionPayload();
    console.log('Submitting payload:', payload);
    this.currentStep = 'success';
  }

  reset() {
    this.selectedFile = null;
    this.parsedQuestions = [];
    this.currentStep = 'upload';
  }

  getCorrectOptionLabels(q: ParsedQuestion) {
    return q.answer;
  }

  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  get matrixLeft(): FormArray {
    return this.questionForm.get('matrixLeft') as FormArray;
  }

  get matrixRight(): FormArray {
    return this.questionForm.get('matrixRight') as FormArray;
  }

  buildBulkQuestionPayload() {
    return {
      questions: this.parsedQuestions.map(q => ({
        question_type: q.qtype,
        question_html: q.questionHtml,
        difficulty: q.difficulty,
        positive_marks: q.positiveMarks,
        negative_marks: q.negativeMarks,
        options:
          q.options && q.options.length
            ? q.options.map(opt => ({
              text: opt.html,
              is_correct: q.answer
                ?.split(',')
                .map(a => a.trim())
                .includes(opt.label)
            }))
            : [],

        true_false_answer:
          q.qtype === 'true-false'
            ? q.answer === 'true'
            : null,

        subjective_answer:
          q.qtype === 'subjective'
            ? q.solutionHtml
            : null,

        solution_html: q.solutionHtml
      }))
    };
  }



}
