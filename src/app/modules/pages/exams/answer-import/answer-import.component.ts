// import { Component, OnInit } from '@angular/core';
// import JSZip from 'jszip';
// import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
// import { AlertService } from '../../../../service/alert/alert.service';
// import { Router } from '@angular/router';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

// @Component({
//   selector: 'app-answer-import',
//   standalone: false,
//   templateUrl: './answer-import.component.html',
//   styleUrls: ['./answer-import.component.scss']
// })
// export class AnswerImportComponent implements OnInit {

//   examData: any = null;
//   tenantId = '';

//   selectedFile: File | null = null;
//   parsing = false;
//   submitting = false;

//   parsedAnswers: any[] = [];
//   existingQuestions: any[] = [];
//   fetchingQuestions = true;

//   constructor(
//     private commonApi: CommonapiService,
//     private alert: AlertService,
//     private router: Router,
//     private breadcrumb: BredcrumpService
//   ) {
//     const state: any = history.state;
//     if (state?.exam) {
//       this.examData = state.exam;
//     }
//     this.tenantId = localStorage.getItem('tenantId') || '';
//   }

//   ngOnInit(): void {
//     this.breadcrumb.set([
//       { label: 'Exams', link: '/app/exams/exams' },
//       { label: 'Import Answers' }
//     ]);

//     if (!this.examData || !this.examData.examId) {
//       this.alert.error('Exam context missing for answer import.');
//       this.router.navigate(['/app/exams/exams']);
//       return;
//     }

//     this.fetchExistingQuestions();
//   }

//   fetchExistingQuestions() {
//     this.fetchingQuestions = true;
//     const backendPayload = {
//       tenantId: this.tenantId,
//       entiId: this.tenantId,
//       examId: this.examData.examId || this.examData.testId || this.examData._id
//     };

//     this.commonApi.fetchData(backendPayload, 'exam/questions', 'getallquestions').subscribe({
//       next: (res: any) => {
//         this.fetchingQuestions = false;
//         if (res?.status) {
//           this.existingQuestions = res.data?.questions || [];
//           if (this.existingQuestions.length === 0) {
//             this.alert.error('Warning: This exam currently has no questions.');
//           }
//         } else {
//           this.alert.error('Failed to load existing questions.');
//         }
//       },
//       error: () => {
//         this.fetchingQuestions = false;
//         this.alert.error('Error fetching existing questions');
//       }
//     });
//   }

//   onFileSelected(event: any) {
//     const file = event.target.files[0];
//     if (file && file.name.endsWith('.docx')) {
//       this.selectedFile = file;
//       this.parsedAnswers = [];
//     } else {
//       this.alert.error('Please select a valid .docx file');
//       this.selectedFile = null;
//     }
//   }

//   removeFile() {
//     this.selectedFile = null;
//     this.parsedAnswers = [];
//   }

//   async parseDocx() {
//     if (!this.selectedFile) return;
//     if (this.existingQuestions.length === 0) {
//       this.alert.error('No existing questions loaded for this exam.');
//       return;
//     }

//     this.parsing = true;
//     try {
//       const zip = await JSZip.loadAsync(this.selectedFile);
//       const docXml = await zip.file('word/document.xml')?.async('string');
//       const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');

//       if (!docXml) throw new Error('Invalid DOCX format: word/document.xml missing');

//       const relsMap = this.parseRels(relsXml);
//       let htmlContent = await this.convertDocxToHtml(docXml, zip, relsMap);

//       this.extractAnswersFromHtml(htmlContent);
//     } catch (err) {
//       console.error(err);
//       this.alert.error('Failed to parse docx file. Ensure it is a valid Word document.');
//     } finally {
//       this.parsing = false;
//     }
//   }

//   parseRels(relsXml?: string): Map<string, string> {
//     const map = new Map<string, string>();
//     if (!relsXml) return map;
//     const regex = /<Relationship Id="([^"]+)" Type="[^"]+" Target="([^"]+)"/g;
//     let match;
//     while ((match = regex.exec(relsXml)) !== null) {
//       map.set(match[1], match[2]);
//     }
//     return map;
//   }

