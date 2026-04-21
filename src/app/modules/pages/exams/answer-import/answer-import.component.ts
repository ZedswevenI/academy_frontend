import { Component, OnInit } from '@angular/core';

import JSZip from 'jszip';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-answer-import',
  standalone: false,
  templateUrl: './answer-import.component.html',
  styleUrls: ['./answer-import.component.scss']
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

  constructor(
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
    private breadcrumb: BredcrumpService
  ) {
    const state: any = history.state;
    if (state?.exam) {
      this.examData = state.exam;
    }
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'Import Answers' }
    ]);

    if (!this.examData || !this.examData.examId) {
      this.alert.error('Exam context missing for answer import.');
      this.router.navigate(['/app/exams/exams']);
      return;
    }

    this.fetchExistingQuestions();
  }

  fetchExistingQuestions() {
    this.fetchingQuestions = true;
    const backendPayload = {
      tenantId: this.tenantId,
      entiId: this.tenantId,
      examId: this.examData.examId || this.examData.testId || this.examData._id
    };

    this.commonApi.fetchData(backendPayload, 'exam/questions', 'getallquestions').subscribe({
      next: (res: any) => {
        this.fetchingQuestions = false;
        if (res?.status) {
          this.existingQuestions = res.data?.questions || [];
          if (this.existingQuestions.length === 0) {
            this.alert.error('Warning: This exam currently has no questions.');
          }
        } else {
          this.alert.error('Failed to load existing questions.');
        }
      },
      error: () => {
        this.fetchingQuestions = false;
        this.alert.error('Error fetching existing questions');
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.docx')) {
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

  async parseDocx() {
    if (!this.selectedFile) return;
    if (this.existingQuestions.length === 0) {
      this.alert.error('No existing questions loaded for this exam.');
      return;
    }

    this.parsing = true;
    try {
      const zip = await JSZip.loadAsync(this.selectedFile);
      const docXml = await zip.file('word/document.xml')?.async('string');
      const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');

      if (!docXml) throw new Error('Invalid DOCX format: word/document.xml missing');

      const relsMap = this.parseRels(relsXml);
      let htmlContent = await this.convertDocxToHtml(docXml, zip, relsMap);

      this.extractAnswersFromHtml(htmlContent);
    } catch (err) {
      console.error(err);
      this.alert.error('Failed to parse docx file. Ensure it is a valid Word document.');
    } finally {
      this.parsing = false;
    }
  }

  parseRels(relsXml?: string): Map<string, string> {
    const map = new Map<string, string>();
    if (!relsXml) return map;
    const regex = /<Relationship Id="([^"]+)" Type="[^"]+" Target="([^"]+)"/g;
    let match;
    while ((match = regex.exec(relsXml)) !== null) {
      map.set(match[1], match[2]);
    }
    return map;
  }

  async convertDocxToHtml(docXml: string, zip: JSZip, relsMap: Map<string, string>): Promise<string> {
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

        // Text
        const tTags = run.getElementsByTagName('w:t');
        if (tTags.length > 0) {
          let text = Array.from(tTags).map(t => t.textContent).join('');
          if (!text) continue;

          const isBold = run.getElementsByTagName('w:b').length > 0;
          const isItalic = run.getElementsByTagName('w:i').length > 0;
          const isUnderline = run.getElementsByTagName('w:u').length > 0;

          if (isBold) text = `<b>${text}</b>`;
          if (isItalic) text = `<i>${text}</i>`;
          if (isUnderline) text = `<u>${text}</u>`;
          pText += text;
        }

        // Images
        const drawings = run.getElementsByTagName('w:drawing');
        if (drawings.length > 0) {
          const blips = run.getElementsByTagName('a:blip');
          if (blips.length > 0) {
            const rId = blips[0].getAttribute('r:embed');
            if (rId) {
              const target = relsMap.get(rId);
              if (target) {
                const imagePath = target.startsWith('word/') ? target : `word/${target}`;
                const fileData = await zip.file(imagePath)?.async('base64');
                if (fileData) {
                  const ext = target.split('.').pop()?.toLowerCase();
                  const mime = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'image/gif';
                  pText += `<img src="data:${mime};base64,${fileData}" style="max-width: 100%; height: auto;" />`;
                }
              }
            }
          }
        }
      }

      if (pText.trim() === '') {
        html += '<br/>';
      } else {
        html += `<p>${pText}</p>`;
      }
    }
    return html;
  }

  extractAnswersFromHtml(html: string) {
    const rawParagraphs = html.split('</p>').map(p => p.replace(/<p>/g, '').trim()).filter(p => !p.match(/^(<br\/>|\s*)$/));

    const parsed: any[] = [];
    let currentId: string | null = null;
    let currentAns: string | null = null;
    let currentSolHtml = '';

    const pushCurrent = () => {
      if (currentId && (currentAns || currentSolHtml)) {
        parsed.push({ questionId: currentId, ansStr: currentAns, solutionHtml: currentSolHtml.trim() });
      }
    };

    for (const text of rawParagraphs) {
      // Find [NUMBER]
      const numRegex = /\[NUMBER\]\s*([0-9]+)/i;
      const numMatch = text.match(numRegex);
      if (numMatch) {
        pushCurrent();
        currentId = numMatch[1]; // Store the numeric string here
        currentAns = null;
        currentSolHtml = '';
        continue;
      }

      // Find [ANS]
      const ansRegex = /\[ANS\]\s*([^<]+)/i;
      const ansMatch = text.match(ansRegex);
      if (ansMatch && currentId) {
        currentAns = ansMatch[1].trim();
        continue;
      }

      // Find [SOL]
      const solRegex = /\[SOL\](.*)/is;
      const solMatch = text.match(solRegex);
      if (solMatch && currentId) {
        const solContent = solMatch[1].trim();
        if (solContent) currentSolHtml += `<p>${solContent}</p>`;
        continue;
      }

      if (currentId) {
        currentSolHtml += `<p>${text}</p>`;
      }
    }
    pushCurrent();

    this.mapParsedToQuestions(parsed);
  }

  mapParsedToQuestions(parsedItems: any[]) {
    this.parsedAnswers = [];

    for (const item of parsedItems) {
      const qIndex = parseInt(item.questionId, 10) - 1; // 1-based index mapping to array
      const matchQ = this.existingQuestions[qIndex];

      if (!matchQ) {
        item.error = `Question number ${item.questionId} exceeds existing questions in this exam.`;
        this.parsedAnswers.push(item);
        continue;
      }

      item.matchedQuestion = matchQ;
      const qType = matchQ.questionType;
      let opts: any[] = [];

      if (['mcq_single', 'mcq_multi', 'mcq-single', 'mcq-multi'].includes(qType)) {
        const keys = item.ansStr ? item.ansStr.split(',').map((k: string) => k.trim().toUpperCase()) : [];
        const rawOpts = matchQ.questionOptions || [];
        opts = rawOpts.map((o: any) => ({
          key: o.key,
          isCorrect: keys.includes(o.key?.toUpperCase()),
          partialMark: o.partialMark || 0
        }));
      } else if (qType === 'true_false') {
        const str = (item.ansStr || '').toUpperCase();
        const rawOpts = matchQ.questionOptions || [];
        opts = rawOpts.map((o: any) => ({
          key: o.key,
          isCorrect: o.key?.toUpperCase() === str,
          partialMark: o.partialMark || 0
        }));
      } else if (['numeric', 'integer'].includes(qType)) {
        item.correctAnswer = item.ansStr;
      } else {
        item.correctAnswer = item.ansStr; // Extensible fallback
      }

      if (opts.length > 0) {
        item.questionOptions = opts;
      }

      this.parsedAnswers.push(item);
    }

    if (this.parsedAnswers.length === 0) {
      this.alert.error('No valid mappings matching [NUMBER], [ANS], [SOL] found in file.');
    }
  }

  submitAnswers() {
    const validAnswers = this.parsedAnswers.filter(a => !a.error);
    if (!validAnswers.length) return;

    const payload = {
      entiId: this.tenantId,
      userId: localStorage.getItem('userId'),
      examId: this.examData.examId,
      questions: validAnswers.map(a => ({
        questionId: a.matchedQuestion?.questionId,
        correctAnswer: a.correctAnswer,
        solutionHtml: a.solutionHtml,
        questionOptions: a.questionOptions
      }))
    };

    this.submitting = true;
    this.commonApi.fetchData(payload, 'exam/questions', 'bulk-upload-answers').subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.status) {
          const dt = res.data || {};

          if (dt.errors && dt.errors.length > 0) {
            // Attach specific backend errors back to the respective rows in the UI
            dt.errors.forEach((e: any) => {
              const matchedA = this.parsedAnswers.find(v => v.matchedQuestion?.questionId === e.questionId);
              if (matchedA) {
                matchedA.error = e.message; // Binds natively to the HTML error display badge
              }
            });

            this.alert.error(`Partial Success: ${dt.updatedCount} saved, ${dt.skippedCount} skipped. Please check the highlighted rows below.`);
          } else {
            // Full success
            this.alert.success(res.message || `${dt.updatedCount || validAnswers.length} answers imported successfully.`);
            this.router.navigate(['/app/exams/exams/view'], { state: { exam: this.examData } });
          }
        } else {
          this.alert.error(res?.message || 'Failed to import answers.');
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.alert.error(err?.error?.message || 'Error occurred during import.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/app/exams/exams']);
  }

  async downloadSample() {
    this.alert.success('Generating sample DOCX document...');
    const zip = new JSZip();

    // 1. [Content_Types].xml
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
    zip.file('[Content_Types].xml', contentTypes);

    // 2. _rels/.rels
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    zip.folder('_rels')?.file('.rels', rels);

    // 3. word/document.xml
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>[NUMBER] 1</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] A</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Explanation: Since x = 5, Option A provides the only mathematical solution.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>[NUMBER] 2</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] B, C</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>For this multi-select question, both B and C encapsulate the correct conditions.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>[NUMBER] 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] True</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>This is a standard true/false question. The statement aligns with Newton's First Law.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>[NUMBER] 4</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ANS] 42.5</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SOL]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Using the volume formula V = l * w * h, calculating 5 * 8.5 * 1 yields exactly 42.5.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    zip.folder('word')?.file('document.xml', documentXml);

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
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
