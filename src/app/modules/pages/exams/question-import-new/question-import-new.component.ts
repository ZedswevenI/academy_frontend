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
}

const NTA_DEFAULTS: Record<
  string,
  { pos: number; neg: number; partial: boolean }
> = {
  mcq_single: { pos: 4, neg: 1, partial: false },
  mcq_multi: { pos: 4, neg: 2, partial: true },
  integer: { pos: 4, neg: 0, partial: false },
  numeric: { pos: 4, neg: 0, partial: false },
  true_false: { pos: 2, neg: 1, partial: false },
  subjective: { pos: 4, neg: 0, partial: false },
  short_answer: { pos: 4, neg: 0, partial: false },
  passage_qns: { pos: 4, neg: 1, partial: false },
  matrix: { pos: 8, neg: 0, partial: true },
};

function normalizeQtype(raw: string): string {
  const v = (raw || '').trim().toLowerCase().replace(/[-\s]/g, '_');
  if (['mcq_single', 'mcq', 'single', 'mcq_s'].includes(v)) return 'mcq_single';
  if (['mcq_multi', 'mcq_multiple', 'multiple', 'multi'].includes(v))
    return 'mcq_multi';
  if (['integer', 'int'].includes(v)) return 'integer';
  if (['numeric', 'numerical', 'num'].includes(v)) return 'numeric';
  if (['true_false', 'true/false', 'tf', 'truefalse', 'boolean'].includes(v))
    return 'true_false';
  if (
    [
      'subjective',
      'subj',
      'long_answer',
      'long',
      'text_based',
      'text',
    ].includes(v)
  )
    return 'subjective';
  if (['short_answer', 'short', 'fill'].includes(v)) return 'short_answer';
  if (['passage_qns', 'passage', 'text_based'].includes(v))
    return 'passage_qns';
  if (['matrix', 'match', 'matrix_match'].includes(v)) return 'matrix';
  return 'mcq_single';
}

