import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  qtypeRaw: string;
  difficulty: string;
  answer: string;
  positiveMarks: number;
  negativeMarks: number;
  hasPartialMarking: boolean;
  numericMin: number | null;
  numericMax: number | null;
  sortid: string;
  solutionHtml: string;
  matrixLeft: string[];
  matrixRight: string[];
  partialMarkPerCorrect?: number | null;
}

// Tag-format ([SORT]/@QS/@OS/@TagS blocks) question-type codes -> canonical questionType
const TAG_FORMAT_QTYPE_MAP: Record<string, string> = {
  SCO: 'mcq_single',
  MCO: 'mcq_multi',
  INT: 'integer',
  NUM: 'numeric',
  SUB: 'subjective',
  TF: 'true_false',
  COM: 'passage_qns',
  MTM: 'matrix',
};

const NTA_DEFAULTS: Record<
  string,
  { pos: number; neg: number; partial: boolean }
> = {
  mcq_single: { pos: 4, neg: 1, partial: false },
  mcq_multi: { pos: 4, neg: 1, partial: true },
  integer: { pos: 4, neg: 1, partial: false },
  numeric: { pos: 4, neg: 1, partial: false },
  true_false: { pos: 2, neg: 1, partial: false },
  subjective: { pos: 4, neg: 1, partial: false },
  short_answer: { pos: 4, neg: 1, partial: false },
  passage_qns: { pos: 4, neg: 1, partial: false },
  matrix: { pos: 8, neg: 1, partial: true },
};

function buildCorrectAnswer(
  qtype: string,
  rawAnswer: string,
  positiveMarks?: number,
  leftCount?: number,
  partialMarkPerCorrect?: number | null,
): string {
  const ans = (rawAnswer || '').trim();
  switch (qtype) {
    case 'mcq_single':
      return ans.toUpperCase().split(/[,;\s]/)[0] || '';
    case 'mcq_multi':
      return ans
        .toUpperCase()
        .split(/[,;\s]+/)
        .filter(Boolean)
        .join(';');
    case 'true_false':
      return ['true', 't', '1', 'yes', 'y'].includes(ans.toLowerCase())
        ? 'true'
        : 'false';
    case 'integer':
      return String(parseInt(ans, 10) || 0);
    case 'numeric':
      return ans;
    case 'matrix': {
      const pairs = ans
        .toUpperCase()
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const perPairMarks =
        partialMarkPerCorrect != null
          ? partialMarkPerCorrect
          : leftCount && leftCount > 0
            ? parseFloat(((positiveMarks || 8) / leftCount).toFixed(2))
            : 2;
      const grouped: Record<string, string[]> = {};
      for (const pair of pairs) {
        const [lKey, rKey] = pair.split(':').map((s) => s.trim());
        if (!lKey || !rKey) continue;
        if (!grouped[lKey]) grouped[lKey] = [];
        if (!grouped[lKey].includes(rKey)) grouped[lKey].push(rKey);
      }
      return Object.entries(grouped)
        .map(([lKey, rKeys]) => `${lKey}:${rKeys.join(',')}(${perPairMarks},0)`)
        .join(';');
    }
    default:
      return ans;
  }
}

