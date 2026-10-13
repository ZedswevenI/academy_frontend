import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { QuestionTransformService } from './transform.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';

declare var katex: any;
declare var renderMathInElement: any;

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  id: string;
}

@Component({
  selector: 'app-question-arrangement',
  standalone: false,
  templateUrl: './question-arrange.component.html',
  styleUrls: ['./question-arrange.component.scss'],
})
export class QuestionArrangementComponent implements OnInit {
  @Input() questions: any[] = [];
  @Output() orderChanged = new EventEmitter<any[]>();
  @Output() saveOrder = new EventEmitter<any[]>();
  rearrangedQuestions: any[] = [];
  isDragging = false;
  selectedQuestion: any | null = null;
  previewOpen = false;
  toasts: Toast[] = [];
  entiId!: string;
  testId!: string;
  isLoading = false;
  errorMessage = '';
  examData: any = {};
  sections: any[] = [];
  selectedSectionId: string = '';
  sectionQuestionsMap: Record<string, any[]> = {};
  @ViewChildren('questionContent') questionElements!: QueryList<ElementRef>;
  @ViewChildren('optionContent') optionElements!: QueryList<ElementRef>;

  constructor(
    private commonApi: CommonapiService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private transformService: QuestionTransformService,
    private cdr: ChangeDetectorRef,
    private breacrumb: BredcrumpService,
    private backNav: BackNavigationService,
  ) {
    this.breacrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'View' },
      { label: 'Re-Arrange' },
    ]);
  }

  ngOnInit(): void {
    const state: any = history.state;
    const ent = localStorage.getItem('tenantId');
    this.entiId = ent || '';
    // this.testId = state.questions.examId || state.questions.testId;
    // if (this.testId) {
    //   this.loadQuestions();
    // }
    this.testId = state.questions.examId || state.questions.testId;
    this.examData = state.questions || {};
    this.sections = this.examData.sections || [];
    if (this.sections.length) {
      this.selectedSectionId = this.sections[0].sectionId;
    }
    if (this.testId) {
      this.loadQuestions();
    }
  }

  async loadQuestions(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      const body = {
        tenantId: this.entiId,
        examId: this.testId,
      };
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(body, 'exam/questions', 'getallquestions'),
      );
      if (res?.status && res?.data) {
        const rawQuestions = res.data.questions;
        this.rearrangedQuestions = await this.processQuestions(rawQuestions);
        this.questions = await this.processQuestions(rawQuestions);
        // this.rearrangedQuestions = this.questions.map((q, index) => ({
        //   ...q,
        //   isView: false,
        //   order: index,
        // }));
        // this.cdr.detectChanges();
        // setTimeout(() => this.renderMathContent(), 300);
        // Group by section
        this.sectionQuestionsMap = {};
        this.sections.forEach((s: any) => {
          this.sectionQuestionsMap[s.sectionId] = [];
        });
        this.questions.forEach((q: any, index: number) => {
          const sid = q.sectionId;
          if (!this.sectionQuestionsMap[sid]) {
            this.sectionQuestionsMap[sid] = [];
          }
          this.sectionQuestionsMap[sid].push({
            ...q,
            isView: false,
            order: index,
          });
        });
        this.rearrangedQuestions =
          this.sectionQuestionsMap[this.selectedSectionId] || [];
        this.cdr.detectChanges();
        setTimeout(() => this.renderMathContent(), 300);
      }
      this.cdr.markForCheck();
    } catch (error) {
      this.cdr.markForCheck();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Handle drag and drop
   */
  drop(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(
        this.rearrangedQuestions,
        event.previousIndex,
        event.currentIndex,
      );

      this.rearrangedQuestions.forEach((q, index) => {
        q.order = index;
      });

      this.orderChanged.emit(this.rearrangedQuestions);
      this.showToast('Question moved!', 'success');
    }
  }

  /**
   * Swap questions up
   */
  swapUp(index: number): void {
    if (index > 0) {
      [this.rearrangedQuestions[index], this.rearrangedQuestions[index - 1]] = [
        this.rearrangedQuestions[index - 1],
        this.rearrangedQuestions[index],
      ];

      this.rearrangedQuestions.forEach((q, i) => {
        q.order = i;
      });

      this.orderChanged.emit(this.rearrangedQuestions);
      this.showToast('Question moved up!', 'success');
    }
  }

  /**
   * Swap questions down
   */
  swapDown(index: number): void {
    if (index < this.rearrangedQuestions.length - 1) {
      [this.rearrangedQuestions[index], this.rearrangedQuestions[index + 1]] = [
        this.rearrangedQuestions[index + 1],
        this.rearrangedQuestions[index],
      ];

      this.rearrangedQuestions.forEach((q, i) => {
        q.order = i;
      });

      this.orderChanged.emit(this.rearrangedQuestions);
      this.showToast('Question moved down!', 'success');
    }
  }

  /**
   * Get question type name
   */
  getQuestionTypeName(type: string): string {
    const typeMap: { [key: string]: string } = {
      mcqSingle: 'MCQ Single',
      mcqMultiple: 'MCQ Multiple',
      numerical: 'Numerical',
      textType: 'Short Answer',
      subjective: 'Subjective',
      trueFalse: 'True/False',
      matchTheFollowing: 'Match',
    };
    return typeMap[type] || type;
  }

  /**
   * Preview question
   */
  previewQuestion(question: any): void {
    this.selectedQuestion = question;
    this.selectedQuestion.questionView = !this.selectedQuestion.questionView;
    this.cdr.detectChanges();
    setTimeout(() => this.renderMathContent(), 300);

    // this.previewOpen = true;
  }

  /**
   * Close preview
   */
  closePreview(): void {
    this.previewOpen = false;
    this.selectedQuestion = null;
  }

  // resetOrder(): void {
  //   this.rearrangedQuestions = this.questions.map((q, index) => ({
  //     ...q,
  //     order: index,
  //   }));
  //   this.orderChanged.emit(this.rearrangedQuestions);
  //   this.showToast('Order reset to original!', 'info');
  // }

  resetOrder(): void {
    const original = [
      ...(this.sectionQuestionsMap[this.selectedSectionId] || []),
    ].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    this.rearrangedQuestions = original.map((q: any, i: number) => ({
      ...q,
      order: i,
    }));
    this.showToast('Order reset to original!', 'info');
  }

  getSectionName(sectionId: string): string {
    const s = this.sections.find((sec: any) => sec.sectionId === sectionId);
    return s?.sectionName || 'Questions';
  }

  onSectionChange(sectionId: string): void {
    this.sectionQuestionsMap[this.selectedSectionId] = this.rearrangedQuestions;
    this.selectedSectionId = sectionId;
    this.rearrangedQuestions = this.sectionQuestionsMap[sectionId] || [];
    this.cdr.detectChanges();
    setTimeout(() => this.renderMathContent(), 300);
  }

  async saveNewOrder() {
    // this.saveOrder.emit(this.rearrangedQuestions);
    // const payload = this.getAllQuestion();
    // const entiId = localStorage.getItem('tenantId');

    // const newPlaylod = {
    //   tenantId: entiId,
    //   examId: this.testId,
    //   questions: payload,
    // };
    // this.commonApi
    //   .fetchData(newPlaylod, 'exam/questions', 'sort-order')
    //   .subscribe({
    //     next: (res: any) => {
    //       if (res?.status) {
    //         this.showToast('Order saved successfully!', 'success');
    const payload = this.rearrangedQuestions.map((q: any, i: number) => ({
      qId: q._id,
      sortOrder: i,
    }));
    const body = {
      entiId: this.entiId,
      examId: this.testId,
      questions: payload,
    };
    this.commonApi.fetchData(body, 'exam/questions', 'sort-order').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.sectionQuestionsMap[this.selectedSectionId] =
            this.rearrangedQuestions.map((q: any, i: number) => ({
              ...q,
              order: i,
            }));
          this.showToast('Order saved successfully!', 'success');
          this.router.navigate(['/app/exams/exams']);
        }
      },
      error: (err) => {
        this.showToast(err.error?.message, 'success');
      },
    });
  }

  getAllQuestion(): any[] {
    const arr: any[] = [];
    this.rearrangedQuestions.forEach((q) => {
      arr.push({
        sortOrder: q.order + 1,
        qId: q._id,
      });
    });

    return arr;
  }

  /**
   * Get preview text
   */
  getPreviewText(question: any): string {
    const text = question.questionHtml || question.text;
    const plainText = text.replace(/<[^>]*>/g, '');
    return plainText.length > 100
      ? plainText.substring(0, 100) + '...'
      : plainText;
  }

  /**
   * Copy question number
   */
  copyQuestionNumber(question: any): void {
    const newNumber = (
      this.rearrangedQuestions.indexOf(question) + 1
    ).toString();
    navigator.clipboard.writeText(newNumber);
    this.showToast('Question number copied: ' + newNumber, 'success');
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'info' | 'error'): void {
    const id = Date.now().toString();
    const toast: Toast = { message, type, id };

    this.toasts.push(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 3000);
  }

  /**
   * Remove toast manually
   */
  removeToast(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  /**
   * Get current number
   */
  getCurrentNumber(question: any): number {
    return this.rearrangedQuestions.indexOf(question) + 1;
  }

  /**
   * Get CSS class for toast type
   */
  getToastClass(type: string): string {
    const classMap: { [key: string]: string } = {
      success: 'alert-success',
      error: 'alert-danger',
      info: 'alert-info',
    };
    return classMap[type] || 'alert-info';
  }

  /**
   * Get button class for disabled state
   */
  getButtonClass(isDisabled: boolean): string {
    return isDisabled
      ? 'btn-outline-secondary disabled'
      : 'btn-outline-primary';
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
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
                  textHtml: textHtml,
                };
              }),
            )
          : [];

        const leftColumn = q.leftColumn?.length
          ? await Promise.all(
              q.leftColumn.map(async (item: any, i: number) => {
                let text = await this.replaceDownloadUrls(item?.text || '');
                text = this.normalizeDelimiters(text);
                return {
                  ...item,
                  key: item?.key || String.fromCharCode(65 + i),
                  textHtml: this.sanitizeHtml(text),
                };
              }),
            )
          : [];

        const rightColumn = q.rightColumn?.length
          ? await Promise.all(
              q.rightColumn.map(async (item: any, i: number) => {
                let text = await this.replaceDownloadUrls(item?.text || '');
                text = this.normalizeDelimiters(text);
                return {
                  ...item,
                  key: item?.key || String.fromCharCode(80 + i),
                  textHtml: this.sanitizeHtml(text),
                };
              }),
            )
          : [];

        const matchMap: Record<string, string[]> = {};
        if (q.correctAnswer && q.questionType === 'matrix') {
          q.correctAnswer.split(';').forEach((pStr: string) => {
            const [lK, rKs] = pStr.split(':');
            if (lK && rKs) matchMap[lK.trim()] = rKs.trim().split('');
          });
        }

        return {
          ...q,
          questionNumber: index + 1,
          questionHtml: this.sanitizeHtml(questionHtml),
          solutionHtml: this.sanitizeHtml(solutionHtml),
          questionOptions: options.map((o) => ({
            ...o,
            textHtml: this.sanitizeHtml(o.textHtml),
          })),
          leftColumn,
          rightColumn,
          matrixMatches: leftColumn.map((l: any) => ({
            key: l.key,
            matches: matchMap[l.key] || [],
          })),
        };
      }),
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
      // this.solutionElements.forEach((element, idx) => {
      //   try {
      //     this.renderMathInElement(element.nativeElement);
      //   } catch (err) {
      //     console.error(`Error rendering solution ${idx}:`, err);
      //   }
      // });
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
      // ...Array.from(this.solutionElements)
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

        // Match $ delimiters
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

  goBack() {
    this.backNav.goBack({ route: '/app/exams/exams' });
  }
}
