import { Component, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

declare var katex: any; // For KaTeX
declare var renderMathInElement: any; // For KaTeX auto-render

interface QuestionOption {
  optionHtml: string;
  isCorrect: boolean;
}

interface MatrixPair {
  left: string;
  right: string;
}

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
    private cdr: ChangeDetectorRef
  ) { }

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
        
        // Trigger change detection and render math after view updates
        this.cdr.detectChanges();
        setTimeout(() => this.renderMathContent(), 200);
      }

    } catch (err) {
      console.error(err);
    }

    this.loading = false;
  }

  async processQuestions(questions: any[]) {

    return Promise.all(
      questions.map(async (q, index) => {

        const questionHtml = await this.replaceDownloadUrls(q.questionHtml);
        const solutionHtml = q.solutionHtml
          ? await this.replaceDownloadUrls(q.solutionHtml)
          : '';

        const options = q.questionOptions?.length
          ? await Promise.all(
            q.questionOptions.map(async (opt: any) => ({
              ...opt,
              textHtml: await this.replaceDownloadUrls(opt.textHtml)
            }))
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

  /**
   * Renders LaTeX/Math content using KaTeX with auto-render
   * This method preserves HTML structure (images, links, etc.)
   * Supports both inline ($...$) and display ($$...$$) math
   */
  renderMathContent(): void {
    try {
      // Check if KaTeX auto-render is available
      if (typeof renderMathInElement === 'undefined') {
        console.warn('KaTeX auto-render not loaded. Loading fallback...');
        this.renderMathFallback();
        return;
      }

      // Render all question elements
      this.questionElements.forEach(element => {
        this.renderMathInElement(element.nativeElement);
      });

      // Render all option elements
      this.optionElements.forEach(element => {
        this.renderMathInElement(element.nativeElement);
      });

      // Render all solution elements
      this.solutionElements.forEach(element => {
        this.renderMathInElement(element.nativeElement);
      });

    } catch (err) {
      console.error('Error rendering math content:', err);
    }
  }

  /**
   * Uses KaTeX's renderMathInElement for smart DOM processing
   * This preserves HTML elements like images
   */
  private renderMathInElement(element: HTMLElement): void {
    if (!element) return;

    try {
      renderMathInElement(element, {
        delimiters: [
          { left: '$$', right: '$$', display: true },   // Display math
          { left: '$', right: '$', display: false }     // Inline math
        ],
        throwOnError: false,
        strict: false,
        trust: true
      });
    } catch (err) {
      console.error('renderMathInElement error:', err);
    }
  }

  /**
   * Fallback method if auto-render not available
   * Manually finds and renders math expressions
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
      const element = refElement.nativeElement;
      this.processElementForMath(element);
    });
  }

  /**
   * Processes element's text nodes to find and render math
   * Preserves HTML structure (images, etc.)
   */
  private processElementForMath(element: HTMLElement): void {
    if (!katex) return;

    const walk = (node: Node) => {
      // Only process text nodes
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        
        // Check if text contains math delimiters
        if (!text.includes('$')) {
          return;
        }

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        // Find all math expressions
        const mathRegex = /\$\$([^\$]+?)\$\$|\$([^\$]+?)\$/g;
        let match;

        while ((match = mathRegex.exec(text)) !== null) {
          // Add text before math
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex, match.index))
            );
          }

          // Render math
          const mathText = match[1] || match[2];
          const isDisplay = !!match[1];

          try {
            const mathHtml = katex.renderToString(mathText, {
              throwOnError: false,
              displayMode: isDisplay
            });

            const mathContainer = document.createElement(isDisplay ? 'div' : 'span');
            mathContainer.innerHTML = mathHtml;
            fragment.appendChild(mathContainer);
          } catch (err) {
            console.error('KaTeX error:', err);
            // If rendering fails, keep original text
            fragment.appendChild(document.createTextNode(match[0]));
          }

          lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex))
          );
        }

        // Replace node with fragment
        if (lastIndex > 0) {
          node.parentNode?.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip script, style, and image elements
        const element = node as HTMLElement;
        if (['SCRIPT', 'STYLE', 'IMG', 'IFRAME'].includes(element.tagName)) {
          return;
        }

        // Recursively process child nodes
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