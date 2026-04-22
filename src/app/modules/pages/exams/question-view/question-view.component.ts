import {
  Component,
  OnInit,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../../service/auth/auth.service';

declare var katex: any;
declare var renderMathInElement: any;

@Component({
  selector: 'app-question-creator',
  standalone: false,
  templateUrl: './question-view.component.html',
  styleUrls: ['./question-view.component.scss'],
})
export class QuestionViewComponent implements OnInit, AfterViewInit {
  questions: any[] = [];
  loading = false;
  entiId!: string;
  testId!: string;
  questionData!: any;
  isDraft = false;
  graceApplying = false;
  graceRemovingGraceId: string | null = null;
  showGraceModal = false;
  selectedGraceQuestion: any = null;
  graceMarksInput = 1;
  graceNoteInput = '';
  @ViewChildren('questionContent') questionElements!: QueryList<ElementRef>;
  @ViewChildren('optionContent') optionElements!: QueryList<ElementRef>;
  @ViewChildren('solutionContent') solutionElements!: QueryList<ElementRef>;
  showBankModal = false;
  bankQuestions: any[] = [];
  bankLoading = false;
  bankTotalRecords = 0;
  bankSelectedIds = new Set<string>();
  bankSectionId = '';
  bankMapping = false;
  bankSubjectOptions: any[] = [];
  bankTopicOptions: any[] = [];
  bankSubTopicOptions: any[] = [];
  bankAllTopics: any[] = [];
  bankAllSubTopics: any[] = [];
  bankFilterSubjectId = '';
  bankFilterTopicId = '';
  bankFilterSubTopicId = '';
  bankFilterDifficulty = '';
  bankFilterQuestionType = '';
  bankSearch = '';
  bankPage = 1;
  bankPageSize = 10;
  questionTypeOptions = [
    { label: 'MCQ (Single)', value: 'mcq_single' },
    { label: 'MCQ (Multiple)', value: 'mcq_multiple' },
    { label: 'Integer', value: 'integer' },
    { label: 'Numerical', value: 'numeric' },
    { label: 'Subjective', value: 'subjective' },
    { label: 'True/False', value: 'true_false' },
    { label: 'Text Based', value: 'passage_qns' },
    { label: 'Matrix', value: 'matrix' },
  ];
  difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
  ];

  constructor(
    private commonApi: CommonapiService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private breadcrump: BredcrumpService,
    private alert: AlertService,
    public authService: AuthService,
  ) {
    this.breadcrump.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'View' },
    ]);
  }

  ngOnInit(): void {
    const state: any = history.state;
    const ent = localStorage.getItem('tenantId');
    this.entiId = ent || '';
    this.testId = state.questions?.examId || state.questions?.testId;
    this.questionData = state.questions || {};
    this.isDraft = (state.questions?.status || '').toLowerCase() === 'draft';

    if (this.testId) {
      this.loadExamDetails();
      this.loadQuestions();
    }
  }

  loadExamDetails() {
    const body = {
      entiId: this.entiId,
      examId: this.testId,
    };
    this.commonApi.fetchData(body, 'exam', 'get').subscribe({
      next: (res: any) => {
        if (res?.status && res?.data) {
          const data = res.data;
          if (data.graces) {
            data.graces = data.graces.filter((g: any) => g.isActive);
          }
          this.questionData = data;
          this.isDraft = (data.status || '').toLowerCase() === 'draft';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error loading exam details:', err);
      },
    });
  }

  addNewQuestion() {
    this.router.navigate(['/app/exams/exams/question-create'], {
      state: {
        question: {
          testId: this.testId,
          examId: this.testId,
          sections: this.questionData.sections || [],
        },
      },
    });
  }

  ngAfterViewInit(): void {
    this.renderMathContent();
  }

  async loadQuestions() {
    this.loading = true;
    const body = {
      tenantId: this.entiId,
      examId: this.testId,
    };
    try {
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(body, 'exam/questions', 'getallquestions'),
      );
      if (res?.status && res?.data) {
        const rawQuestions = res.data.questions;
        this.questions = await this.processQuestions(rawQuestions);
        this.cdr.detectChanges();
        setTimeout(() => this.renderMathContent(), 300);
      }
    } catch (err) {
      console.error('Error loading questions:', err);
    }
    this.loading = false;
  }

  async processQuestions(questions: any[]) {
    return Promise.all(
      questions.map(async (q, index) => {
        let questionHtml = await this.replaceDownloadUrls(q.questionHtml);
        let solutionHtml = q.solutionHtml
          ? await this.replaceDownloadUrls(q.solutionHtml)
          : '';
        questionHtml = this.normalizeDelimiters(questionHtml);
        solutionHtml = this.normalizeDelimiters(solutionHtml);
        const options = q.questionOptions?.length
          ? await Promise.all(
              q.questionOptions.map(async (opt: any) => {
                let textHtml = await this.replaceDownloadUrls(opt.textHtml);
                textHtml = this.normalizeDelimiters(textHtml);
                return {
                  ...opt,
                  textHtml: textHtml,
                };
              }),
            )
          : [];
        return {
          ...q,
          questionNumber: index + 1,
          questionHtml: this.sanitizeHtml(questionHtml),
          solutionHtml: this.sanitizeHtml(solutionHtml),
          questionOptions: options.map((o) => ({
            ...o,
            textHtml: this.sanitizeHtml(o.textHtml),
          })),
        };
      }),
    );
  }

  private normalizeDelimiters(html: string): string {
    if (!html) return html;
    let normalized = html.replace(/\\\(/g, '\\(');
    normalized = normalized.replace(/\\\)/g, '\\)');
    normalized = normalized.replace(/\\\[/g, '\\[');
    normalized = normalized.replace(/\\\]/g, '\\]');
    normalized = normalized.replace(/\\\((.*?)\\\)/gs, (match, content) => {
      return `$${content}$`;
    });
    normalized = normalized.replace(/\\\[(.*?)\\\]/gs, (match, content) => {
      return `$$${content}$$`;
    });
    return normalized;
  }

  async replaceDownloadUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];
    let updatedHtml = html;
    for (const match of matches) {
      const originalUrl = match[1];
      try {
        const downloadRes: any = await firstValueFrom(
          this.commonApi.fetchData(
            { url: originalUrl },
            'exam/questions/image',
            'download',
          ),
        );
        if (downloadRes?.status) {
          updatedHtml = updatedHtml.replace(originalUrl, downloadRes.url);
        }
      } catch (err) {
        console.error('Image download error:', err);
      }
    }
    return updatedHtml;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  renderMathContent(): void {
    try {
      if (typeof renderMathInElement === 'undefined') {
        console.warn('KaTeX auto-render not loaded');
        this.renderMathFallback();
        return;
      }
      this.questionElements.forEach((element, idx) => {
        try {
          this.renderMathInElement(element.nativeElement);
        } catch (err) {
          console.error(`Error rendering question ${idx}:`, err);
        }
      });
      this.optionElements.forEach((element, idx) => {
        try {
          this.renderMathInElement(element.nativeElement);
        } catch (err) {
          console.error(`Error rendering option ${idx}:`, err);
        }
      });
      this.solutionElements.forEach((element, idx) => {
        try {
          this.renderMathInElement(element.nativeElement);
        } catch (err) {
          console.error(`Error rendering solution ${idx}:`, err);
        }
      });
    } catch (err) {
      console.error('Error in renderMathContent:', err);
    }
  }

  private renderMathInElement(element: HTMLElement): void {
    if (!element) return;
    try {
      renderMathInElement(element, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
        strict: false,
        trust: true,
        macros: {
          '\\f': '#1f(#2)',
        },
      });
    } catch (err) {
      console.error('renderMathInElement error:', err);
    }
  }

  private renderMathFallback(): void {
    if (!katex) {
      console.warn('KaTeX library not loaded');
      return;
    }
    const allElements = [
      ...Array.from(this.questionElements),
      ...Array.from(this.optionElements),
      ...Array.from(this.solutionElements),
    ];
    allElements.forEach((refElement) => {
      try {
        const element = refElement.nativeElement;
        this.processElementForMath(element);
      } catch (err) {
        console.error('Fallback rendering error:', err);
      }
    });
  }

  private processElementForMath(element: HTMLElement): void {
    if (!katex) return;
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text.includes('$')) {
          return;
        }
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        const mathRegex = /\$\$([^\$][\s\S]*?)\$\$|\$([^\$][\s\S]*?)\$/g;
        let match;
        while ((match = mathRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex, match.index)),
            );
          }
          const mathText = match[1] || match[2];
          const isDisplay = !!match[1];
          try {
            let processedMath = mathText.trim();
            processedMath = processedMath.replace(/\\\\/g, '\\');
            const mathHtml = katex.renderToString(processedMath, {
              throwOnError: false,
              displayMode: isDisplay,
              strict: 'ignore',
            });
            const mathContainer = document.createElement(
              isDisplay ? 'div' : 'span',
            );
            mathContainer.innerHTML = mathHtml;
            mathContainer.className = isDisplay
              ? 'katex-display-custom'
              : 'katex-inline-custom';
            fragment.appendChild(mathContainer);
          } catch (err) {
            console.error('KaTeX rendering error:', err);
            fragment.appendChild(document.createTextNode(match[0]));
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex)),
          );
        }
        if (lastIndex > 0) {
          node.parentNode?.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (
          ['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'CODE', 'PRE'].includes(
            element.tagName,
          )
        ) {
          return;
        }
        const children = Array.from(node.childNodes);
        children.forEach((child) => walk(child));
      }
    };
    walk(element);
  }

  formatQuestionType(type: string): string {
    switch (type) {
      case 'mcq_single':
        return 'MCQ (Single)';
      case 'mcq_multi':
        return 'MCQ (Multiple)';
      case 'true_false':
        return 'True / False';
      case 'subjective':
        return 'Subjective';
      case 'matrix':
        return 'Matrix Match';
      case 'passage_qns':
        return 'Passage Based';
      default:
        return type;
    }
  }

  getGraceForQuestion(questionId: string) {
    return (this.questionData?.graces || []).find(
      (g: any) => g.questionId === questionId && g.isActive,
    );
  }

  openGraceModal(question: any) {
    this.selectedGraceQuestion = question;
    this.graceMarksInput = 1;
    this.graceNoteInput = '';
    this.showGraceModal = true;
  }

  closeGraceModal() {
    this.showGraceModal = false;
    this.selectedGraceQuestion = null;
  }

  applyGrace() {
    if (!this.graceNoteInput.trim()) {
      this.alert.error('Please provide a reason for this grace mark');
      return;
    }
    const q = this.selectedGraceQuestion;
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      userId: localStorage.getItem('userId'),
      examId: this.testId,
      questionId: q.questionId,
      sectionId: q.sectionId,
      graceMarks: this.graceMarksInput,
      note: this.graceNoteInput,
    };
    this.graceApplying = true;
    this.commonApi.fetchData(payload, 'exam/grace', 'add').subscribe({
      next: (res: any) => {
        this.graceApplying = false;
        if (res?.status) {
          this.alert.success('Grace marks applied successfully');
          this.closeGraceModal();
          this.loadExamDetails();
        } else {
          this.alert.error(res?.message || 'Failed to apply grace marks');
        }
      },
      error: (err) => {
        this.graceApplying = false;
        this.alert.error(err?.error?.message || 'Error applying grace marks');
      },
    });
  }

  removeGraceFromQuestion(graceId: string) {
    if (!confirm('Are you sure you want to remove this grace mark?')) return;
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      examId: this.testId,
      graceId: graceId,
      userId: localStorage.getItem('userId'),
    };
    this.graceRemovingGraceId = graceId;
    this.commonApi.fetchData(payload, 'exam/grace', 'remove').subscribe({
      next: (res: any) => {
        this.graceRemovingGraceId = null;
        if (res?.status) {
          this.alert.success('Grace mark removed successfully');
          this.loadExamDetails();
        } else {
          this.alert.error(res?.message || 'Failed to remove grace mark');
        }
      },
      error: (err) => {
        this.graceRemovingGraceId = null;
        this.alert.error(err?.error?.message || 'Error removing grace mark');
      },
    });
  }

  editQuestion(question: any) {
    this.router.navigate(['/app/exams/exams/question-create'], {
      state: {
        question: {
          testId: this.testId,
          examId: this.testId,
          recId: question._id,
          sections: this.questionData.sections || [],
        },
      },
    });
  }

  deleteQuestion(question: any) {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }
    const body = {
      tenantId: this.entiId,
      recId: question._id,
    };
    this.commonApi.fetchData(body, 'exam/questions', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.questions = this.questions.filter(
            (q) => q.questionId !== question.questionId,
          );
        }
      },
      error: () => alert('Error deleting question'),
    });
  }

  importAnswers() {
    this.router.navigate(['/app/exams/exams/answer-import'], {
      state: { exam: this.questionData },
    });
  }

  printQuestions(withAnswer: boolean): void {
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) return;
      const questionsHtml = this.questions
        .map((q, i) => {
          const qEl = this.questionElements.toArray()[i]?.nativeElement;
          const questionHtml = qEl ? qEl.innerHTML : '';
          const opts = q.questionOptions || [];
          let optionsHtml = '';
          if (opts.length) {
            const rows: string[] = [];
            for (let j = 0; j < opts.length; j += 2) {
              const cells = [j, j + 1]
                .filter((k) => k < opts.length)
                .map((k) => {
                  const label = String.fromCharCode(65 + k);
                  const flatIndex =
                    this.questions
                      .slice(0, i)
                      .reduce(
                        (acc: number, pq: any) =>
                          acc + (pq.questionOptions?.length || 0),
                        0,
                      ) + k;
                  const optEl = this.optionElements.toArray()[flatIndex];
                  const optHtml = optEl
                    ? optEl.nativeElement.innerHTML
                    : typeof opts[k].textHtml === 'string'
                      ? opts[k].textHtml
                      : '';
                  const isCorrect = withAnswer && opts[k].isCorrect;
                  return `<td class="opt-cell ${isCorrect ? 'correct-opt' : ''}">
                        <span class="opt-label">(${label})</span>
                        <span class="opt-text">${optHtml}</span>
                      </td>`;
                })
                .join('<td class="opt-divider"></td>');
              rows.push(`<tr>${cells}</tr>`);
            }
            optionsHtml = `
          <table class="options-table">
            ${rows.join('')}
          </table>`;
          }
          const answerRow = withAnswer
            ? `<div class="answer-box">
             <strong>Answer:</strong>&nbsp;${q.correctAnswer?.toUpperCase()}
           </div>`
            : `<div class="answer-box">             
           </div>`;
          return `
        <div class="question-card">
          <div class="question-number">Q${i + 1}.
            <span class="meta-right">
              [${this.formatQuestionType(q.questionType)}] &nbsp;
            </span>
          </div>
          <div class="question-body">${questionHtml}</div>
          ${optionsHtml}
          ${answerRow}
        </div>`;
        })
        .join('');
      const docTitle = withAnswer ? 'ANSWER KEY' : 'EXAM';
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle}</title>
        <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
          crossorigin="anonymous">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            color: #000;
            background: #fff;
            padding: 30px 40px;
          }

          /* ── Page Header ── */
          .page-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .page-header h1 { font-size: 18pt; letter-spacing: 2px; }
          .page-header .subtitle {
            font-size: 10pt;
            margin-top: 3px;
            font-style: italic;
          }
          .page-meta {
            display: table;
            width: 100%;
            margin-top: 8px;
            font-size: 10.5pt;
          }
          .page-meta td { width: 25%; text-align: center; }

          /* ── Student Info ── */
          .student-info {
            display: ${withAnswer ? 'none' : 'table'};
            width: 100%;
            margin-bottom: 14px;
            font-size: 11pt;
            border-collapse: collapse;
          }
          .student-info td { padding: 0 10px 0 0; white-space: nowrap; }
          .student-info .fill-line {
            border-bottom: 1px solid #000;
            width: 100%;
            display: inline-block;
          }

          /* ── Instructions ── */
          .instructions {
            display: ${withAnswer ? 'none' : 'block'};
            font-size: 10pt;
            border: 1px solid #000;
            padding: 6px 12px;
            margin-bottom: 16px;
            line-height: 1.6;
          }
          .instructions ol { margin-left: 18px; }
          .instructions li { margin-bottom: 2px; }

          /* ── Question Card ── */
          .question-card {
            margin-bottom: 22px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #555;
            page-break-inside: avoid;
          }

          /* ── Question Number Row ── */
          .question-number {
            font-weight: bold;
            font-size: 11.5pt;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .meta-right {
            font-weight: normal;
            font-style: italic;
            font-size: 9.5pt;
            color: #000;
          }

          /* ── Question Body ── */
          .question-body {
            padding: 4px 18px 10px 18px;
            line-height: 1.8;
            font-size: 12pt;
          }

          /* ── Options Grid (2 per row) ── */
          .options-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 18px 10px 18px;
            width: calc(100% - 36px);
          }
          .options-table tr { vertical-align: top; }
          .opt-cell {
            width: 48%;
            padding: 3px 6px;
            vertical-align: top;
          }
          .opt-divider { width: 4%; }
          .opt-label {
            font-weight: bold;
            font-size: 11pt;
            margin-right: 6px;
            white-space: nowrap;
          }
          .opt-text {
            font-size: 11.5pt;
            line-height: 1.6;
            vertical-align: top;
          }
          .correct-opt .opt-text {
            font-weight: bold;
            text-decoration: underline;
          }
          .page-header .meta {
            font-size: 11pt;
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
          }
      .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5pt;
      margin-top: 8px;
      }
      .meta-table td {
      padding: 3px 6px;
      }
          /* ── Answer Box ── */
          .answer-box {
            margin: 6px 18px 0 18px;
            font-size: 11pt;
            padding-top: 4px;
            border-top: 1px solid #ccc;
          }
          .answer-table { width: 100%; border-collapse: collapse; }
          .answer-table td { padding: 0; }
          .marks-box { text-align: right; white-space: nowrap; }

          /* ── KaTeX ── */
          .katex { font-size: 1em; }
          img { max-width: 100%; height: auto; display: block; margin: 4px 0; }

          /* ── Print ── */
          @media print {
            body { padding: 10px 20px; }
            .question-card { page-break-inside: avoid; }
            @page { margin: 12mm 15mm; }
          }
        </style>
      </head>
      <body>

        <!-- Header -->
        <div class="page-header">
          <table class="meta-table">
    <tr>
      <td style="width:50%;text-align:left"><strong>Exam:</strong> ${this.questionData.examName || ''}</td>
      <td style="width:50%;text-align:right"><strong>Code:</strong> ${this.questionData.examCode || ''}</td>
    </tr>
    <tr>
      <td style="width:50%;text-align:left"><strong>Sections:</strong> ${(this.questionData.sections || []).map((s: any) => s.sectionName).join(' | ')}</td>
      <td style="width:50%;text-align:right"><strong>Duration:</strong> ${this.questionData.duration || ''} min</td>
    </tr>
    <tr>
      <td style="width:50%;text-align:left"><strong>Total Marks:</strong> ${this.questionData.totalMarks || ''}</td>
      <td style="width:50%;text-align:right"><strong>Total Questions:</strong> ${this.questionData.totalQuestions || ''}</td>
    </tr>
  </table>
        </div> 

        <!-- Questions -->
        ${questionsHtml}

        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);

      printWindow.document.close();
    }, 500);
  }

  openBankModal(): void {
    this.showBankModal = true;
    this.bankSelectedIds.clear();
    this.bankSectionId = '';
    this.bankPage = 1;
    this.resetBankFilters();
    this.loadBankMasters();
    this.fetchBankQuestions();
  }

  closeBankModal(): void {
    this.showBankModal = false;
    this.bankQuestions = [];
    this.bankSelectedIds.clear();
  }

  private loadBankMasters(): void {
    const body = { entiId: this.entiId };
    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => {
        this.bankSubjectOptions = (res?.data || []).map((s: any) => ({
          label: s.subjectName,
          value: s._id,
        }));
      },
    });
    // this.commonApi.fetchData(body, 'ims/topic', 'list?list=full').subscribe({
    //   next: (res: any) => { this.bankAllTopics = res?.data || []; }
    // });
    // this.commonApi.fetchData(body, 'ims/subtopic', 'list?list=full').subscribe({
    //   next: (res: any) => { this.bankAllSubTopics = res?.data || []; }
    // });
  }

  onBankSubjectChange(subjectId: string): void {
    this.bankFilterSubjectId = subjectId;
    this.bankFilterTopicId = '';
    this.bankFilterSubTopicId = '';
  }

  onBankTopicChange(topicId: string): void {
    this.bankFilterTopicId = topicId;
    this.bankFilterSubTopicId = '';
    if (topicId) {
      this.bankSubTopicOptions = this.bankAllSubTopics
        .filter((st: any) => (st.topicId?.topicId || st.topicId) === topicId)
        .map((st: any) => ({ label: st.subTopicName, value: st.subTopicId }));
    } else {
      this.bankSubTopicOptions = [];
    }
  }

  resetBankFilters(): void {
    this.bankFilterSubjectId = '';
    this.bankFilterTopicId = '';
    this.bankFilterSubTopicId = '';
    this.bankFilterDifficulty = '';
    this.bankFilterQuestionType = '';
    this.bankSearch = '';
    this.bankTopicOptions = [];
    this.bankSubTopicOptions = [];
  }

  searchBank(): void {
    this.bankPage = 1;
    this.fetchBankQuestions();
  }

  clearBankFilters(): void {
    this.resetBankFilters();
    this.bankPage = 1;
    this.fetchBankQuestions();
  }

  fetchBankQuestions(): void {
    this.bankLoading = true;
    const query: any = { page: this.bankPage, limit: this.bankPageSize };
    if (this.bankSearch) query.search = this.bankSearch;
    if (this.bankFilterSubjectId) query.subjectId = this.bankFilterSubjectId;
    if (this.bankFilterTopicId?.trim())
      query.topicId = this.bankFilterTopicId.trim();
    if (this.bankFilterSubTopicId?.trim())
      query.subTopicId = this.bankFilterSubTopicId.trim();
    if (this.bankFilterDifficulty) query.difficulty = this.bankFilterDifficulty;
    if (this.bankFilterQuestionType)
      query.questionType = this.bankFilterQuestionType;
    const queryString = Object.keys(query)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&');
    console.log(queryString)
    this.commonApi
      .fetchData(
        { entiId: this.entiId },
        'exam/questions/bank',
        `list?${queryString}`,
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.bankQuestions = (res.data || []).map((item: any) => ({
              ...item,
              questionPreview: this.stripHtml(
                item.questionHtml || '',
              ).substring(0, 120),
            }));
            this.bankTotalRecords = res.count || 0;
          }
          this.bankLoading = false;
        },
        error: () => {
          this.bankLoading = false;
          this.alert.error('Error loading bank questions');
        },
      });
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  onBankPageChange(page: number): void {
    this.bankPage = page;
    this.fetchBankQuestions();
  }

  toggleBankSelect(id: string): void {
    if (this.bankSelectedIds.has(id)) {
      this.bankSelectedIds.delete(id);
    } else {
      this.bankSelectedIds.add(id);
    }
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.bankQuestions.forEach((q) => this.bankSelectedIds.add(q._id));
    } else {
      this.bankQuestions.forEach((q) => this.bankSelectedIds.delete(q._id));
    }
  }

  get allCurrentPageSelected(): boolean {
    return (
      this.bankQuestions.length > 0 &&
      this.bankQuestions.every((q) => this.bankSelectedIds.has(q._id))
    );
  }

  mapSingleQuestion(recId: string): void {
    if (!this.bankSectionId) {
      this.alert.error('Please select a section first');
      return;
    }
    this.bankMapping = true;
    const payload = {
      entiId: this.entiId,
      recId: recId,
      examId: this.testId,
      sectionId: this.bankSectionId,
    };
    this.commonApi.fetchData(payload, 'exam/questions', 'map').subscribe({
      next: (res: any) => {
        this.bankMapping = false;
        if (res?.status) {
          this.alert.success('Question mapped successfully');
          this.bankSelectedIds.delete(recId);
          this.loadQuestions();
        }
      },
      error: () => {
        this.bankMapping = false;
        this.alert.error('Error mapping question');
      },
    });
  }

  mapSelectedQuestions(): void {
    if (!this.bankSectionId) {
      this.alert.error('Please select a section first');
      return;
    }
    if (this.bankSelectedIds.size === 0) {
      this.alert.error('Please select at least one question');
      return;
    }
    this.bankMapping = true;
    const payload = {
      entiId: this.entiId,
      recIds: Array.from(this.bankSelectedIds),
      examId: this.testId,
      sectionId: this.bankSectionId,
    };
    this.commonApi.fetchData(payload, 'exam/questions', 'bulk-map').subscribe({
      next: (res: any) => {
        this.bankMapping = false;
        if (res?.status) {
          this.alert.success(
            `${this.bankSelectedIds.size} question(s) mapped successfully`,
          );
          this.bankSelectedIds.clear();
          this.loadQuestions();
          this.closeBankModal();
        }
      },
      error: () => {
        this.bankMapping = false;
        this.alert.error('Error mapping questions');
      },
    });
  }

  get bankTotalPages(): number {
    return Math.ceil(this.bankTotalRecords / this.bankPageSize);
  }

  get bankPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.bankTotalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
}
