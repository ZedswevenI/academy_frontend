import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import JSZip from 'jszip';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

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
  styleUrls: ['./question-import.component.scss'],
})
export class QuestionImportComponent implements OnInit {
  questionForm!: FormGroup;
  testId = '';
  examId = '';
  sections: any[] = [];
  selectedSectionId = '';
  isBankMode = false;

  /* ================= BANK MODE: SUBJECT / TOPIC / SUBTOPIC ================= */
  subjects: any[] = [];
  allTopics: any[] = [];
  allSubTopics: any[] = [];
  subjectOptions: any[] = [];
  topicOptions: any[] = [];
  subTopicOptions: any[] = [];
  selectedSubjectId = '';
  selectedTopicId = '';
  selectedSubTopicId = '';
  selectedClassNo: number | null = null;

  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({ label: `Class ${i + 6}`, value: i + 6 })),
    { label: '12th Pass', value: 13 }
  ];

  ngOnInit(): void {
    if (this.isBankMode) {
      this.loadBankMasters();
    }
  }

  private loadBankMasters(): void {
    const body = { entiId: localStorage.getItem('tenantId') };
    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => {
        this.subjects = res?.data || [];
        this.subjectOptions = this.subjects.map((s: any) => ({
          label: s.subjectName,
          value: s._id,
        }));
      },
    });
    // this.commonApi.fetchData(body, 'ims/topic', 'list?list=full').subscribe({
    //   next: (res: any) => { this.allTopics = res?.data || []; }
    // });
    // this.commonApi.fetchData(body, 'ims/subtopic', 'list?list=full').subscribe({
    //   next: (res: any) => { this.allSubTopics = res?.data || []; }
    // });
  }

  onBankSubjectChange(subjectId: string): void {
    this.selectedSubjectId = subjectId;
    this.selectedTopicId = '';
    this.selectedSubTopicId = '';
    this.subTopicOptions = [];
    if (subjectId) {
      this.topicOptions = this.allTopics
        .filter((t: any) => (t.subjectId?._id || t.subjectId) === subjectId)
        .map((t: any) => ({ label: t.topicName, value: t.topicId }));
    } else {
      this.topicOptions = [];
    }
  }

  onBankTopicChange(topicId: string): void {
    this.selectedTopicId = topicId;
    this.selectedSubTopicId = '';
    if (topicId) {
      this.subTopicOptions = this.allSubTopics
        .filter((st: any) => (st.topicId?.topicId || st.topicId) === topicId)
        .map((st: any) => ({ label: st.subTopicName, value: st.subTopicId }));
    } else {
      this.subTopicOptions = [];
    }
  }

  selectedFile: File | null = null;
  parsedQuestions: ParsedQuestion[] = [];
  errorMessage = '';
  isProcessing = false;
  currentStep: 'upload' | 'preview' | 'success' = 'upload';

  constructor(
    private fb: FormBuilder,
    private breadcrump: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as any;

    if (state?.bank) {
      this.isBankMode = true;
      this.breadcrump.set([
        { label: 'Questions', link: '/app/exams/questions' },
        { label: 'Import' },
      ]);
    } else if (state?.questions) {
      this.testId = state.questions.examId || state.questions.testId;
      this.examId = state.questions.examId || state.questions.testId || '';
      this.sections = state.questions.sections || [];
      this.breadcrump.set([
        { label: 'Exam', link: '/app/exams/exams' },
        { label: 'Import' },
      ]);
    }
    this.questionForm = this.fb.group({
      questionType: ['mcq-single', Validators.required],
      questionText: ['', Validators.required],
      marks: [1, [Validators.required, Validators.min(0)]],
      difficulty: ['medium'],
      options: this.fb.array([]),
      trueFalseAnswer: [null],
      subjectiveAnswer: [''],
      matrixLeft: this.fb.array([]),
      matrixRight: this.fb.array([]),
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
      this.errorMessage =
        'Failed to process DOCX file: ' + (e as Error).message;
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
    const files = Object.keys(zip.files).filter((f) =>
      f.startsWith('word/media/'),
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
    relMap: Map<string, string>,
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
    relMap: Map<string, string>,
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
          solutionHtml: '',
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
        const parts = marksStr.split(',').map((s) => parseFloat(s.trim()));
        if (parts.length >= 1) current.positiveMarks = parts[0];
        if (parts.length >= 2) current.negativeMarks = parts[1];
        continue;
      }

      if (p.startsWith('[sortid]')) {
        current.sortid = p.replace('[sortid]', '').trim();
        continue;
      }

      if (p.startsWith('[soln]')) {
        current.solutionHtml = this.convertToHtml(
          p.replace('[soln]', '').trim(),
        );
        continue;
      }

      // Check if this paragraph contains inline options: (A) ... (B) ... (C) ... (D) ...
      const inlineOptions = this.extractInlineOptions(p);
      if (inlineOptions.length >= 2) {
        // This line has multiple options
        inlineOptions.forEach((opt) => {
          current!.options.push({
            label: opt.label,
            text: opt.text,
            html: this.convertToHtml(opt.text),
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
          html: this.convertToHtml(text),
        });
        continue;
      }

      // Skip question numbers like "1.", "2.", etc.
      if (/^\d+\.\s*$/.test(p)) {
        continue;
      }

      // Skip section headers
      if (
        p.includes('[PHYSICS]') ||
        p.includes('[CHEMISTRY]') ||
        p.includes('[MATHS]')
      ) {
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
  private extractInlineOptions(
    text: string,
  ): Array<{ label: string; text: string }> {
    const regex = /\(([A-Da-d])\)/g;
    const matches = [...text.matchAll(regex)];

    if (matches.length < 2) return [];

    const options: Array<{ label: string; text: string }> = [];

    for (let i = 0; i < matches.length; i++) {
      const label = matches[i][1].toLowerCase();
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;

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

  async submitAllQuestions() {
    if (!this.isBankMode && !this.selectedSectionId) {
      this.alert.error('Please select a subject before submitting');
      return;
    }
    if (this.isBankMode && !this.selectedTopicId.trim()) {
      this.alert.error('Please enter a topic before submitting');
      return;
    }
    const payload = await this.buildBulkQuestionPayload();
    const entiId = localStorage.getItem('tenantId');
    if (this.isBankMode) {
      if (payload.questions?.length) {
        payload.questions = payload.questions.map((q: any) => ({
          ...q,
          subjectId: this.selectedSubjectId || undefined,
          topicId: this.selectedTopicId.trim() || undefined,
          subTopicId: this.selectedSubTopicId.trim() || undefined,
          classNo: this.selectedClassNo || undefined,
        }));
      }
      const bankPayload: any = { entiId, ...payload };
      this.commonApi
        .fetchData(bankPayload, 'exam/questions/bank', 'bulk-create')
        .subscribe({
          next: (res: any) => {
            if (res?.status) {
              this.alert.success(
                res.message || 'Questions imported successfully',
              );
              this.router.navigate(['/app/exams/questions']);
            } else {
              this.alert.error('Error importing questions');
            }
          },
          error: (e) => this.alert.error(e.error?.message || 'Import failed'),
        });
    } else {
      const examPayload = {
        entiId,
        examId: this.examId,
        sectionId: this.selectedSectionId,
        ...payload,
      };
      this.commonApi
        .fetchData(examPayload, 'exam/questions', 'bulk-create')
        .subscribe({
          next: (res: any) => {
            if (res?.status) {
              this.alert.success(
                res.message || 'Questions imported successfully',
              );
              this.router.navigate(['/app/exams/exams']);
            } else {
              this.alert.error('Error importing questions');
            }
          },
          error: (e) => this.alert.error(e.error?.message || 'Import failed'),
        });
    }
  }

  reset() {
    this.selectedFile = null;
    this.parsedQuestions = [];
    this.currentStep = 'upload';
    this.errorMessage = '';
    this.selectedTopicId = '';
    this.selectedSubTopicId = '';
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

  async prepareFile(base64: string): Promise<File> {
    const compressed = await this.compressBase64Image(base64, 20);

    const arr = compressed.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], `img-${Date.now()}.jpg`, { type: mime });
  }

  base64SizeKB(base64: string): number {
    const stringLength = base64.length - 'data:image/jpeg;base64,'.length;
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
    return sizeInBytes / 1024;
  }

  compressBase64Image(base64: string, maxSizeKB = 20): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Resize (important for size reduction)
        const maxWidth = 800; // adjust if needed
        const scale = maxWidth / img.width;

        canvas.width = maxWidth;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = 0.7;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        // Reduce quality until size < maxSizeKB
        while (this.base64SizeKB(compressed) > maxSizeKB && quality > 0.1) {
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(compressed);
      };
    });
  }

  extractBase64Images(html: string): { images: string[]; cleanedHtml: string } {
    const images: string[] = [];
    let cleanedHtml = html;

    const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/g;

    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }

    return { images, cleanedHtml };
  }

  async uploadImage(base64: string): Promise<string | null> {
    // const payload = { image: base64 };
    try {
      const file = await this.prepareFile(base64);

      const formData = new FormData();
      formData.append('files', file); // important: key must match backend
      const res: any = await firstValueFrom(
        this.commonApi.uploadImage(formData, 'exam/questions', 'upload-image'),
      );
      if (res?.status && res?.files?.length) {
        return res.files[0].s3Url;
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async replaceImagesWithUrls(html: string): Promise<string> {
    const { images } = this.extractBase64Images(html);
    let updatedHtml = html;
    for (const base64 of images) {
      const imageUrl = await this.uploadImage(base64);
      updatedHtml = updatedHtml.replace(base64, imageUrl || '');
    }
    return updatedHtml;
  }

  async buildBulkQuestionPayload(): Promise<any> {
    const questions = await Promise.all(
      this.parsedQuestions.map(async (q) => {
        const questionHtml = await this.replaceImagesWithUrls(q.questionHtml);
        const solutionHtml = q.solutionHtml
          ? await this.replaceImagesWithUrls(q.solutionHtml)
          : null;

        const processedOptions =
          q.options && q.options.length
            ? await Promise.all(
                q.options.map(async (opt) => ({
                  textHtml: await this.replaceImagesWithUrls(opt.html),
                  isCorrect: q.answer
                    .split(',')
                    .map((a) => a.trim().toLowerCase())
                    .includes(opt.label),
                })),
              )
            : [];
        return {
          questionType: q.qtype,
          questionHtml,
          correctAnswer: q.answer,
          difficulty: q.difficulty,
          positiveMarks: q.positiveMarks,
          negativeMarks: q.negativeMarks,
          questionOptions: processedOptions,
          solutionHtml: solutionHtml,
        };
      }),
    );

    return { questions };
  }
}
