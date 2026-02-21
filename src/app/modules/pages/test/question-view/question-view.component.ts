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
  @ViewChildren('questionContent') questionElements!: QueryList<ElementRef>;
  @ViewChildren('optionContent') optionElements!: QueryList<ElementRef>;
  @ViewChildren('solutionContent') solutionElements!: QueryList<ElementRef>;

  constructor(
    private commonApi: CommonapiService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private breadcrump : BredcrumpService
  ) {this.breadcrump.set([{ label: 'Assignments', link: '/app/tests' }, { label: 'View' }]); }

  ngOnInit(): void {
    const state: any = history.state;
    const ent = localStorage.getItem('tenantId');
    this.entiId = ent || '';
    this.testId = state.questions.testId;

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
}