import { Component, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

declare var katex: any;
declare var renderMathInElement: any;

@Component({
  selector: 'app-question-creator',
  standalone: false,
  templateUrl: './question-view.component.html',
  styleUrls: ['./question-view.component.scss']
})
export class QuestionViewComponent implements OnInit, AfterViewInit {
  questions: any[] = [];
  loading = false;
  entiId!: string;
  testId!: string;
  questionData!: any;
  @ViewChildren('questionContent') questionElements!: QueryList<ElementRef>;
  @ViewChildren('optionContent') optionElements!: QueryList<ElementRef>;
  @ViewChildren('solutionContent') solutionElements!: QueryList<ElementRef>;

  constructor(
    private commonApi: CommonapiService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private breadcrump: BredcrumpService
  ) { this.breadcrump.set([{ label: 'Assignments', link: '/app/tests' }, { label: 'View' }]); }

  ngOnInit(): void {
    const state: any = history.state;
    const ent = localStorage.getItem('tenantId');
    this.entiId = ent || '';
    this.testId = state.questions.testId;
    this.questionData = state.questions

    console.log("questisns ", state.questions);

    if (this.testId) {
      this.loadQuestions();
    }
  }

  ngAfterViewInit(): void {
    this.renderMathContent();
  }

  async loadQuestions() {
    this.loading = true;

    const body = {
      entiId: this.entiId,
      testId: this.testId
    };

    try {
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(body, 'assignment/question/list', 'bytest')
      );

      if (res?.status && res?.data?.length) {
        const rawQuestions = res.data[0].questions;
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

        // Convert \( \) delimiters to $ $ for consistent rendering
        questionHtml = this.normalizeDelimiters(questionHtml);
        solutionHtml = this.normalizeDelimiters(solutionHtml);

        const options = q.questionOptions?.length
          ? await Promise.all(
            q.questionOptions.map(async (opt: any) => {
              let textHtml = await this.replaceDownloadUrls(opt.textHtml);
              textHtml = this.normalizeDelimiters(textHtml);
              return {
                ...opt,
                textHtml: textHtml
              };
            })
          )
          : [];

        return {
          ...q,
          questionNumber: index + 1,
          questionHtml: this.sanitizeHtml(questionHtml),
          solutionHtml: this.sanitizeHtml(solutionHtml),
          questionOptions: options.map(o => ({
            ...o,
            textHtml: this.sanitizeHtml(o.textHtml)
          }))
        };
      })
    );
  }

  private normalizeDelimiters(html: string): string {
    if (!html) return html;

    // First, fix escaped backslashes: \\( becomes \(
    let normalized = html.replace(/\\\(/g, '\\(');
    normalized = normalized.replace(/\\\)/g, '\\)');
    normalized = normalized.replace(/\\\[/g, '\\[');
    normalized = normalized.replace(/\\\]/g, '\\]');

    // Convert \(...\) to $...$  (inline math)
    normalized = normalized.replace(/\\\((.*?)\\\)/gs, (match, content) => {
      return `$${content}$`;
    });

    // Convert \[...\] to $$...$$ (display math)
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
            'assignment/question/image',
            'download'
          )
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

      // Render question elements
      this.questionElements.forEach((element, idx) => {
        try {
          this.renderMathInElement(element.nativeElement);
        } catch (err) {
          console.error(`Error rendering question ${idx}:`, err);
        }
      });

      // Render option elements
      this.optionElements.forEach((element, idx) => {
        try {
          this.renderMathInElement(element.nativeElement);
        } catch (err) {
          console.error(`Error rendering option ${idx}:`, err);
        }
      });

      // Render solution elements
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
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false,
        strict: false,
        trust: true,
        macros: {
          "\\f": "#1f(#2)",
        }
      });
    } catch (err) {
      console.error('renderMathInElement error:', err);
    }
  }

  /**
   * Fallback rendering method
   */
  private renderMathFallback(): void {
    if (!katex) {
      console.warn('KaTeX library not loaded');
      return;
    }

    const allElements = [
      ...Array.from(this.questionElements),
      ...Array.from(this.optionElements),
      ...Array.from(this.solutionElements)
    ];

    allElements.forEach(refElement => {
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

        // Match $ delimiters
        const mathRegex = /\$\$([^\$][\s\S]*?)\$\$|\$([^\$][\s\S]*?)\$/g;
        let match;

        while ((match = mathRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex, match.index))
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
              strict: 'ignore'
            });

            const mathContainer = document.createElement(isDisplay ? 'div' : 'span');
            mathContainer.innerHTML = mathHtml;
            mathContainer.className = isDisplay ? 'katex-display-custom' : 'katex-inline-custom';
            fragment.appendChild(mathContainer);
          } catch (err) {
            console.error('KaTeX rendering error:', err);
            fragment.appendChild(document.createTextNode(match[0]));
          }

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex))
          );
        }

        if (lastIndex > 0) {
          node.parentNode?.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        if (['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'CODE', 'PRE'].includes(element.tagName)) {
          return;
        }

        const children = Array.from(node.childNodes);
        children.forEach(child => walk(child));
      }
    };

    walk(element);
  }

  formatQuestionType(type: string): string {
    switch (type) {
      case 'mcq_single':
        return 'MCQ (Single)';
      case 'mcq_multiple':
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

  editQuestion(question: any) {
    this.router.navigate(
      ['/app/tests/question-create'],
      {
        state: {
          question: {
            testId: question.testId,
            recId: question._id
          }
        }
      }
    );
  }

  deleteQuestion(question: any) {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    const body = {
      entiId: this.entiId,
      recId: question._id,
    };

    this.commonApi
      .fetchData(body, 'assignment/question', 'delete')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.questions = this.questions.filter(
              q => q.questionId !== question.questionId
            );
          }
        },
        error: () => alert('Error deleting question')
      });
  }

  printQuestions(withAnswer: boolean): void {
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) return;

      const questionsHtml = this.questions.map((q, i) => {
        const qEl = this.questionElements.toArray()[i]?.nativeElement;
        const questionHtml = qEl ? qEl.innerHTML : '';

        // Build options — 2 per row (A,B on row1 | C,D on row2)
        const opts = q.questionOptions || [];
        let optionsHtml = '';

        if (opts.length) {
          const rows: string[] = [];

          for (let j = 0; j < opts.length; j += 2) {
            const cells = [j, j + 1]
              .filter(k => k < opts.length)
              .map(k => {
                const label = String.fromCharCode(65 + k);
                const flatIndex = this.questions
                  .slice(0, i)
                  .reduce((acc: number, pq: any) => acc + (pq.questionOptions?.length || 0), 0) + k;
                const optEl = this.optionElements.toArray()[flatIndex];
                const optHtml = optEl
                  ? optEl.nativeElement.innerHTML
                  : (typeof opts[k].textHtml === 'string' ? opts[k].textHtml : '');

                const isCorrect = withAnswer && opts[k].isCorrect;

                return `<td class="opt-cell ${isCorrect ? 'correct-opt' : ''}">
                        <span class="opt-label">(${label})</span>
                        <span class="opt-text">${optHtml}</span>
                      </td>`;
              }).join('<td class="opt-divider"></td>');

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
      }).join('');

      const docTitle = withAnswer ? 'ANSWER KEY' : 'ASSIGNMENT';

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
      <td style="width:25%;text-align:left"><strong>Class:</strong> ${this.questionData.classNo}</td>
      <td style="width:25%"><strong>Subject:</strong> ${this.questionData.subject}</td>
      <td style="width:50%;text-align:right"><strong>Sub Topic:</strong> ${this.questionData.subTopicName}</td>
    </tr>
    <tr>
      <td colspan="2" style="width:70%;text-align:left"><strong>Topic:</strong> ${this.questionData.topicName}</td>
      <td style="width:30%;text-align:right"><strong>Test No:</strong> ${this.questionData.testNo}</td>
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
}

//  <div class="question-number">Q${i + 1}.
//             <span class="meta-right">
//               [${this.formatQuestionType(q.questionType)}] &nbsp;|&nbsp;
//               Marks: +${q.positiveMarks} / –${q.negativeMarks}
//             </span>
//           </div>