//   async convertDocxToHtml(docXml: string, zip: JSZip, relsMap: Map<string, string>): Promise<string> {
//     const parser = new DOMParser();
//     const doc = parser.parseFromString(docXml, 'text/xml');
//     const paragraphs = doc.getElementsByTagName('w:p');
//     let html = '';

//     for (let i = 0; i < paragraphs.length; i++) {
//       const p = paragraphs[i];
//       let pText = '';
//       const runs = p.getElementsByTagName('w:r');

//       for (let j = 0; j < runs.length; j++) {
//         const run = runs[j];

//         // Text
//         const tTags = run.getElementsByTagName('w:t');
//         if (tTags.length > 0) {
//           let text = Array.from(tTags).map(t => t.textContent).join('');
//           if (!text) continue;

//           const isBold = run.getElementsByTagName('w:b').length > 0;
//           const isItalic = run.getElementsByTagName('w:i').length > 0;
//           const isUnderline = run.getElementsByTagName('w:u').length > 0;

//           if (isBold) text = `<b>${text}</b>`;
//           if (isItalic) text = `<i>${text}</i>`;
//           if (isUnderline) text = `<u>${text}</u>`;
//           pText += text;
//         }

//         // Images
//         const drawings = run.getElementsByTagName('w:drawing');
//         if (drawings.length > 0) {
//           const blips = run.getElementsByTagName('a:blip');
//           if (blips.length > 0) {
//             const rId = blips[0].getAttribute('r:embed');
//             if (rId) {
//               const target = relsMap.get(rId);
//               if (target) {
//                 const imagePath = target.startsWith('word/') ? target : `word/${target}`;
//                 const fileData = await zip.file(imagePath)?.async('base64');
//                 if (fileData) {
//                   const ext = target.split('.').pop()?.toLowerCase();
//                   const mime = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'image/gif';
//                   pText += `<img src="data:${mime};base64,${fileData}" style="max-width: 100%; height: auto;" />`;
//                 }
//               }
//             }
//           }
//         }
//       }

//       if (pText.trim() === '') {
//         html += '<br/>';
//       } else {
//         html += `<p>${pText}</p>`;
//       }
//     }
//     return html;
//   }

//   extractAnswersFromHtml(html: string) {
//     const rawParagraphs = html.split('</p>').map(p => p.replace(/<p>/g, '').trim()).filter(p => !p.match(/^(<br\/>|\s*)$/));

//     const parsed: any[] = [];
//     let currentId: string | null = null;
//     let currentAns: string | null = null;
//     let currentSolHtml = '';

//     const pushCurrent = () => {
//       if (currentId && (currentAns || currentSolHtml)) {
//         parsed.push({ questionId: currentId, ansStr: currentAns, solutionHtml: currentSolHtml.trim() });
//       }
//     };

//     for (const text of rawParagraphs) {
//       const numRegex = /\[NUMBER\]\s*([0-9]+)/i;
//       const numMatch = text.match(numRegex);
//       if (numMatch) {
//         pushCurrent();
//         currentId = numMatch[1];
//         currentAns = null;
//         currentSolHtml = '';
//         continue;
//       }
//       const ansRegex = /\[ANS\]\s*([^<]+)/i;
//       const ansMatch = text.match(ansRegex);
//       if (ansMatch && currentId) {
//         currentAns = ansMatch[1].trim();
//         continue;
//       }
//       const solRegex = /\[SOL\](.*)/is;
//       const solMatch = text.match(solRegex);
//       if (solMatch && currentId) {
//         const solContent = solMatch[1].trim();
//         if (solContent) currentSolHtml += `<p>${solContent}</p>`;
//         continue;
//       }
//       if (currentId) {
//         currentSolHtml += `<p>${text}</p>`;
//       }
//     }
//     pushCurrent();
//     this.mapParsedToQuestions(parsed);
//   }

//   mapParsedToQuestions(parsedItems: any[]) {
//     this.parsedAnswers = [];