function buildCorrectAnswer(
  qtype: string,
  rawAnswer: string,
  positiveMarks?: number,
  leftCount?: number,
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
        leftCount && leftCount > 0
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
          'No questions found. Ensure [Q] tag is used to mark each question.';
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

    const questions: ParsedQuestion[] = [];
    let current: ParsedQuestion | null = null;
    let questionTextLines: string[] = [];
    let inSolution = false;
    let solutionLines: string[] = [];
    const saveCurrentQuestion = () => {
      if (!current) return;
      if (questionTextLines.length > 0) {
        current.questionText = questionTextLines.join(' ').trim();
        current.questionHtml = this.convertToHtml(current.questionText);
      }
      if (solutionLines.length > 0) {
        current.solutionHtml = solutionLines
          .map((l) => this.convertToHtml(l))
          .join('');
      }
      questions.push(current);
    };
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (p.startsWith('[Q]')) {
        saveCurrentQuestion();
        const qtypeRaw = 'mcq_single';
        const qtype = 'mcq_single';
        const ntaDef = NTA_DEFAULTS[qtype];
        current = {
          id: questions.length + 1,
          questionText: '',
          questionHtml: '',
          options: [],
          qtype,
          qtypeRaw,
          difficulty: 'medium',
          answer: '',
          positiveMarks: ntaDef.pos,
          negativeMarks: ntaDef.neg,
          hasPartialMarking: ntaDef.partial,
          numericMin: null,
          numericMax: null,
          sortid: '',
          solutionHtml: '',
          matrixLeft: [],
          matrixRight: [],
        };
        questionTextLines = [];
        solutionLines = [];
        inSolution = false;
        const qText = p.replace('[Q]', '').trim();
        if (qText) questionTextLines.push(qText);
        continue;
      }

      if (!current) continue;
      if (p.startsWith('[qtype]')) {
        const rawType = p.replace('[qtype]', '').trim();
        current.qtypeRaw = rawType;
        current.qtype = normalizeQtype(rawType);
        const ntaDef = NTA_DEFAULTS[current.qtype];
        if (ntaDef) {
          current.positiveMarks = ntaDef.pos;
          current.negativeMarks = ntaDef.neg;
          current.hasPartialMarking = ntaDef.partial;
        }
        inSolution = false;
        continue;
      }
      if (p.startsWith('[DIFFICULTY]')) {
        current.difficulty = p.replace('[DIFFICULTY]', '').trim().toLowerCase();
        inSolution = false;
        continue;
      }
      if (p.startsWith('[ans]')) {
        current.answer = p.replace('[ans]', '').trim();
        inSolution = false;
        continue;
      }
      if (p.startsWith('[Marks]')) {
        const marksStr = p.replace('[Marks]', '').trim();
        const parts = marksStr.split(',').map((s) => parseFloat(s.trim()));
        if (parts.length >= 1 && !isNaN(parts[0]))
          current.positiveMarks = parts[0];
        if (parts.length >= 2 && !isNaN(parts[1]))
          current.negativeMarks = parts[1];
        inSolution = false;
        continue;
      }
      if (p.startsWith('[numericMin]')) {
        current.numericMin =
          parseFloat(p.replace('[numericMin]', '').trim()) || null;
        inSolution = false;
        continue;
      }
      if (p.startsWith('[numericMax]')) {
        current.numericMax =
          parseFloat(p.replace('[numericMax]', '').trim()) || null;
        inSolution = false;
        continue;
      }
      if (p.startsWith('[sortid]')) {
        current.sortid = p.replace('[sortid]', '').trim();
        inSolution = false;
        continue;
      }
      if (p.startsWith('[soln]')) {
        inSolution = true;
        const solText = p.replace('[soln]', '').trim();
        if (solText) solutionLines.push(`<p>${solText}</p>`);
        continue;
      }
      if (p.startsWith('[matrixLeft]')) {
        const text = p.replace('[matrixLeft]', '').trim();
        if (!current.matrixLeft) current.matrixLeft = [];
        current.matrixLeft.push(text);
        inSolution = false;
        continue;
      }
      if (p.startsWith('[matrixRight]')) {
        const text = p.replace('[matrixRight]', '').trim();
        if (!current.matrixRight) current.matrixRight = [];
        current.matrixRight.push(text);
        inSolution = false;
        continue;
      }
      if (inSolution) {
        solutionLines.push(`<p>${p}</p>`);
        continue;
      }
      const inlineOptions = this.extractInlineOptions(p);
      if (inlineOptions.length >= 2) {
        inlineOptions.forEach((opt) => {
          current!.options.push({
            label: opt.label.toUpperCase(),
            text: opt.text,
            html: this.convertToHtml(opt.text),
          });
        });
        continue;
      }
      const singleOptionMatch = p.match(/^\(([A-Da-d])\)\s*/);
      if (singleOptionMatch) {
        const label = singleOptionMatch[1].toUpperCase();
        const text = p.replace(/^\([A-Da-d]\)\s*/, '').trim();
        current.options.push({ label, text, html: this.convertToHtml(text) });
        continue;
      }
      if (/^\d+\.\s*$/.test(p)) continue;
      if (
        p.includes('[PHYSICS]') ||
        p.includes('[CHEMISTRY]') ||
        p.includes('[MATHS]')
      )
        continue;
      questionTextLines.push(p);
    }
    saveCurrentQuestion();
    return questions;
  }

  private extractInlineOptions(
    text: string,
  ): Array<{ label: string; text: string }> {
    const regex = /\(([A-Da-d])\)/g;
    const matches = [...text.matchAll(regex)];
    if (matches.length < 2) return [];

    const options: Array<{ label: string; text: string }> = [];
    for (let i = 0; i < matches.length; i++) {
      const label = matches[i][1];
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
      options.push({ label, text: text.substring(start, end).trim() });
    }
    return options;
  }

  private convertToHtml(text: string): string {
    let html = text;
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(
      /\$\$(.+?)\$\$/g,
      '<span class="latex-formula">$$$1$$</span>',
    );
    html = html.replace(
      /\$([^$]+?)\$/g,
      '<span class="latex-formula">$$1$</span>',
    );
    return html;
  }


  getCorrectOptionLabels(q: ParsedQuestion): string {
    if (!q.answer) return '—';
    return (
      buildCorrectAnswer(
        q.qtype,
        q.answer,
        q.positiveMarks,
        q.matrixLeft?.length,
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
              const partialMark = q.qtype === 'mcq_multi' && isCorrect ? 1 : 0;
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
          sortOrder: q.id,
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
      <w:p><w:r><w:t>[Q] Which of the following is a vector quantity?</w:t></w:r></w:p>
      <w:p><w:r><w:t>[qtype] mcq_single</w:t></w:r></w:p>
      <w:p><w:r><w:t>[DIFFICULTY] medium</w:t></w:r></w:p>
      <w:p><w:r><w:t>(A) Mass</w:t></w:r></w:p>
      <w:p><w:r><w:t>(B) Temperature</w:t></w:r></w:p>
      <w:p><w:r><w:t>(C) Velocity</w:t></w:r></w:p>
      <w:p><w:r><w:t>(D) Energy</w:t></w:r></w:p>
      <w:p><w:r><w:t>[ans] C</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Marks] 4,1</w:t></w:r></w:p>
      <w:p><w:r><w:t>[soln] Velocity has both magnitude and direction making it a vector quantity.</w:t></w:r></w:p>

      <w:p><w:r><w:t>[Q] Which of the following are fundamental forces of nature?</w:t></w:r></w:p>
      <w:p><w:r><w:t>[qtype] mcq_multi</w:t></w:r></w:p>
      <w:p><w:r><w:t>[DIFFICULTY] hard</w:t></w:r></w:p>
      <w:p><w:r><w:t>(A) Gravitational force</w:t></w:r></w:p>
      <w:p><w:r><w:t>(B) Frictional force</w:t></w:r></w:p>
      <w:p><w:r><w:t>(C) Electromagnetic force</w:t></w:r></w:p>
      <w:p><w:r><w:t>(D) Strong nuclear force</w:t></w:r></w:p>
      <w:p><w:r><w:t>[ans] A,C,D</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Marks] 4,2</w:t></w:r></w:p>
      <w:p><w:r><w:t>[soln] Gravitational, electromagnetic and strong nuclear are fundamental forces.</w:t></w:r></w:p>

      <w:p><w:r><w:t>[Q] The value of g at surface of Earth is approximately</w:t></w:r></w:p>
      <w:p><w:r><w:t>[qtype] integer</w:t></w:r></w:p>
      <w:p><w:r><w:t>[DIFFICULTY] easy</w:t></w:r></w:p>
      <w:p><w:r><w:t>[ans] 10</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Marks] 4,0</w:t></w:r></w:p>
      <w:p><w:r><w:t>[soln] g = 9.8 m/s squared, approximately 10 m/s squared.</w:t></w:r></w:p>

      <w:p><w:r><w:t>[Q] Calculate resistance in ohms for V=5V and I=0.5A</w:t></w:r></w:p>
      <w:p><w:r><w:t>[qtype] numeric</w:t></w:r></w:p>
      <w:p><w:r><w:t>[DIFFICULTY] medium</w:t></w:r></w:p>
      <w:p><w:r><w:t>[ans] 10</w:t></w:r></w:p>
      <w:p><w:r><w:t>[numericMin] 9.5</w:t></w:r></w:p>
      <w:p><w:r><w:t>[numericMax] 10.5</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Marks] 4,0</w:t></w:r></w:p>
      <w:p><w:r><w:t>[soln] R = V divided by I = 5 divided by 0.5 = 10 ohms.</w:t></w:r></w:p>

      <w:p><w:r><w:t>[Q] Light travels faster in denser medium.</w:t></w:r></w:p>
      <w:p><w:r><w:t>[qtype] true_false</w:t></w:r></w:p>
      <w:p><w:r><w:t>[DIFFICULTY] easy</w:t></w:r></w:p>
      <w:p><w:r><w:t>[ans] false</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Marks] 2,1</w:t></w:r></w:p>
      <w:p><w:r><w:t>[soln] Light travels slower in denser medium.</w:t></w:r></w:p>

      <w:p><w:r><w:t>[Q] Explain the principle of conservation of energy with an example.</w:t></w:r></w:p>
      <w:p><w:r><w:t>[qtype] subjective</w:t></w:r></w:p>
      <w:p><w:r><w:t>[DIFFICULTY] hard</w:t></w:r></w:p>
      <w:p><w:r><w:t>[ans] Energy cannot be created or destroyed only converted from one form to another.</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Marks] 4,0</w:t></w:r></w:p>
      <w:p><w:r><w:t>[soln] When a ball is thrown upward kinetic energy converts to potential energy and back.</w:t></w:r></w:p>

      <w:p><w:r><w:t>[Q] The SI unit of force is</w:t></w:r></w:p>
      <w:p><w:r><w:t>[qtype] text_based</w:t></w:r></w:p>
      <w:p><w:r><w:t>[DIFFICULTY] easy</w:t></w:r></w:p>
      <w:p><w:r><w:t>[ans] Newton</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Marks] 4,0</w:t></w:r></w:p>
      <w:p><w:r><w:t>[soln] The SI unit of force is Newton named after Isaac Newton.</w:t></w:r></w:p>

      <w:p><w:r><w:t>[Q] Match the following physical quantities with their SI units.</w:t></w:r></w:p>
    <w:p><w:r><w:t>[qtype] matrix</w:t></w:r></w:p>
    <w:p><w:r><w:t>[DIFFICULTY] medium</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixLeft] A. Force</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixLeft] B. Pressure</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixLeft] C. Energy</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixLeft] D. Power</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixRight] P. Newton</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixRight] Q. Pascal</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixRight] R. Joule</w:t></w:r></w:p>
    <w:p><w:r><w:t>[matrixRight] S. Watt</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ans] A:P,B:Q,C:R,D:S</w:t></w:r></w:p>
    <w:p><w:r><w:t>[Marks] 8,0</w:t></w:r></w:p>
    <w:p><w:r><w:t>[soln] Force-Newton, Pressure-Pascal, Energy-Joule, Power-Watt.</w:t></w:r></w:p>
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