@Component({
  selector: 'app-question-import-new',
  standalone: false,
  templateUrl: './question-import-new.component.html',
  styleUrl: './question-import-new.component.scss',
})
export class QuestionImportNewComponent implements OnInit {
  testId = '';
  examId = '';
  examData: any = null;
  sections: any[] = [];
  selectedSectionId = '';
  isBankMode = false;
  subjects: any[] = [];
  subjectOptions: any[] = [];
  selectedSubjectId = '';
  selectedTopicId = '';
  selectedSubTopicId = '';
  selectedClassNo: number | null = null;
  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({
      label: `Class ${i + 6}`,
      value: i + 6,
    })),
    { label: '12th Pass', value: 13 },
  ];
  selectedFile: File | null = null;
  parsedQuestions: ParsedQuestion[] = [];
  errorMessage = '';
  isProcessing = false;
  currentStep: 'upload' | 'preview' | 'success' = 'upload';
  tenantId = '';

  constructor(
    private fb: FormBuilder,
    private breadcrump: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
  ) {
    this.tenantId = localStorage.getItem('tenantId') || '';
    const state = history.state as any;

    if (state?.bank) {
      this.isBankMode = true;
      this.breadcrump.set([
        { label: 'Questions', link: '/app/exams/questions' },
        { label: 'Import' },
      ]);
    } else if (state?.questions) {
      this.testId = state.questions.examId || state.questions.testId;
      this.examId = state.questions.examId || state.questions.testId || '';
      this.examData = state.questions;
      this.sections = state.questions.sections || [];
      this.breadcrump.set([
        { label: 'Exam', link: '/app/exams/exams' },
        { label: 'Import' },
      ]);
    }
  }

  ngOnInit(): void {
    if (this.isBankMode) this.loadBankMasters();
  }

  private loadBankMasters(): void {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjects = res?.data || [];
          this.subjectOptions = this.subjects.map((s: any) => ({
            label: s.subjectName,
            value: s._id,
          }));
        },
      });
  }

  onBankSubjectChange(subjectId: string): void {
    this.selectedSubjectId = subjectId;
  }

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
      } else {
        this.errorMessage =
          'No questions found. Ensure @QS is used to mark each question.';
      }
    } catch (e) {
      this.errorMessage = 'Failed to process DOCX: ' + (e as Error).message;
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

  private async extractImages(zip: JSZip): Promise<Map<string, string>> {
    const images = new Map<string, string>();
    const files = Object.keys(zip.files).filter((f) =>
      f.startsWith('word/media/'),
    );
    for (const path of files) {
      const base64 = await zip.file(path)!.async('base64');
      const name = path.split('/').pop()!;
      const ext = name.split('.').pop()?.toLowerCase() || 'png';
      let mimeType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'gif') mimeType = 'image/gif';
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
      if (id && target?.startsWith('media/'))
        map.set(id, target.replace('media/', ''));
    }
    return map;
  }

  private extractParagraphs(
    xmlDoc: Document,
    images: Map<string, string>,
    relMap: Map<string, string>,
  ): string[] {
    const paragraphs: string[] = [];
    const pNodes = xmlDoc.getElementsByTagNameNS('*', 'p');
    for (let i = 0; i < pNodes.length; i++) {
      let html = '';
      const textNodes = pNodes[i].getElementsByTagNameNS('*', 't');
      for (let j = 0; j < textNodes.length; j++) {
        html += textNodes[j].textContent || '';
      }
      const drawings = pNodes[i].getElementsByTagNameNS('*', 'drawing');
      for (let d = 0; d < drawings.length; d++) {
        const blips = drawings[d].getElementsByTagName('a:blip');
        if (!blips.length) continue;
        const rId = blips[0].getAttribute('r:embed');
        if (!rId) continue;
        const imageName = relMap.get(rId);
        const data = imageName ? images.get(imageName) : null;
        if (data) {
          html += `<img src="${data}" style="max-width:100%;height:auto;margin:8px 0;display:block;" />`;
        }
      }
      const trimmed = html.trim();
      if (trimmed) paragraphs.push(trimmed);
    }
    return paragraphs;
  }

  private parseQuestions(
    xml: string,
    images: Map<string, string>,
    relMap: Map<string, string>,
  ): ParsedQuestion[] {
    const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    const paragraphs = this.extractParagraphs(xmlDoc, images, relMap);
    return this.parseTagBlockQuestions(paragraphs);
  }

  // [SORT]/@QS.../@QE/@OS.../@OE/@TagS.../@TagE block format
  private parseTagBlockQuestions(paragraphs: string[]): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    let current: ParsedQuestion | null = null;
    let mode: 'none' | 'question' | 'options' | 'solution' | 'tags' = 'none';
    let questionTextLines: string[] = [];
    let solutionTextLines: string[] = [];
    let pendingSort = '';

    for (const raw of paragraphs) {
      const p = raw.trim();

      const sortMatch = p.match(/^\[SORT\]\s*(.+)$/i);
      if (sortMatch) {
        pendingSort = sortMatch[1].trim();
        continue;
      }
      if (/^@QS$/i.test(p)) {
        if (current) {
          current.questionText = questionTextLines.join(' ').trim();
          // Content is already HTML/LaTeX as authored (e.g. <br />, $x$) — no markdown conversion.
          current.questionHtml = current.questionText;
          current.solutionHtml = solutionTextLines.join(' ').trim();
          questions.push(current);
        }
        const qtype = 'mcq_single';
        const ntaDef = NTA_DEFAULTS[qtype];
        current = {
          id: questions.length + 1,
          questionText: '',
          questionHtml: '',
          options: [],
          qtype,
          qtypeRaw: '',
          difficulty: 'medium',
          answer: '',
          positiveMarks: ntaDef.pos,
          negativeMarks: ntaDef.neg,
          hasPartialMarking: ntaDef.partial,
          numericMin: null,
          numericMax: null,
          sortid: pendingSort,
          solutionHtml: '',
          matrixLeft: [],
          matrixRight: [],
          partialMarkPerCorrect: null,
        };
        pendingSort = '';
        questionTextLines = [];
        solutionTextLines = [];
        mode = 'question';
        continue;
      }
      if (/^@QE$/i.test(p)) {
        mode = 'none';
        continue;
      }
      if (/^@OS$/i.test(p)) {
        mode = 'options';
        continue;
      }
      if (/^@OE$/i.test(p)) {
        mode = 'none';
        continue;
      }
      // Solution is optional — a question with no @SS/@SE block simply keeps
      // the default empty solutionHtml set when it was created.
      if (/^@SS$/i.test(p)) {
        solutionTextLines = [];
        mode = 'solution';
        continue;
      }
      if (/^@SE$/i.test(p)) {
        if (current) current.solutionHtml = solutionTextLines.join(' ').trim();
        mode = 'none';
        continue;
      }
      if (/^@TagS$/i.test(p)) {
        mode = 'tags';
        continue;
      }
      if (/^@TagE$/i.test(p)) {
        mode = 'none';
        continue;
      }
      if (!current) continue;

      if (mode === 'question') {
        questionTextLines.push(p);
        continue;
      }
      if (mode === 'solution') {
        solutionTextLines.push(p);
        continue;
      }
      if (mode === 'options') {
        // Matrix Match column content: "(A) L: Force" / "(P) R: Newton"
        const matrixColMatch = p.match(/^\(([A-Za-z0-9]+)\)\s*(L|R):\s*(.*)$/i);
        if (matrixColMatch) {
          const key = matrixColMatch[1].toUpperCase();
          const side = matrixColMatch[2].toUpperCase();
          const text = matrixColMatch[3].trim();
          if (side === 'L') current.matrixLeft.push(`${key}. ${text}`);
          else current.matrixRight.push(`${key}. ${text}`);
          continue;
        }
        const optionMatch = p.match(/^\(([A-Da-d])\)\s*(.*)$/);
        if (optionMatch) {
          const label = optionMatch[1].toUpperCase();
          const text = optionMatch[2].trim();
          current.options.push({ label, text, html: text });
        }
        continue;
      }
      if (mode === 'tags') {
        this.applyTagBlockMetadata(current, p);
        continue;
      }
    }
    if (current) {
      current.questionText = questionTextLines.join(' ').trim();
      current.questionHtml = current.questionText;
      current.solutionHtml = solutionTextLines.join(' ').trim();
      questions.push(current);
    }
    return questions;
  }

  // Parses one @TagS...@TagE line, e.g. "QT:SCO" or "CM:4, PM:1,WM:1,"
  private applyTagBlockMetadata(q: ParsedQuestion, line: string): void {
    const tokens = line
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    for (const token of tokens) {
      const idx = token.indexOf(':');
      if (idx === -1) continue;
      const key = token.slice(0, idx).trim().toUpperCase();
      const value = token.slice(idx + 1).trim();
      if (!value) continue;
      switch (key) {
        case 'QT': {
          q.qtypeRaw = value;
          q.qtype = TAG_FORMAT_QTYPE_MAP[value.toUpperCase()] || 'mcq_single';
          const ntaDef = NTA_DEFAULTS[q.qtype];
          if (ntaDef) {
            q.positiveMarks = ntaDef.pos;
            q.negativeMarks = ntaDef.neg;
            q.hasPartialMarking = ntaDef.partial;
          }
          break;
        }
        case 'CA':
          q.answer = value;
          break;
        case 'CM': {
          const n = parseFloat(value);
          if (!isNaN(n)) q.positiveMarks = n;
          break;
        }
        case 'WM': {
          const n = parseFloat(value);
          if (!isNaN(n)) q.negativeMarks = n;
          break;
        }
        case 'PM': {
          const n = parseFloat(value);
          if (!isNaN(n)) {
            q.partialMarkPerCorrect = n;
            q.hasPartialMarking = true;
          }
          break;
        }
      }
    }
  }

  getCorrectOptionLabels(q: ParsedQuestion): string {
    if (!q.answer) return '—';
    return (
      buildCorrectAnswer(
        q.qtype,
        q.answer,
        q.positiveMarks,
        q.matrixLeft?.length,
        q.partialMarkPerCorrect,
      ) || q.answer
    );
  }

  getQuestionTypeLabel(qtype: string): string {
    const map: Record<string, string> = {
      mcq_single: 'MCQ (Single)',
      mcq_multi: 'MCQ (Multiple)',
      integer: 'Integer',
      numeric: 'Numerical',
      true_false: 'True/False',
      subjective: 'Subjective',
      short_answer: 'Short Answer',
      passage_qns: 'Passage Based',
      matrix: 'Matrix',
    };
    return map[qtype] || qtype;
  }

  reset() {
    this.selectedFile = null;
    this.parsedQuestions = [];
    this.currentStep = 'upload';
    this.errorMessage = '';
    this.selectedTopicId = '';
    this.selectedSubTopicId = '';
  }

  async prepareFile(base64: string): Promise<File> {
    const compressed = await this.compressBase64Image(base64, 60);
    const arr = compressed.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], `img-${Date.now()}.jpg`, { type: mime });
  }

  base64SizeKB(base64: string): number {
    const s = base64.split(',')[1] || '';
    const p = (s.match(/=+$/) || [''])[0].length;
    return ((s.length * 3) / 4 - p) / 1024;
  }

  compressBase64Image(base64: string, maxSizeKB = 60): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width,
          height = img.height;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Canvas error');
          return;
        }
        let quality = 0.8,
          compressed = base64,
          attempts = 0;
        while (attempts < 15) {
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          compressed = canvas.toDataURL('image/jpeg', quality);
          if (this.base64SizeKB(compressed) <= maxSizeKB) {
            resolve(compressed);
            return;
          }
          if (quality > 0.3) quality -= 0.1;
          else {
            width *= 0.9;
            height *= 0.9;
          }
          attempts++;
        }
        resolve(compressed);
      };
      img.onerror = () => reject('Image load failed');
      img.src = base64;
    });
  }

  async uploadImage(base64: string): Promise<string | null> {
    try {
      const file = await this.prepareFile(base64);
      const formData = new FormData();
      formData.append('files', file);
      const res: any = await firstValueFrom(
        this.commonApi.uploadImage(formData, 'exam/questions', 'upload-image'),
      );
      return res?.status && res?.files?.length ? res.files[0].s3Url : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async replaceImagesWithUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;
    const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];
    let updatedHtml = html;
    for (const match of matches) {
      const url = await this.uploadImage(match[1]);
      if (url) updatedHtml = updatedHtml.replace(match[1], url);
    }
    return updatedHtml;
  }

  async buildBulkQuestionPayload(): Promise<any> {
    const questions = await Promise.all(
      this.parsedQuestions.map(async (q) => {
        const questionHtml = await this.replaceImagesWithUrls(q.questionHtml);
        const solutionHtml = q.solutionHtml
          ? await this.replaceImagesWithUrls(q.solutionHtml)
          : '';
        const correctAnswer = buildCorrectAnswer(
          q.qtype,
          q.answer,
          q.positiveMarks,
          q.matrixLeft?.length,
          q.partialMarkPerCorrect,
        );
        let processedOptions: any[] = [];
        if (
          ['mcq_single', 'mcq_multi', 'true_false', 'passage_qns'].includes(
            q.qtype,
          ) &&
          q.options.length
        ) {
          const correctKeys =
            q.qtype === 'mcq_multi'
              ? (q.answer || '')
                  .toUpperCase()
                  .split(/[,;\s]+/)
                  .filter(Boolean)
              : [(q.answer || '').toUpperCase().split(/[,;\s]/)[0]].filter(
                  Boolean,
                );
          processedOptions = await Promise.all(
            q.options.map(async (opt, idx) => {
              const textHtml = await this.replaceImagesWithUrls(opt.html);
              const key = opt.label.toUpperCase();
              const isCorrect = correctKeys.includes(key);
              const partialMark =
                q.qtype === 'mcq_multi' && isCorrect
                  ? (q.partialMarkPerCorrect ?? 1)
                  : 0;
              return { key, textHtml, isCorrect, partialMark };
            }),
          );
        }
        if (q.qtype === 'true_false' && processedOptions.length === 0) {
          const tfAnswer = correctAnswer;
          processedOptions = [
            {
              key: 'TRUE',
              textHtml: 'True',
              isCorrect: tfAnswer === 'true',
              partialMark: 0,
            },
            {
              key: 'FALSE',
              textHtml: 'False',
              isCorrect: tfAnswer === 'false',
              partialMark: 0,
            },
          ];
        }
        return {
          questionType: q.qtype,
          questionHtml,
          correctAnswer,
          difficulty: q.difficulty,
          positiveMarks: q.positiveMarks,
          negativeMarks: q.negativeMarks,
          hasPartialMarking: q.hasPartialMarking,
          numericMin: q.numericMin ?? null,
          numericMax: q.numericMax ?? null,
          questionOptions: processedOptions,
          leftColumn:
            q.matrixLeft?.map((text, i) => ({
              key: String.fromCharCode(65 + i),
              text: text.replace(/^[A-Za-z]\.\s*/, '').trim(),
            })) || [],
          rightColumn:
            q.matrixRight?.map((text, i) => ({
              key: String.fromCharCode(80 + i),
              text: text.replace(/^[A-Za-z]\.\s*/, '').trim(),
            })) || [],
          solutionHtml: solutionHtml || undefined,
          enableSolution: !!solutionHtml,
          sortOrder: q.sortid ? parseInt(q.sortid, 10) || q.id : q.id,
        };
      }),
    );

    return { questions };
  }

  async submitAllQuestions() {
    if (!this.isBankMode && !this.selectedSectionId) {
      this.alert.error('Please select a subject before submitting');
      return;
    }
    if (this.isBankMode && !this.selectedSubjectId) {
      this.alert.error('Please select a subject');
      return;
    }
    if (this.isBankMode && !this.selectedTopicId.trim()) {
      this.alert.error('Please enter a topic before submitting');
      return;
    }
    if (this.isBankMode && !this.selectedClassNo) {
      this.alert.error('Please select a class');
      return;
    }
    this.isProcessing = true;
    const payload = await this.buildBulkQuestionPayload();
    const entiId = this.tenantId;
    if (this.isBankMode) {
      payload.questions = payload.questions.map((q: any) => ({
        ...q,
        subjectId: this.selectedSubjectId || undefined,
        topicId: this.selectedTopicId.trim() || undefined,
        subTopicId: this.selectedSubTopicId.trim() || undefined,
        classNo: this.selectedClassNo || undefined,
      }));
      this.commonApi
        .fetchData({ entiId, ...payload }, 'exam/questions/bank', 'bulk-create')
        .subscribe({
          next: (res: any) => {
            this.isProcessing = false;
            if (res?.status) {
              this.alert.success(
                res.message || 'Questions imported successfully',
              );
              this.currentStep = 'success';
            } else {
              this.alert.error(res?.message || 'Error importing questions');
            }
          },
          error: (e: any) => {
            this.isProcessing = false;
            this.alert.error(e.error?.message || 'Import failed');
          },
        });
    } else {
      const selectedSection = this.sections.find(
        (s: any) => s.sectionId === this.selectedSectionId,
      );
      const subjectId =
        selectedSection?.subjectId?._id ||
        selectedSection?.subjectId ||
        undefined;
      payload.questions = payload.questions.map((q: any) => ({
        ...q,
        subjectId: subjectId || undefined,
      }));
      this.commonApi
        .fetchData(
          {
            entiId,
            examId: this.examId,
            sectionId: this.selectedSectionId,
            ...payload,
          },
          'exam/questions',
          'bulk-create',
        )
        .subscribe({
          next: (res: any) => {
            this.isProcessing = false;
            if (res?.status) {
              this.alert.success(
                res.message || 'Questions imported successfully',
              );
              this.currentStep = 'success';
            } else {
              this.alert.error(res?.message || 'Error importing questions');
            }
          },
          error: (e: any) => {
            this.isProcessing = false;
            this.alert.error(e.error?.message || 'Import failed');
          },
        });
    }
  }

  isCorrectOption(question: ParsedQuestion, optionLabel: string): boolean {
    const keys = (question.answer || '')
      .toUpperCase()
      .split(',')
      .concat((question.answer || '').toUpperCase().split(';'))
      .map((k) => k.trim())
      .filter(Boolean);
    const uniqueKeys = [...new Set(keys)];
    return uniqueKeys.includes(optionLabel.toUpperCase());
  }

  async downloadSample() {
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  </Types>`,
    );
    zip.file(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  </Relationships>`,
    );
    zip.file(
      'word/_rels/document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  </Relationships>`,
    );
    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
      <w:p><w:r><w:t>[SORT] 1</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Which of the following is a vector quantity?</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OS</w:t></w:r></w:p>
      <w:p><w:r><w:t>(A) Mass</w:t></w:r></w:p>
      <w:p><w:r><w:t>(B) Temperature</w:t></w:r></w:p>
      <w:p><w:r><w:t>(C) Velocity</w:t></w:r></w:p>
      <w:p><w:r><w:t>(D) Energy</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@SS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Velocity has both magnitude and direction, so it is a vector quantity.</w:t></w:r></w:p>
      <w:p><w:r><w:t>@SE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:SCO</w:t></w:r></w:p>
      <w:p><w:r><w:t>CA:C</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:4,WM:1,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>

      <w:p><w:r><w:t>[SORT] 2</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Which of the following are fundamental forces of nature?</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OS</w:t></w:r></w:p>
      <w:p><w:r><w:t>(A) Gravitational force</w:t></w:r></w:p>
      <w:p><w:r><w:t>(B) Frictional force</w:t></w:r></w:p>
      <w:p><w:r><w:t>(C) Electromagnetic force</w:t></w:r></w:p>
      <w:p><w:r><w:t>(D) Strong nuclear force</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:MCO</w:t></w:r></w:p>
      <w:p><w:r><w:t>CA:A,C,D</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:4, PM:1,WM:2,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>

      <w:p><w:r><w:t>[SORT] 3</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>The value of g at surface of Earth is approximately ___ m/s&#178;.</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:INT</w:t></w:r></w:p>
      <w:p><w:r><w:t>CA:10</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:4, WM:0,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>

      <w:p><w:r><w:t>[SORT] 4</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Calculate the resistance in ohms for V = 5V and I = 0.5A.</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:NUM</w:t></w:r></w:p>
      <w:p><w:r><w:t>CA:10</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:4, WM:0,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>

      <w:p><w:r><w:t>[SORT] 5</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Light travels faster in a denser medium.</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:TF</w:t></w:r></w:p>
      <w:p><w:r><w:t>CA:F</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:2, WM:1,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>

      <w:p><w:r><w:t>[SORT] 6</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Explain the principle of conservation of energy with an example.</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:SUB</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:4, WM:0,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>

      <w:p><w:r><w:t>[SORT] 7</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Read the passage and answer: which unit measures force?</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OS</w:t></w:r></w:p>
      <w:p><w:r><w:t>(A) Joule</w:t></w:r></w:p>
      <w:p><w:r><w:t>(B) Newton</w:t></w:r></w:p>
      <w:p><w:r><w:t>(C) Pascal</w:t></w:r></w:p>
      <w:p><w:r><w:t>(D) Watt</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:COM</w:t></w:r></w:p>
      <w:p><w:r><w:t>CA:B</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:4, WM:1,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>

      <w:p><w:r><w:t>[SORT] 8</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QS</w:t></w:r></w:p>
      <w:p><w:r><w:t>Match the following physical quantities with their SI units.</w:t></w:r></w:p>
      <w:p><w:r><w:t>@QE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OS</w:t></w:r></w:p>
      <w:p><w:r><w:t>(A) L: Force</w:t></w:r></w:p>
      <w:p><w:r><w:t>(B) L: Pressure</w:t></w:r></w:p>
      <w:p><w:r><w:t>(C) L: Energy</w:t></w:r></w:p>
      <w:p><w:r><w:t>(D) L: Power</w:t></w:r></w:p>
      <w:p><w:r><w:t>(P) R: Newton</w:t></w:r></w:p>
      <w:p><w:r><w:t>(Q) R: Pascal</w:t></w:r></w:p>
      <w:p><w:r><w:t>(R) R: Joule</w:t></w:r></w:p>
      <w:p><w:r><w:t>(S) R: Watt</w:t></w:r></w:p>
      <w:p><w:r><w:t>@OE</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagS</w:t></w:r></w:p>
      <w:p><w:r><w:t>QT:MTM</w:t></w:r></w:p>
      <w:p><w:r><w:t>CA:A:P,B:Q,C:R,D:S</w:t></w:r></w:p>
      <w:p><w:r><w:t>CM:8, PM:2,WM:0,</w:t></w:r></w:p>
      <w:p><w:r><w:t>@TagE</w:t></w:r></w:p>
    </w:body>
  </w:document>`,
    );

    try {
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_questions.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.alert.success('Sample DOCX downloaded successfully');
    } catch (e) {
      this.alert.error('Failed to generate sample: ' + (e as Error).message);
    }
  }
}