//     for (const item of parsedItems) {
//       const qIndex = parseInt(item.questionId, 10) - 1;
//       const matchQ = this.existingQuestions[qIndex];
//       if (!matchQ) {
//         item.error = `Question number ${item.questionId} exceeds existing questions in this exam.`;
//         this.parsedAnswers.push(item);
//         continue;
//       }
//       item.matchedQuestion = matchQ;
//       const qType = matchQ.questionType;
//       let opts: any[] = [];
//       if (['mcq_single', 'mcq_multi', 'mcq-single', 'mcq-multi'].includes(qType)) {
//         const keys = item.ansStr ? item.ansStr.split(',').map((k: string) => k.trim().toUpperCase()) : [];
//         const rawOpts = matchQ.questionOptions || [];
//         opts = rawOpts.map((o: any) => ({
//           key: o.key,
//           isCorrect: keys.includes(o.key?.toUpperCase()),
//           partialMark: o.partialMark || 0
//         }));
//       } else if (qType === 'true_false') {
//         const str = (item.ansStr || '').toUpperCase();
//         const rawOpts = matchQ.questionOptions || [];
//         opts = rawOpts.map((o: any) => ({
//           key: o.key,
//           isCorrect: o.key?.toUpperCase() === str,
//           partialMark: o.partialMark || 0
//         }));
//       } else if (['numeric', 'integer'].includes(qType)) {
//         item.correctAnswer = item.ansStr;
//       } else {
//         item.correctAnswer = item.ansStr;
//       }
//       if (opts.length > 0) {
//         item.questionOptions = opts;
//       }
//       this.parsedAnswers.push(item);
//     }
//     if (this.parsedAnswers.length === 0) {
//       this.alert.error('No valid mappings matching [NUMBER], [ANS], [SOL] found in file.');
//     }
//   }

//   submitAnswers() {
//     const validAnswers = this.parsedAnswers.filter(a => !a.error);
//     if (!validAnswers.length) return;
//     const payload = {
//       entiId: this.tenantId,
//       userId: localStorage.getItem('userId'),
//       examId: this.examData.examId,
//       questions: validAnswers.map(a => ({
//         questionId: a.matchedQuestion?.questionId,
//         correctAnswer: a.correctAnswer,
//         solutionHtml: a.solutionHtml,
//         questionOptions: a.questionOptions
//       }))
//     };
//     this.submitting = true;
//     this.commonApi.fetchData(payload, 'exam/questions', 'bulk-upload-answers').subscribe({
//       next: (res: any) => {
//         this.submitting = false;
//         if (res?.status) {
//           const dt = res.data || {};
//           if (dt.errors && dt.errors.length > 0) {
//             dt.errors.forEach((e: any) => {
//               const matchedA = this.parsedAnswers.find(v => v.matchedQuestion?.questionId === e.questionId);
//               if (matchedA) {
//                 matchedA.error = e.message;
//               }
//             });
//             this.alert.error(`Partial Success: ${dt.updatedCount} saved, ${dt.skippedCount} skipped. Please check the highlighted rows below.`);
//           } else {
//             this.alert.success(res.message || `${dt.updatedCount || validAnswers.length} answers imported successfully.`);
//             this.router.navigate(['/app/exams/exams/view'], { state: { exam: this.examData } });
//           }
//         } else {
//           this.alert.error(res?.message || 'Failed to import answers.');
//         }
//       },
//       error: (err: any) => {
//         this.submitting = false;
//         this.alert.error(err?.error?.message || 'Error occurred during import.');
//       }
//     });
//   }

//   goBack() {
//     this.router.navigate(['/app/exams/exams']);
//   }

//   async downloadSample() {
//     this.alert.success('Generating sample DOCX document...');
//     const zip = new JSZip();

//     // 1. [Content_Types].xml
//     const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
//   <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
//   <Default Extension="xml" ContentType="application/xml"/>
//   <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
// </Types>`;
//     zip.file('[Content_Types].xml', contentTypes);

//     // 2. _rels/.rels
//     const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
//   <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
// </Relationships>`;
//     zip.folder('_rels')?.file('.rels', rels);

