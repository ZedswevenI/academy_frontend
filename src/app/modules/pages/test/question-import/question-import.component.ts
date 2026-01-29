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

  ngOnInit(): void { }

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

      this.parsedQuestions = this.parseQuestions(documentXml, images, relMap);

      if (this.parsedQuestions.length > 0) {
        this.currentStep = 'preview';
        console.log('✓ Parsed questions:', this.parsedQuestions);
      } else {
        this.errorMessage = 'No questions found in document';
      }

      console.log('Images found:', images);
      console.log('Relationships:', relMap);

    } catch (e) {
      console.error('Error processing DOCX:', e);
      this.errorMessage = 'Failed to process DOCX file: ' + (e as Error).message;
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
      const ext = name.split('.').pop()?.toLowerCase() || 'png';

      // Determine mime type
      let mimeType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'emf' || ext === 'wmf') mimeType = 'image/png'; // EMF/WMF treated as PNG

      images.set(name, `data:${mimeType};base64,${base64}`);
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

      // Extract text
      const textNodes = pNodes[i].getElementsByTagNameNS('*', 't');
      for (let j = 0; j < textNodes.length; j++) {
        html += textNodes[j].textContent || '';
      }

      // Extract images
      // Extract images
      const drawings = pNodes[i].getElementsByTagNameNS('*', 'drawing');

      for (let d = 0; d < drawings.length; d++) {
        const blips = drawings[d].getElementsByTagName('a:blip');
        if (!blips.length) continue;

        const rId = blips[0].getAttribute('r:embed');
        if (!rId) continue;

        const imageName = relMap.get(rId);
        const data = imageName ? images.get(imageName) : null;

        if (data) {
          html += `
      <img 
        src="${data}" 
        style="max-width:100%;height:auto;margin:10px 0;display:block;" 
      />
    `;
        }
      }



      const trimmed = html.trim();
      if (trimmed) {
        paragraphs.push(trimmed);
      }
    }

    return paragraphs;
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
    let questionTextLines: string[] = [];
    let optionBuffer: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];

      // New question starts
      if (p.startsWith('[Q]')) {
        // Save previous question
        if (current) {
          const qText = p.replace('[Q]', '').trim();
          if (qText) {
            questionTextLines.push(qText);
          }
          if (questionTextLines.length > 0) {
            current.questionText = questionTextLines.join(' ').trim();
            current.questionHtml = this.convertToHtml(current.questionText);
          }
          questions.push(current);
        }

        // Initialize new question
        current = {
          id: questions.length + 1,
          questionText: '',
          questionHtml: '',
          options: [],
          qtype: 'mcq',
          difficulty: 'medium',
          answer: '',
          positiveMarks: 4,
          negativeMarks: 1,
          sortid: '',
          solutionHtml: ''
        };
        questionTextLines = [];
        optionBuffer = [];
        continue;
      }

      if (!current) continue;

      // Metadata tags
      if (p.startsWith('[qtype]')) {
        current.qtype = p.replace('[qtype]', '').trim();
        continue;
      }

      if (p.startsWith('[DIFFICULTY]')) {
        current.difficulty = p.replace('[DIFFICULTY]', '').trim().toLowerCase();
        continue;
      }

      if (p.startsWith('[ans]')) {
        current.answer = p.replace('[ans]', '').trim().toLowerCase();
        continue;
      }

      if (p.startsWith('[Marks]')) {
        const marksStr = p.replace('[Marks]', '').trim();
        const parts = marksStr.split(',').map(s => parseFloat(s.trim()));
        if (parts.length >= 1) current.positiveMarks = parts[0];
        if (parts.length >= 2) current.negativeMarks = parts[1];
        continue;
      }

      if (p.startsWith('[sortid]')) {
        current.sortid = p.replace('[sortid]', '').trim();
        continue;
      }

      if (p.startsWith('[soln]')) {
        current.solutionHtml = this.convertToHtml(p.replace('[soln]', '').trim());
        continue;
      }

      // Check if this paragraph contains inline options: (A) ... (B) ... (C) ... (D) ...
      const inlineOptions = this.extractInlineOptions(p);
      if (inlineOptions.length >= 2) {
        // This line has multiple options
        inlineOptions.forEach(opt => {
          current!.options.push({
            label: opt.label,
            text: opt.text,
            html: this.convertToHtml(opt.text)
          });
        });
        continue;
      }

      // Check if starts with single option marker: (A), (B), (C), (D)
      const singleOptionMatch = p.match(/^\(([A-Da-d])\)\s*/);
      if (singleOptionMatch) {
        const label = singleOptionMatch[1].toLowerCase();
        const text = p.replace(/^\([A-Da-d]\)\s*/, '').trim();

        current.options.push({
          label: label,
          text: text,
          html: this.convertToHtml(text)
        });
        continue;
      }

      // Skip question numbers like "1.", "2.", etc.
      if (/^\d+\.\s*$/.test(p)) {
        continue;
      }

      // Skip section headers
      if (p.includes('[PHYSICS]') || p.includes('[CHEMISTRY]') || p.includes('[MATHS]')) {
        continue;
      }

      // Otherwise, it's question text
      questionTextLines.push(p);
    }


    // Save last question
    if (current) {
      if (questionTextLines.length > 0) {
        current.questionText = questionTextLines.join(' ').trim();
        current.questionHtml = this.convertToHtml(current.questionText);
      }
      questions.push(current);
    }

    return questions;
  }

  /**
   * Extract multiple inline options from a single paragraph
   * Example: "(A) option1 (B) option2 (C) option3 (D) option4"
   */
  private extractInlineOptions(text: string): Array<{ label: string; text: string }> {
    const regex = /\(([A-Da-d])\)/g;
    const matches = [...text.matchAll(regex)];

    if (matches.length < 2) return [];

    const options: Array<{ label: string; text: string }> = [];

    for (let i = 0; i < matches.length; i++) {
      const label = matches[i][1].toLowerCase();
      const start = matches[i].index! + matches[i][0].length;
      const end = (i + 1 < matches.length) ? matches[i + 1].index! : text.length;

      const optionText = text.substring(start, end).trim();

      options.push({ label, text: optionText });
    }

    return options;
  }

  /* ================= HTML FORMAT ================= */

  private convertToHtml(text: string): string {
    let html = text;

    // Convert **bold**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert *italic*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Keep LaTeX formulas as-is (they're already in the text from Word)
    // Just wrap them in a span for styling
    html = html.replace(/\$(.+?)\$/g, '<span class="latex">$$$1$$</span>');

    return html;
  }

  /* ================= UI ================= */

  submitAllQuestions() {
    const payload = this.buildBulkQuestionPayload();
    console.log('Submitting payload:', payload);

    // Here you would call your API
    // this.http.post('/api/questions/bulk', payload).subscribe(...)

    this.currentStep = 'success';
  }

  reset() {
    this.selectedFile = null;
    this.parsedQuestions = [];
    this.currentStep = 'upload';
    this.errorMessage = '';
  }

  getCorrectOptionLabels(q: ParsedQuestion): string {
    return q.answer.toUpperCase();
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
          q.options && q.options.length > 0
            ? q.options.map(opt => ({
              text: opt.html,
              is_correct: q.answer
                .split(',')
                .map(a => a.trim().toLowerCase())
                .includes(opt.label)
            }))
            : [],
        solution_html: q.solutionHtml || null
      }))
    };
  }
}