//     // 3. word/document.xml
//     const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
//   <w:body>
//     <w:p><w:r><w:t>[NUMBER] 1</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[ANS] A</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
//     <w:p><w:r><w:t>Explanation: Since x = 5, Option A provides the only mathematical solution.</w:t></w:r></w:p>
//     <w:p><w:r><w:t></w:t></w:r></w:p>
//     <w:p><w:r><w:t>[NUMBER] 2</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[ANS] B, C</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
//     <w:p><w:r><w:t>For this multi-select question, both B and C encapsulate the correct conditions.</w:t></w:r></w:p>
//     <w:p><w:r><w:t></w:t></w:r></w:p>
//     <w:p><w:r><w:t>[NUMBER] 3</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[ANS] True</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
//     <w:p><w:r><w:t>This is a standard true/false question. The statement aligns with Newton's First Law.</w:t></w:r></w:p>
//     <w:p><w:r><w:t></w:t></w:r></w:p>
//     <w:p><w:r><w:t>[NUMBER] 4</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[ANS] 42.5</w:t></w:r></w:p>
//     <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
//     <w:p><w:r><w:t>Using the volume formula V = l * w * h, calculating 5 * 8.5 * 1 yields exactly 42.5.</w:t></w:r></w:p>
//   </w:body>
// </w:document>`;
//     zip.folder('word')?.file('document.xml', documentXml);

//     const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'sample_answers.docx';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     window.URL.revokeObjectURL(url);
//   }
// }

import { Component, OnInit } from '@angular/core';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-answer-import',
  standalone: false,
  templateUrl: './answer-import.component.html',
  styleUrls: ['./answer-import.component.scss'],
})
export class AnswerImportComponent implements OnInit {
  examData: any = null;
  tenantId = '';
  selectedFile: File | null = null;
  parsing = false;
  submitting = false;
  parsedAnswers: any[] = [];
  existingQuestions: any[] = [];
  fetchingQuestions = true;

  /* ── Manual entry mode ── */
  mode: 'docx' | 'excel' | 'manual' = 'docx';
  manualEntries: any[] = [];
  manualSubmitting = false;

  formatType(type: string): string {
    const map: Record<string, string> = {
      mcq_single: 'MCQ (Single)',
      mcq_multi: 'MCQ (Multiple)',
      'mcq-single': 'MCQ (Single)',
      'mcq-multi': 'MCQ (Multiple)',
      true_false: 'True / False',
      integer: 'Integer',
      numeric: 'Numerical',
      subjective: 'Subjective',
      matrix: 'Matrix Match',
      passage_qns: 'Passage Based',
    };
    return map[type] || type;
  }

  get dirtyCount(): number {
    return this.manualEntries.filter((e) => e.dirty).length;
  }

  constructor(
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
    private breadcrumb: BredcrumpService,
    private location: Location
  ) {
    const state: any = history.state;
    if (state?.exam) this.examData = state.exam;
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'View'},
      { label: 'Import Answers' },
    ]);

    if (!this.examData?.examId) {
      this.alert.error('Exam context missing for answer import.');
      this.router.navigate(['/app/exams/exams']);
      return;
    }

    this.fetchExistingQuestions();
  }

  // ── Load existing questions ────────────────────────────────────────────────
  fetchExistingQuestions() {
    this.fetchingQuestions = true;
    const payload = {
      tenantId: this.tenantId,
      entiId: this.tenantId,
      examId: this.examData.examId || this.examData.testId || this.examData._id,
    };

    this.commonApi
      .fetchData(payload, 'exam/questions', 'getallquestions')
      .subscribe({
        next: (res: any) => {
          this.fetchingQuestions = false;
          if (res?.status) {
            // ── FIX Gap 4: sort by sortOrder for stable index mapping ──────────
            this.existingQuestions = (res.data?.questions || []).sort(
              (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0),
            );
            if (!this.existingQuestions.length) {
              this.alert.error(
                'Warning: This exam currently has no questions.',
              );
            }
          } else {
            this.alert.error('Failed to load existing questions.');
          }
        },
        error: () => {
          this.fetchingQuestions = false;
          this.alert.error('Error fetching existing questions');
        },
      });
  }

  // ── File handling ──────────────────────────────────────────────────────────
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file?.name.endsWith('.docx')) {
      this.selectedFile = file;
      this.parsedAnswers = [];
    } else {
      this.alert.error('Please select a valid .docx file');
      this.selectedFile = null;
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.parsedAnswers = [];
  }

  // ── Parse DOCX ────────────────────────────────────────────────────────────
  async parseDocx() {
    if (!this.selectedFile) return;
    if (!this.existingQuestions.length) {
      this.alert.error('No existing questions loaded for this exam.');
      return;
    }

    this.parsing = true;
    try {
      const zip = await JSZip.loadAsync(this.selectedFile);
      const docXml = await zip.file('word/document.xml')?.async('string');
      const relsXml = await zip
        .file('word/_rels/document.xml.rels')
        ?.async('string');

      if (!docXml) throw new Error('Invalid DOCX: word/document.xml missing');

      const relsMap = this.parseRels(relsXml);
      const htmlContent = await this.convertDocxToHtml(docXml, zip, relsMap);
      this.extractAnswersFromHtml(htmlContent);
    } catch (err) {
      console.error(err);
      this.alert.error(
        'Failed to parse DOCX file. Ensure it is a valid Word document.',
      );
    } finally {
      this.parsing = false;
    }
  }

  parseRels(relsXml?: string): Map<string, string> {
    const map = new Map<string, string>();
    if (!relsXml) return map;
    const regex = /<Relationship Id="([^"]+)" Type="[^"]+" Target="([^"]+)"/g;
    let match;
    while ((match = regex.exec(relsXml)) !== null) map.set(match[1], match[2]);
    return map;
  }

  async convertDocxToHtml(
    docXml: string,
    zip: JSZip,
    relsMap: Map<string, string>,
  ): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(docXml, 'text/xml');
    const paragraphs = doc.getElementsByTagName('w:p');
    let html = '';

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      let pText = '';
      const runs = p.getElementsByTagName('w:r');

      for (let j = 0; j < runs.length; j++) {
        const run = runs[j];
        const tTags = run.getElementsByTagName('w:t');

        if (tTags.length > 0) {
          let text = Array.from(tTags)
            .map((t) => t.textContent)
            .join('');
          if (!text) continue;
          if (run.getElementsByTagName('w:b').length > 0)
            text = `<b>${text}</b>`;
          if (run.getElementsByTagName('w:i').length > 0)
            text = `<i>${text}</i>`;
          if (run.getElementsByTagName('w:u').length > 0)
            text = `<u>${text}</u>`;
          pText += text;
        }

        // Images
        const drawings = run.getElementsByTagName('w:drawing');
        if (drawings.length > 0) {
          const blips = run.getElementsByTagName('a:blip');
          if (blips.length > 0) {
            const rId = blips[0].getAttribute('r:embed');
            const target = rId ? relsMap.get(rId) : null;
            if (target) {
              const imagePath = target.startsWith('word/')
                ? target
                : `word/${target}`;
              const fileData = await zip.file(imagePath)?.async('base64');
              if (fileData) {
                const ext = target.split('.').pop()?.toLowerCase();
                const mime =
                  ext === 'png'
                    ? 'image/png'
                    : ext === 'jpeg' || ext === 'jpg'
                      ? 'image/jpeg'
                      : 'image/gif';
                pText += `<img src="data:${mime};base64,${fileData}" style="max-width:100%;height:auto;" />`;
              }
            }
          }
        }
      }

      html += pText.trim() === '' ? '<br/>' : `<p>${pText}</p>`;
    }
    return html;
  }

  // ── Extract answers from parsed HTML ──────────────────────────────────────
  extractAnswersFromHtml(html: string) {
    const rawParagraphs = html
      .split('</p>')
      .map((p) => p.replace(/<p>/g, '').trim())
      .filter((p) => !p.match(/^(<br\/>|\s*)$/));

    const parsed: any[] = [];
    let currentId: string | null = null;
    let currentAns: string | null = null;
    let currentSolHtml = '';

    const pushCurrent = () => {
      if (currentId && (currentAns || currentSolHtml)) {
        parsed.push({
          questionId: currentId,
          ansStr: currentAns,
          solutionHtml: currentSolHtml.trim(),
        });
      }
    };

    for (const text of rawParagraphs) {
      const numMatch = text.match(/\[NUMBER\]\s*([0-9]+)/i);
      if (numMatch) {
        pushCurrent();
        currentId = numMatch[1];
        currentAns = null;
        currentSolHtml = '';
        continue;
      }

      const ansMatch = text.match(/\[ANS\]\s*([^<]+)/i);
      if (ansMatch && currentId) {
        currentAns = ansMatch[1].trim();
        continue;
      }

      const solMatch = text.match(/\[SOL\](.*)/is);
      if (solMatch && currentId) {
        const content = solMatch[1].trim();
        if (content) currentSolHtml += `<p>${content}</p>`;
        continue;
      }

      if (currentId) currentSolHtml += `<p>${text}</p>`;
    }
    pushCurrent();

    this.mapParsedToQuestions(parsed);
  }

  // ── Map parsed items to exam questions ────────────────────────────────────
  mapParsedToQuestions(parsedItems: any[]) {
    this.parsedAnswers = [];

    for (const item of parsedItems) {
      // ── FIX Gap 4: use sortOrder-sorted list for stable index mapping ──────
      const qIndex = parseInt(item.questionId, 10) - 1;
      const matchQ = this.existingQuestions[qIndex];

      if (!matchQ) {
        item.error = `Question number ${item.questionId} exceeds existing questions in this exam.`;
        this.parsedAnswers.push(item);
        continue;
      }

      item.matchedQuestion = matchQ;
      const qType = matchQ.questionType;
      let opts: any[] = [];

      if (
        ['mcq_single', 'mcq_multi', 'mcq-single', 'mcq-multi'].includes(qType)
      ) {
        const keys = item.ansStr
          ? item.ansStr.split(',').map((k: string) => k.trim().toUpperCase())
          : [];
        const rawOpts = matchQ.questionOptions || [];
        opts = rawOpts.map((o: any) => ({
          key: o.key,
          isCorrect: keys.includes((o.key || '').toUpperCase()),
          partialMark: o.partialMark || 0,
        }));
      } else if (qType === 'true_false') {
        const str = (item.ansStr || '').toUpperCase();
        const rawOpts = matchQ.questionOptions || [];
        opts = rawOpts.map((o: any) => ({
          key: o.key,
          isCorrect: (o.key || '').toUpperCase() === str,
          partialMark: o.partialMark || 0,
        }));
      } else if (['numeric', 'integer'].includes(qType)) {
        item.correctAnswer = item.ansStr;
      } else {
        item.correctAnswer = item.ansStr;
      }

      if (opts.length) item.questionOptions = opts;

      this.parsedAnswers.push(item);
    }

    if (!this.parsedAnswers.length) {
      this.alert.error(
        'No valid mappings found. Ensure [NUMBER], [ANS], [SOL] tags are present.',
      );
    }
  }

  // ── Image upload helpers (FIX Gap 3) ──────────────────────────────────────
  private async prepareFile(base64: string): Promise<File> {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], `img-${Date.now()}.jpg`, { type: mime });
  }

  private async uploadImage(base64: string): Promise<string | null> {
    try {
      const file = await this.prepareFile(base64);
      const formData = new FormData();
      formData.append('files', file);
      const res: any = await firstValueFrom(
        this.commonApi.uploadImage(formData, 'exam/questions', 'upload-image'),
      );
      return res?.status && res?.files?.length ? res.files[0].s3Url : null;
    } catch {
      return null;
    }
  }

  private async replaceImagesWithUrls(html: string): Promise<string> {
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

  // ── Submit answers ─────────────────────────────────────────────────────────
  // ── FIX Gap 3: async — uploads solution images before sending ─────────────
  async submitAnswers() {
    const validAnswers = this.parsedAnswers.filter((a) => !a.error);
    if (!validAnswers.length) return;

    this.submitting = true;

    try {
      // Upload any base64 images in solutionHtml to S3 first
      const questions = await Promise.all(
        validAnswers.map(async (a) => ({
          questionId: a.matchedQuestion?.questionId,
          correctAnswer: a.correctAnswer,
          solutionHtml: a.solutionHtml
            ? await this.replaceImagesWithUrls(a.solutionHtml)
            : undefined,
          questionOptions: a.questionOptions,
        })),
      );

      const payload = {
        entiId: this.tenantId,
        userId: localStorage.getItem('userId'),
        examId: this.examData.examId,
        questions,
      };

      this.commonApi
        .fetchData(payload, 'exam/questions', 'bulk-upload-answers')
        .subscribe({
          next: (res: any) => {
            this.submitting = false;
            if (res?.status) {
              const dt = res.data || {};
              if (dt.errors?.length) {
                dt.errors.forEach((e: any) => {
                  const row = this.parsedAnswers.find(
                    (v) => v.matchedQuestion?.questionId === e.questionId,
                  );
                  if (row) row.error = e.message;
                });
                this.alert.error(
                  `Partial success: ${dt.updatedCount} saved, ${dt.skippedCount} skipped. Check highlighted rows.`,
                );
              } else {
                this.alert.success(
                  res.message ||
                    `${dt.updatedCount || validAnswers.length} answers imported successfully.`,
                );
                this.router.navigate(['/app/exams/exams/view'], {
                  state: { exam: this.examData },
                });
              }
            } else {
              this.alert.error(res?.message || 'Failed to import answers.');
            }
          },
          error: (err: any) => {
            this.submitting = false;
            this.alert.error(
              err?.error?.message || 'Error occurred during import.',
            );
          },
        });
    } catch (err) {
      this.submitting = false;
      this.alert.error('Error uploading solution images. Please try again.');
    }
  }

  /* ── Excel state ── */
  excelFile: File | null = null;
  excelParsing = false;

  onExcelSelected(event: any) {
    const file = event.target.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      this.excelFile = file;
      this.parsedAnswers = [];
    } else {
      this.alert.error('Please select a valid .xlsx or .xls file');
      this.excelFile = null;
    }
  }

  removeExcelFile() {
    this.excelFile = null;
    this.parsedAnswers = [];
  }

  async parseExcel() {
    if (!this.excelFile) return;
    if (!this.existingQuestions.length) {
      this.alert.error('No existing questions loaded for this exam.');
      return;
    }

    this.excelParsing = true;
    try {
      const buffer = await this.excelFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const parsed: any[] = rows
        .filter((r: any) => r['Question No'] || r['question_no'] || r['QuestionNo'])
        .map((r: any) => ({
          questionId: String(r['Question No'] ?? r['question_no'] ?? r['QuestionNo'] ?? '').trim(),
          ansStr: String(r['Answer'] ?? r['answer'] ?? r['ANS'] ?? '').trim(),
          solutionHtml: String(r['Solution'] ?? r['solution'] ?? r['SOL'] ?? '').trim(),
        }));

      if (!parsed.length) {
        this.alert.error('No data rows found. Ensure columns: Question No, Answer, Solution');
        this.excelParsing = false;
        return;
      }

      this.mapParsedToQuestions(parsed);
    } catch (err) {
      console.error(err);
      this.alert.error('Failed to parse Excel file.');
    }
    this.excelParsing = false;
  }

  async downloadExcelSample() {
    const data = [
      { 'Question No': 1, 'Answer': 'A', 'Solution': 'Option A is correct because...' },
      { 'Question No': 2, 'Answer': 'B, C', 'Solution': 'Both B and C satisfy the condition.' },
      { 'Question No': 3, 'Answer': 'true', 'Solution': 'This aligns with Newton\'s First Law.' },
      { 'Question No': 4, 'Answer': '42.5', 'Solution': 'V = l * w * h = 5 * 8.5 * 1 = 42.5' },
      { 'Question No': 5, 'Answer': 'A:PQ;B:R', 'Solution': 'A matches P and Q, B matches R.' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Answers');
    XLSX.writeFile(wb, 'sample_answers.xlsx');
  }

  switchMode(m: 'docx' | 'excel' | 'manual') {
    this.mode = m;
    this.parsedAnswers = [];
    if (m === 'manual' && !this.manualEntries.length && this.existingQuestions.length) {
      this.buildManualEntries();
    }
  }

  buildManualEntries() {
    this.manualEntries = this.existingQuestions.map((q: any) => {
      const entry: any = { question: q, dirty: false };
      const type = q.questionType;
      if (['mcq_single', 'mcq_multi', 'mcq-single', 'mcq-multi'].includes(type)) {
        entry.options = (q.questionOptions || []).map((o: any) => ({
          ...o,
          isCorrect: o.isCorrect || false,
        }));
      } else if (type === 'true_false') {
        entry.correctAnswer = q.correctAnswer || '';
      } else if (type === 'matrix') {
        entry.correctAnswer = q.correctAnswer || '';
      } else {
        entry.correctAnswer = q.correctAnswer || '';
      }
      return entry;
    });
  }

  toggleMcqOption(entry: any, optIndex: number) {
    const type = entry.question.questionType;
    if (type === 'mcq_single' || type === 'mcq-single') {
      entry.options.forEach((o: any, i: number) => (o.isCorrect = i === optIndex));
    } else {
      entry.options[optIndex].isCorrect = !entry.options[optIndex].isCorrect;
    }
    entry.dirty = true;
  }

  setTfAnswer(entry: any, val: string) {
    entry.correctAnswer = val;
    entry.dirty = true;
  }

  onAnswerInput(entry: any) {
    entry.dirty = true;
  }

  async submitManual() {
    const toSubmit = this.manualEntries.filter((e) => e.dirty);
    if (!toSubmit.length) {
      this.alert.error('No answers have been entered.');
      return;
    }

    this.manualSubmitting = true;
    try {
      const questions = await Promise.all(
        toSubmit.map(async (e) => {
          const q = e.question;
          const type = q.questionType;
          const item: any = { questionId: q.questionId };

          if (['mcq_single', 'mcq_multi', 'mcq-single', 'mcq-multi'].includes(type)) {
            item.questionOptions = e.options.map((o: any) => ({
              key: o.key,
              isCorrect: o.isCorrect,
              partialMark: o.partialMark || 0,
            }));
            item.correctAnswer = e.options
              .filter((o: any) => o.isCorrect)
              .map((o: any) => o.key)
              .join(',');
          } else if (type === 'true_false') {
            item.correctAnswer = e.correctAnswer;
          } else {
            item.correctAnswer = e.correctAnswer;
          }

          if (e.solutionHtml) {
            item.solutionHtml = await this.replaceImagesWithUrls(e.solutionHtml);
          }

          return item;
        }),
      );

      const payload = {
        entiId: this.tenantId,
        userId: localStorage.getItem('userId'),
        examId: this.examData.examId,
        questions,
      };

      this.commonApi.fetchData(payload, 'exam/questions', 'bulk-upload-answers').subscribe({
        next: (res: any) => {
          this.manualSubmitting = false;
          if (res?.status) {
            const dt = res.data || {};
            this.alert.success(
              res.message || `${dt.updatedCount || toSubmit.length} answers saved successfully.`,
            );
            this.router.navigate(['/app/exams/exams/view'], { state: { exam: this.examData } });
          } else {
            this.alert.error(res?.message || 'Failed to save answers.');
          }
        },
        error: (err: any) => {
          this.manualSubmitting = false;
          this.alert.error(err?.error?.message || 'Error saving answers.');
        },
      });
    } catch {
      this.manualSubmitting = false;
      this.alert.error('Error preparing answers. Please try again.');
    }
  }

 goBack() {
    this.location.back();
  }


  // ── Download sample DOCX ──────────────────────────────────────────────────
  async downloadSample() {
    this.alert.success('Generating sample DOCX document...');
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

    zip.folder('_rels')?.file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    );

    zip.folder('word')?.file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>[NUMBER] 1</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] A</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Explanation: Since x = 5, Option A is correct.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>[NUMBER] 2</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] B, C</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>For this multi-select question, both B and C are correct.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>[NUMBER] 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] True</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>This aligns with Newton's First Law.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>[NUMBER] 4</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] 42.5</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Using V = l * w * h = 5 * 8.5 * 1 = 42.5</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    );

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_answers.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
  
}
