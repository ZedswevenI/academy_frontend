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
  showAnswerModal = false;
  answerModalQuestion: any = null;
  answerModalEntry: any = null;
  answerModalSaving = false;
  @ViewChildren('questionContent') questionElements!: QueryList<ElementRef>;
  @ViewChildren('optionContent') optionElements!: QueryList<ElementRef>;
  @ViewChildren('solutionContent') solutionElements!: QueryList<ElementRef>;
  @ViewChildren('matrixContent') matrixElements!: QueryList<ElementRef>;
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
  bankFilterClassNo: number | null = null;
  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({
      label: `Class ${i + 6}`,
      value: i + 6,
    })),
    { label: '12th Pass', value: 13 },
  ];
  bankSearch = '';
  bankPage = 1;
  bankPageSize = 10;
  questionTypeOptions = [
    { label: 'MCQ (Single)', value: 'mcq_single' },
    { label: 'MCQ (Multiple)', value: 'mcq_multi' },
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
  selectedFilterSectionId = '';

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

  backRoute = '/app/exams/exams';
  backState: any = null;

  ngOnInit(): void {
    const state: any = history.state;
    const ent = localStorage.getItem('tenantId');
    this.entiId = ent || '';
    this.testId = state.questions?.examId || state.questions?.testId;
    this.questionData = state.questions || {};
    this.isDraft = (state.questions?.status || '').toLowerCase() === 'draft';

    if (state.source === 'exam-view') {
      this.backRoute = '/app/exams/exams/view';
      this.backState = { exam: this.questionData };
      this.breadcrump.set([
        { label: 'Exam View', link: '' },
        { label: 'Questions' },
      ]);
    } else {
      this.backRoute = '/app/exams/exams';
      this.backState = null;
      this.breadcrump.set([
        { label: 'Exams', link: '/app/exams/exams' },
        { label: 'Questions' },
      ]);
    }

    if (this.testId) {
      this.loadExamDetails();
      this.loadQuestions();
    }
  }

  get filteredQuestions(): any[] {
    if (!this.selectedFilterSectionId) return this.questions;
    return this.questions.filter(
      (q: any) => q.sectionId === this.selectedFilterSectionId,
    );
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

  goBack() {
    if (this.backState) {
      this.router.navigate([this.backRoute], { state: this.backState });
    } else {
      this.router.navigate([this.backRoute]);
    }
  }

  addNewQuestion() {
    this.router.navigate(['/app/exams/exams/question-create'], {
      state: {
        source: 'exam-view',
        question: {
          testId: this.testId,
          examId: this.testId,
          sections: this.questionData.sections || [],
          classNo: this.questionData.classNo || null,
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
        const leftColumn = q.leftColumn?.length
          ? await Promise.all(
              q.leftColumn.map(async (item: any, i: number) => {
                let text = await this.replaceDownloadUrls(item?.text || '');
                text = this.normalizeDelimiters(text);
                return {
                  ...item,
                  key: item?.key || String.fromCharCode(65 + i),
                  text,
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
                  text,
                  textHtml: this.sanitizeHtml(text),
                };
              }),
            )
          : [];
        // const matchMap = this.parseMatrixCorrectAnswer(q.correctAnswer);
        const matchMap = this.parseMatrixCorrectAnswer(q.correctAnswer);
        // return {
        //   ...q,
        //   questionNumber: index + 1,
        //   questionHtml: this.sanitizeHtml(questionHtml),
        //   solutionHtml: this.sanitizeHtml(solutionHtml),
        //   questionOptions: options.map((o) => ({
        //     ...o,
        //     textHtml: this.sanitizeHtml(o.textHtml),
        //   })),
        //   leftColumn,
        //   rightColumn,
        //   matrixMatches: leftColumn.map((l: any) => ({
        //     key: l.key,
        //     matches: matchMap[l.key] || [],
        //   })),
        // };
        // Process passageHtml and instructionHtml
        let passageHtml =
          q.passageData?.passageHtml || q.passageId?.passageHtml || q.passageHtml || '';
        let instructionHtml = q.instructionHtml || '';
        passageHtml = await this.replaceDownloadUrls(passageHtml);
        instructionHtml = await this.replaceDownloadUrls(instructionHtml);
        passageHtml = this.normalizeDelimiters(passageHtml);
        instructionHtml = this.normalizeDelimiters(instructionHtml);
        return {
          ...q,
          questionNumber: index + 1,
          questionHtml: this.sanitizeHtml(questionHtml),
          solutionHtml: this.sanitizeHtml(solutionHtml),
          passageHtml: this.sanitizeHtml(passageHtml),
          instructionHtml: this.sanitizeHtml(instructionHtml),
          questionOptions: options.map((o) => ({
            ...o,
            textHtml: this.sanitizeHtml(o.textHtml),
          })),
          leftColumn,
          rightColumn,
          // matrixMatches: leftColumn.map((l: any) => ({
          //   key: l.key,
          //   matches: matchMap[l.key] || [],
          // })),
          matrixMatches: leftColumn.map((l: any) => ({
            key: l.key,
            matches: matchMap[l.key]?.matches || [],
            marks: matchMap[l.key]?.marks || 0,
            negMark: matchMap[l.key]?.negMark || 0,
          })),
        };
      }),
    );
  }

  private parseMatrixCorrectAnswer(
    correctAnswer: string,
  ): Record<string, { matches: string[]; marks: number; negMark: number }> {
    const map: Record<
      string,
      { matches: string[]; marks: number; negMark: number }
    > = {};
    if (!correctAnswer) return map;
    correctAnswer.split(';').forEach((pStr: string) => {
      const colonIdx = pStr.indexOf(':');
      if (colonIdx === -1) return;
      const lKey = pStr.substring(0, colonIdx).trim().toUpperCase();
      let rPart = pStr.substring(colonIdx + 1).trim();
      let marks = 0;
      let negMark = 0;
      const marksMatch = rPart.match(/\(([^,)]+)(?:,([^)]+))?\)/);
      if (marksMatch) {
        marks = parseFloat(marksMatch[1]) || 0;
        negMark = marksMatch[2] !== undefined ? parseFloat(marksMatch[2]) : 0;
      }
      rPart = rPart.replace(/\([^)]*\)/g, '').trim();
      if (!lKey || !rPart) return;
      if (!map[lKey]) map[lKey] = { matches: [], marks, negMark };
      const parts = rPart.toUpperCase().split(',').filter(Boolean);
      for (const part of parts) {
        for (const rk of part.split('').filter(Boolean)) {
          if (!map[lKey].matches.includes(rk)) map[lKey].matches.push(rk);
        }
      }
    });
    return map;
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
      this.matrixElements?.forEach((element, idx) => {
        try {
          this.renderMathInElement(element.nativeElement);
        } catch (err) {
          console.error(`Error rendering matrix ${idx}:`, err);
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

  // formatQuestionType(type: string): string {
  //   switch (type) {
  //     case 'mcq_single':
  //       return 'MCQ (Single)';
  //     case 'mcq_multi':
  //       return 'MCQ (Multiple)';
  //     case 'true_false':
  //       return 'True / False';
  //     case 'subjective':
  //       return 'Subjective';
  //     case 'matrix':
  //       return 'Matrix Match';
  //     case 'passage_qns':
  //       return 'Passage Based';
  //     default:
  //       return type;
  //   }
  // }

  formatQuestionType(type: string): string {
    const map: Record<string, string> = {
      mcq_single: 'MCQ (Single)',
      mcq_multi: 'MCQ (Multiple)',
      true_false: 'True / False',
      subjective: 'Subjective',
      short_answer: 'Short Answer',
      integer: 'Integer',
      numeric: 'Numerical',
      matrix: 'Matrix Match',
      passage_qns: 'Passage Based',
    };
    return map[type] || type;
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
    if (!this.graceMarksInput || this.graceMarksInput <= 0) {
      this.alert.error('Grace marks must be greater than 0');
      return;
    }
    if (!Number.isFinite(this.graceMarksInput)) {
      this.alert.error('Please enter a valid number for grace marks');
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

  openAnswerModal(q: any) {
    this.answerModalQuestion = q;
    const type = q.questionType;
    const entry: any = {};
    if (['mcq_single', 'mcq_multi', 'mcq-single', 'mcq-multi'].includes(type)) {
      entry.options = (q.questionOptions || []).map((o: any) => ({
        ...o,
        isCorrect: o.isCorrect || false,
      }));
    } else if (type === 'true_false') {
      entry.correctAnswer = q.correctAnswer || '';
    } else {
      entry.correctAnswer = q.correctAnswer || '';
    }
    this.answerModalEntry = entry;
    this.showAnswerModal = true;
  }

  closeAnswerModal() {
    this.showAnswerModal = false;
    this.answerModalQuestion = null;
    this.answerModalEntry = null;
  }

  answerModalToggle(optIndex: number) {
    const type = this.answerModalQuestion?.questionType;
    if (type === 'mcq_single' || type === 'mcq-single') {
      this.answerModalEntry.options.forEach(
        (o: any, i: number) => (o.isCorrect = i === optIndex),
      );
    } else {
      this.answerModalEntry.options[optIndex].isCorrect =
        !this.answerModalEntry.options[optIndex].isCorrect;
    }
  }

  submitAnswerModal() {
    const q = this.answerModalQuestion;
    const e = this.answerModalEntry;
    const type = q.questionType;
    const item: any = { questionId: q.questionId };
    if (['mcq_single', 'mcq_multi', 'mcq-single', 'mcq-multi'].includes(type)) {
      item.questionOptions = e.options.map((o: any) => ({
        key: o.key,
        isCorrect: o.isCorrect,
        partialMark: o.partialMark || 0,
      }));
      // item.correctAnswer = e.options.filter((o: any) => o.isCorrect).map((o: any) => o.key).join(',');
      item.correctAnswer = e.options
        .filter((o: any) => o.isCorrect)
        .map((o: any) => o.key)
        .join(';');
    } else {
      item.correctAnswer = e.correctAnswer;
    }
    const payload = {
      entiId: this.entiId,
      userId: localStorage.getItem('userId'),
      examId: this.testId,
      questions: [item],
    };
    this.answerModalSaving = true;
    this.commonApi
      .fetchData(payload, 'exam/questions', 'bulk-upload-answers')
      .subscribe({
        next: (res: any) => {
          this.answerModalSaving = false;
          if (res?.status) {
            this.alert.success('Answer updated successfully');
            q.correctAnswer = item.correctAnswer;
            if (item.questionOptions?.length) {
              item.questionOptions.forEach((updated: any) => {
                const existing = q.questionOptions?.find(
                  (o: any) => o.key === updated.key,
                );
                if (existing) existing.isCorrect = updated.isCorrect;
              });
            }
            this.closeAnswerModal();
          } else {
            this.alert.error(res?.message || 'Failed to update answer');
          }
        },
        error: (err: any) => {
          this.answerModalSaving = false;
          this.alert.error(err?.error?.message || 'Error updating answer');
        },
      });
  }

  editQuestion(question: any) {
    this.router.navigate(['/app/exams/exams/question-create'], {
      state: {
        source: 'exam-view',
        question: {
          testId: this.testId,
          examId: this.testId,
          recId: question._id,
          sections: this.questionData.sections || [],
          classNo: this.questionData.classNo || null,
        },
      },
    });
  }

  deleteQuestion(question: any) {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }
    // const body = {
    //   tenantId: this.entiId,
    //   recId: question._id,
    // };
    // this.commonApi.fetchData(body, 'exam/questions', 'delete').subscribe({
    //   next: (res: any) => {
    //     if (res?.status) {
    //       this.questions = this.questions.filter(
    //         (q) => q.questionId !== question.questionId,
    //       );
    //     }
    //   },
    //   error: () => alert('Error deleting question'),
    // });
    const body = {
      entiId: this.entiId,
      recId: question._id,
    };
    this.commonApi.fetchData(body, 'exam/questions', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Question deleted successfully');
          this.questions = this.questions.filter((q) => q._id !== question._id);
        } else {
          this.alert.error(res?.message || 'Failed to delete question');
        }
      },
      error: (err: any) =>
        this.alert.error(err?.error?.message || 'Error deleting question'),
    });
  }

  // importAnswers() {
  //   this.router.navigate(['/app/exams/exams/answer-import'], {
  //     state: { exam: this.questionData },
  //   });
  // }

  importAnswers() {
    this.router.navigate(['/app/exams/exams/answer-import'], {
      state: { exam: this.questionData, source: 'question-view' },
    });
  }

  //   printQuestions(withAnswer: boolean): void {
  //     const questionsToPrint = this.filteredQuestions;
  //     if (!questionsToPrint.length) {
  //       this.alert.error('No questions to print');
  //       return;
  //     }
  //     const safeHtml = (val: any): string => (typeof val === 'string' ? val : '');
  //     const formatAnswer = (q: any): string => {
  //       switch (q.questionType) {
  //         case 'mcq_single':
  //         case 'passage_qns':
  //           return `<span class="ans-badge">${(q.correctAnswer || '').toUpperCase()}</span>`;
  //         case 'mcq_multi':
  //           return (q.correctAnswer || '')
  //             .toUpperCase()
  //             .split(';')
  //             .map((k: string) => `<span class="ans-badge">${k.trim()}</span>`)
  //             .join(' ');
  //         case 'true_false':
  //           const tf = (q.correctAnswer || '').toLowerCase();
  //           return `<span class="ans-badge ${tf === 'true' ? 'ans-true' : 'ans-false'}">${tf === 'true' ? 'True' : 'False'}</span>`;
  //         case 'integer':
  //           return `<span class="ans-badge ans-num">${q.correctAnswer ?? ''}</span>`;
  //         case 'numeric':
  //           const range =
  //             q.numericMin != null && q.numericMax != null
  //               ? ` <span class="ans-range">(Range: ${q.numericMin} – ${q.numericMax})</span>`
  //               : '';
  //           return `<span class="ans-badge ans-num">${q.correctAnswer ?? ''}</span>${range}`;
  //         case 'subjective':
  //         case 'short_answer':
  //           return q.correctAnswer
  //             ? `<span class="ans-text">${safeHtml(q.correctAnswer)}</span>`
  //             : `<em>Manually evaluated</em>`;
  //         case 'matrix':
  //           return `<em>See matrix matches below</em>`;
  //         default:
  //           return `<span class="ans-badge">${q.correctAnswer ?? ''}</span>`;
  //       }
  //     };
  //     const questionsHtml = questionsToPrint
  //       .map((q: any, i: number) => {
  //         const qEl = this.questionElements.toArray()[i];
  //         const questionHtml = qEl
  //           ? qEl.nativeElement.innerHTML
  //           : safeHtml(q.questionHtml);
  //         const passageHtml = safeHtml(q.passageHtml);
  //         const passageBlock =
  //           q.enablePassage && passageHtml
  //             ? `<div class="passage-block"><div class="block-label">📖 Passage</div><div>${passageHtml}</div></div>`
  //             : '';
  //         const instructionHtml = safeHtml(q.instructionHtml);
  //         const instructionBlock =
  //           q.enableInstruction && instructionHtml
  //             ? `<div class="instruction-block"><div class="block-label">ℹ Instruction</div><div>${instructionHtml}</div></div>`
  //             : '';
  //         let optionsBlock = '';
  //         const opts: any[] = q.questionOptions || [];
  //         if (opts.length) {
  //           const optOffset = questionsToPrint
  //             .slice(0, i)
  //             .reduce(
  //               (acc: number, pq: any) => acc + (pq.questionOptions?.length || 0),
  //               0,
  //             );

  //           const optRows: string[] = [];
  //           for (let k = 0; k < opts.length; k += 2) {
  //             const cells = [k, k + 1]
  //               .filter((j) => j < opts.length)
  //               .map((j) => {
  //                 const optEl = this.optionElements.toArray()[optOffset + j];
  //                 const optHtml = optEl
  //                   ? optEl.nativeElement.innerHTML
  //                   : safeHtml(opts[j].textHtml);
  //                 const isCorrect = withAnswer && opts[j].isCorrect;
  //                 const key = opts[j].key || String.fromCharCode(65 + j);
  //                 return `<td class="opt-cell ${isCorrect ? 'opt-correct' : ''}">
  //                       <span class="opt-key">(${key})</span>
  //                       <span class="opt-body">${optHtml}</span>
  //                       ${isCorrect ? '<span class="opt-tick">✓</span>' : ''}
  //                     </td>`;
  //               });
  //             optRows.push(
  //               cells.length === 2
  //                 ? `<tr>${cells[0]}<td class="opt-gap"></td>${cells[1]}</tr>`
  //                 : `<tr>${cells[0]}</tr>`,
  //             );
  //           }
  //           optionsBlock = `<table class="opts-table"><tbody>${optRows.join('')}</tbody></table>`;
  //         }
  //         let matrixBlock = '';
  //         if (q.questionType === 'matrix' && q.leftColumn?.length) {
  //           const leftRows = (q.leftColumn as any[])
  //             .map(
  //               (l: any) =>
  //                 `<tr><td class="matrix-key">${l.key}.</td><td class="matrix-cell">${safeHtml(l.textHtml)}</td></tr>`,
  //             )
  //             .join('');
  //           const rightRows = (q.rightColumn as any[])
  //             .map(
  //               (r: any) =>
  //                 `<tr><td class="matrix-key">${r.key}.</td><td class="matrix-cell">${safeHtml(r.textHtml)}</td></tr>`,
  //             )
  //             .join('');
  //           const matchesTable =
  //             withAnswer && q.matrixMatches?.length
  //               ? `<div class="matrix-matches">
  //              <div class="block-label">✓ Correct Matches</div>
  //              <table class="match-table">
  //                <thead><tr><th>Left</th><th>Matches</th><th>+Marks</th><th>−Neg</th></tr></thead>
  //                <tbody>
  //                  ${(q.matrixMatches as any[])
  //                    .map(
  //                      (m: any) =>
  //                        `<tr>
  //                       <td class="match-key">${m.key}</td>
  //                       <td>${(m.matches || []).map((rk: string) => `<span class="match-badge">${rk}</span>`).join(' ')}</td>
  //                       <td class="match-marks">+${m.marks ?? 0}</td>
  //                       <td class="match-neg">${m.negMark ? '−' + m.negMark : '0'}</td>
  //                     </tr>`,
  //                    )
  //                    .join('')}
  //                </tbody>
  //              </table>
  //            </div>`
  //               : '';

  //           matrixBlock = `
  //         <div class="matrix-wrap">
  //           <table class="matrix-cols">
  //             <thead>
  //               <tr>
  //                 <th class="matrix-head">Column I</th>
  //                 <th class="matrix-head">Column II</th>
  //               </tr>
  //             </thead>
  //             <tbody>
  //               <tr>
  //                 <td class="matrix-side"><table><tbody>${leftRows}</tbody></table></td>
  //                 <td class="matrix-side"><table><tbody>${rightRows}</tbody></table></td>
  //               </tr>
  //             </tbody>
  //           </table>
  //           ${matchesTable}
  //         </div>`;
  //         }
  //         const answerBlock = withAnswer
  //           ? `<div class="answer-row"><strong>Answer:</strong>&nbsp;${formatAnswer(q)}</div>`
  //           : '';
  //         const solutionHtml = safeHtml(q.solutionHtml);
  //         const solutionBlock =
  //           withAnswer && q.enableSolution && solutionHtml
  //             ? `<div class="solution-block"><div class="block-label">💡 Solution</div><div>${solutionHtml}</div></div>`
  //             : '';

  //         const marks = `[+${q.positiveMarks}${q.negativeMarks ? ' / −' + q.negativeMarks : ''}]`;
  //         return `
  //       <div class="q-card">
  //         <div class="q-header">
  //           <span class="q-num">Q${i + 1}.</span>
  //           <span class="q-meta">${this.formatQuestionType(q.questionType)} &nbsp; ${marks}</span>
  //           ${q.questionNo ? `<span class="q-no">${q.questionNo}</span>` : ''}
  //         </div>
  //         ${instructionBlock}
  //         ${passageBlock}
  //         <div class="q-body">${questionHtml}</div>
  //         ${optionsBlock}
  //         ${matrixBlock}
  //         ${answerBlock}
  //         ${solutionBlock}
  //       </div>`;
  //       })
  //       .join('');

  //     setTimeout(() => {
  //       const printWindow = window.open('', '_blank', 'width=960,height=750');
  //       if (!printWindow) {
  //         this.alert.error('Pop-up blocked — allow pop-ups and try again');
  //         return;
  //       }
  //       const examMeta = this.questionData;
  //       const docTitle = withAnswer ? 'ANSWER KEY' : 'QUESTION PAPER';
  //       const sections = (examMeta?.sections || [])
  //         .map((s: any) => s.sectionName)
  //         .join(' | ');

  //       printWindow.document.write(`<!DOCTYPE html>
  // <html lang="en">
  // <head>
  //   <meta charset="UTF-8"/>
  //   <title>${docTitle}</title>
  //   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous"/>
  //   <style>
  //     *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  //     body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #fff; padding: 28px 40px; }
  //     .page-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
  //     .doc-title { text-align: center; font-size: 15pt; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px; }
  //     .header-table { width: 100%; border-collapse: collapse; font-size: 11pt; }
  //     .header-table td { padding: 3px 4px; }
  //     .student-strip { display: ${withAnswer ? 'none' : 'flex'}; gap: 24px; margin-bottom: 12px; font-size: 11pt; border: 1px solid #000; padding: 6px 10px; }
  //     .student-strip .fill { flex: 1; border-bottom: 1px solid #000; min-width: 120px; }
  //     .instructions { display: ${withAnswer ? 'none' : 'block'}; font-size: 10pt; border: 1px solid #ccc; padding: 5px 12px; margin-bottom: 14px; line-height: 1.6; }
  //     .instructions ol { padding-left: 20px; }
  //     .q-card { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px dashed #888; page-break-inside: avoid; }
  //     .q-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  //     .q-num  { font-weight: bold; font-size: 12pt; white-space: nowrap; }
  //     .q-meta { font-size: 9.5pt; font-style: italic; color: #333; flex: 1; }
  //     .q-no   { font-size: 9pt; color: #555; white-space: nowrap; }
  //     .q-body { padding: 2px 16px 8px 16px; line-height: 1.8; font-size: 12pt; }
  //     .passage-block, .instruction-block, .solution-block { margin: 0 16px 10px 16px; padding: 8px 12px; border-radius: 4px; font-size: 11pt; line-height: 1.7; }
  //     .passage-block     { background: #f5f5f5; border-left: 3px solid #555; }
  //     .instruction-block { background: #fffbe6; border-left: 3px solid #f0a500; }
  //     .solution-block    { background: #edf7ff; border-left: 3px solid #1a73e8; }
  //     .block-label { font-weight: bold; font-size: 10pt; margin-bottom: 4px; }
  //     .opts-table { width: calc(100% - 32px); margin: 0 16px 10px 16px; border-collapse: collapse; }
  //     .opts-table tr { vertical-align: top; }
  //     .opt-cell { width: 48%; padding: 3px 6px; vertical-align: top; line-height: 1.6; }
  //     .opt-cell.opt-correct { font-weight: bold; text-decoration: underline; }
  //     .opt-gap  { width: 4%; }
  //     .opt-key  { font-weight: bold; margin-right: 5px; font-size: 11pt; }
  //     .opt-body { font-size: 11.5pt; }
  //     .opt-tick { color: #1a7a1a; font-size: 10pt; margin-left: 4px; }
  //     .matrix-wrap  { margin: 0 16px 10px 16px; }
  //     .matrix-cols  { width: 100%; border-collapse: collapse; }
  //     .matrix-head  { font-size: 10.5pt; font-weight: bold; padding: 4px 8px; border-bottom: 1px solid #333; }
  //     .matrix-side  { width: 50%; vertical-align: top; padding: 4px 8px; }
  //     .matrix-key   { font-weight: bold; padding: 3px 8px 3px 0; white-space: nowrap; }
  //     .matrix-cell  { padding: 3px 4px; line-height: 1.6; }
  //     .matrix-matches { margin-top: 10px; }
  //     .match-table { width: auto; border-collapse: collapse; font-size: 10.5pt; margin-top: 4px; }
  //     .match-table th { padding: 3px 12px; border: 1px solid #aaa; background: #eee; font-size: 10pt; }
  //     .match-table td { padding: 3px 12px; border: 1px solid #ccc; }
  //     .match-key   { font-weight: bold; }
  //     .match-badge { display: inline-block; background: #1a7a1a; color: #fff; padding: 0 5px; border-radius: 3px; margin-right: 2px; font-size: 10pt; }
  //     .match-marks { color: #1a7a1a; font-weight: bold; }
  //     .match-neg   { color: #c0392b; }
  //     .answer-row { margin: 6px 16px 0; padding-top: 5px; border-top: 1px solid #ccc; font-size: 11pt; }
  //     .ans-badge  { display: inline-block; background: #1a7a1a; color: #fff; padding: 1px 8px; border-radius: 3px; font-weight: bold; margin-left: 4px; }
  //     .ans-true   { background: #1a7a1a; }
  //     .ans-false  { background: #c0392b; }
  //     .ans-num    { background: #1a4fa8; }
  //     .ans-range  { font-size: 10pt; color: #555; }
  //     .ans-text   { font-style: italic; }
  //     img { max-width: 100%; height: auto; display: inline-block; vertical-align: middle; }
  //     .katex { font-size: 1em; }
  //     @media print {
  //       body { padding: 8px 18px; }
  //       .q-card { page-break-inside: avoid; }
  //       @page { margin: 12mm 15mm; size: A4; }
  //     }
  //   </style>
  // </head>
  // <body>
  //   <div class="page-header">
  //     <div class="doc-title">${docTitle}</div>
  //     <table class="header-table">
  //       <tr>
  //         <td style="width:60%;"><strong>Exam:</strong> ${examMeta?.examName || ''}</td>
  //         <td style="width:40%;text-align:right;"><strong>Code:</strong> ${examMeta?.examCode || ''}</td>
  //       </tr>
  //       <tr>
  //         <td><strong>Sections:</strong> ${sections}</td>
  //         <td style="text-align:right;"><strong>Duration:</strong> ${examMeta?.duration || '—'} min</td>
  //       </tr>
  //       <tr>
  //         <td><strong>Total Marks:</strong> ${examMeta?.totalMarks || '—'}</td>
  //         <td style="text-align:right;"><strong>Total Questions:</strong> ${questionsToPrint.length}</td>
  //       </tr>
  //       <tr>
  //         <td><strong>Duration: </strong> ${examMeta?.duration || '—'} minutes</td>
  //       </tr>
  //     </table>
  //   </div>
  //   ${questionsHtml}
  //   <script>window.onload = function(){ window.print(); }<\/script>
  // </body>
  // </html>`);
  //       printWindow.document.close();
  //     }, 500);
  //   }

  printQuestions(withAnswer: boolean): void {
    const questionsToPrint = this.filteredQuestions;
    if (!questionsToPrint.length) {
      this.alert.error('No questions to print');
      return;
    }
    const safeHtml = (val: any): string => (typeof val === 'string' ? val : '');
    const formatAnswer = (q: any): string => {
      switch (q.questionType) {
        case 'mcq_single':
        case 'passage_qns':
          return `<span class="ans-badge">${(q.correctAnswer || '').toUpperCase()}</span>`;
        case 'mcq_multi':
          return (q.correctAnswer || '')
            .toUpperCase()
            .split(';')
            .map((k: string) => `<span class="ans-badge">${k.trim()}</span>`)
            .join(' ');
        case 'true_false':
          const tf = (q.correctAnswer || '').toLowerCase();
          return `<span class="ans-badge ${tf === 'true' ? 'ans-true' : 'ans-false'}">${tf === 'true' ? 'True' : 'False'}</span>`;
        case 'integer':
          return `<span class="ans-badge ans-num">${q.correctAnswer ?? ''}</span>`;
        case 'numeric':
          const range =
            q.numericMin != null && q.numericMax != null
              ? ` <span class="ans-range">(Range: ${q.numericMin} – ${q.numericMax})</span>`
              : '';
          return `<span class="ans-badge ans-num">${q.correctAnswer ?? ''}</span>${range}`;
        case 'subjective':
        case 'short_answer':
          return q.correctAnswer
            ? `<span class="ans-text">${safeHtml(q.correctAnswer)}</span>`
            : `<em>Manually evaluated</em>`;
        case 'matrix':
          return `<em>See matrix matches below</em>`;
        default:
          return `<span class="ans-badge">${q.correctAnswer ?? ''}</span>`;
      }
    };
    const questionsHtml = questionsToPrint
      .map((q: any, i: number) => {
        const qEl = this.questionElements.toArray()[i];
        const questionHtml = qEl
          ? qEl.nativeElement.innerHTML
          : safeHtml(q.questionHtml);
        const passageEl = document.getElementById(`passage-content-${i}`);
        const passageHtml = passageEl
          ? passageEl.innerHTML
          : safeHtml(q.passageHtml);
        const passageBlock =
          q.enablePassage && passageHtml
            ? `<div class="passage-block"><div class="block-label">📖 Passage</div><div>${passageHtml}</div></div>`
            : '';
        const instructionHtml = safeHtml(q.instructionHtml);
        const instructionBlock =
          q.enableInstruction && instructionHtml
            ? `<div class="instruction-block"><div class="block-label">ℹ Instruction</div><div>${instructionHtml}</div></div>`
            : '';
        let optionsBlock = '';
        const opts: any[] = q.questionOptions || [];
        if (opts.length) {
          const optOffset = questionsToPrint
            .slice(0, i)
            .reduce(
              (acc: number, pq: any) => acc + (pq.questionOptions?.length || 0),
              0,
            );
          const optRows: string[] = [];
          for (let k = 0; k < opts.length; k += 2) {
            const cells = [k, k + 1]
              .filter((j) => j < opts.length)
              .map((j) => {
                const optEl = this.optionElements.toArray()[optOffset + j];
                const optHtml = optEl
                  ? optEl.nativeElement.innerHTML
                  : safeHtml(opts[j].textHtml);
                const isCorrect = withAnswer && opts[j].isCorrect;
                const key = opts[j].key || String.fromCharCode(65 + j);
                return `<td class="opt-cell ${isCorrect ? 'opt-correct' : ''}">
                    <span class="opt-key">(${key})</span>
                    <span class="opt-body">${optHtml}</span>
                    ${isCorrect ? '<span class="opt-tick">✓</span>' : ''}
                  </td>`;
              });
            optRows.push(
              cells.length === 2
                ? `<tr>${cells[0]}<td class="opt-gap"></td>${cells[1]}</tr>`
                : `<tr>${cells[0]}</tr>`,
            );
          }
          optionsBlock = `<table class="opts-table"><tbody>${optRows.join('')}</tbody></table>`;
        }

        let matrixBlock = '';
        if (q.questionType === 'matrix' && q.leftColumn?.length) {
          const leftRows = (q.leftColumn as any[])
            .map(
              (l: any) =>
                `<tr><td class="matrix-key">${l.key}.</td><td class="matrix-cell">${this.renderLatexInHtml(l.text)}</td></tr>`,
            )
            .join('');
          const rightRows = (q.rightColumn as any[])
            .map(
              (r: any) =>
                `<tr><td class="matrix-key">${r.key}.</td><td class="matrix-cell">${this.renderLatexInHtml(r.text)}</td></tr>`,
            )
            .join('');
          const matchesTable =
            withAnswer && q.matrixMatches?.length
              ? `<div class="matrix-matches">
           <div class="block-label">✓ Correct Matches</div>
           <table class="match-table">
             <thead><tr><th>Left</th><th>Matches</th><th>+Marks</th><th>−Neg</th></tr></thead>
             <tbody>
               ${(q.matrixMatches as any[])
                 .map(
                   (m: any) =>
                     `<tr>
                    <td class="match-key">${m.key}</td>
                    <td>${(m.matches || []).map((rk: string) => `<span class="match-badge">${rk}</span>`).join(' ')}</td>
                    <td class="match-marks">+${m.marks ?? 0}</td>
                    <td class="match-neg">${m.negMark ? '−' + m.negMark : '0'}</td>
                  </tr>`,
                 )
                 .join('')}
             </tbody>
           </table>
         </div>`
              : '';
          matrixBlock = `
      <div class="matrix-wrap">
        <table class="matrix-cols">
          <thead>
            <tr>
              <th class="matrix-head">Column I</th>
              <th class="matrix-head">Column II</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="matrix-side"><table><tbody>${leftRows}</tbody></table></td>
              <td class="matrix-side"><table><tbody>${rightRows}</tbody></table></td>
            </tr>
          </tbody>
        </table>
        ${matchesTable}
      </div>`;
        }

        const answerBlock = withAnswer
          ? `<div class="answer-row"><strong>Answer:</strong>&nbsp;${formatAnswer(q)}</div>`
          : '';
        const solutionHtml = safeHtml(q.solutionHtml);
        const solutionBlock =
          withAnswer && q.enableSolution && solutionHtml
            ? `<div class="solution-block"><div class="block-label">💡 Solution</div><div>${solutionHtml}</div></div>`
            : '';

        const marks = `[+${q.positiveMarks}${q.negativeMarks ? ' / −' + q.negativeMarks : ''}]`;
        return `
    <div class="q-card">
      <div class="q-header">
        <span class="q-num">Q${i + 1}.</span>
        <span class="q-meta">${this.formatQuestionType(q.questionType)} &nbsp; ${marks}</span>
        ${q.questionNo ? `<span class="q-no">${q.questionNo}</span>` : ''}
      </div>
      ${instructionBlock}
      ${passageBlock}
      <div class="q-body">${questionHtml}</div>
      ${optionsBlock}
      ${matrixBlock}
      ${answerBlock}
      ${solutionBlock}
    </div>`;
      })
      .join('');

    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=960,height=750');
      if (!printWindow) {
        this.alert.error('Pop-up blocked — allow pop-ups and try again');
        return;
      }
      const examMeta = this.questionData;
      const docTitle = withAnswer ? 'ANSWER KEY' : 'QUESTION PAPER';
      const sections = (examMeta?.sections || [])
        .map((s: any) => s.sectionName)
        .join(' | ');

      printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${docTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #fff; padding: 28px 40px; }

    /* ── Page breaks ── */
    .instruction-page { page-break-after: always; }
    .questions-page { page-break-before: auto; }

    /* ── Header ── */
    .page-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
    .doc-title { text-align: center; font-size: 15pt; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px; }
    .header-table { width: 100%; border-collapse: collapse; font-size: 11pt; }
    .header-table td { padding: 3px 4px; }

    /* ── Student info strip ── */
    .student-strip {
      border: 1px solid #000;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 11pt;
    }
    .student-strip-title {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 10px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .student-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .student-field {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 200px;
    }
    .student-field label {
      font-weight: bold;
      white-space: nowrap;
      font-size: 11pt;
    }
    .student-field .fill-line {
      flex: 1;
      border-bottom: 1px solid #000;
      min-width: 100px;
      height: 18px;
    }

    /* ── Instructions page ── */
    .instructions-page-header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .instructions-page-header h2 {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .instructions-box {
      border: 1.5px solid #000;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .instructions-box h3 {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 12px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .instructions-general ol,
    .instructions-section ol {
      padding-left: 22px;
      margin-bottom: 0;
    }
    .instructions-general li,
    .instructions-section li {
      margin-bottom: 6px;
      line-height: 1.6;
      font-size: 11pt;
    }
    .instructions-section-title {
      font-weight: bold;
      font-size: 11pt;
      margin-top: 14px;
      margin-bottom: 6px;
      text-decoration: underline;
    }
    .section-marks-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
      margin-top: 16px;
    }
    .section-marks-table th {
      border: 1px solid #333;
      padding: 5px 10px;
      background: #f0f0f0;
      text-align: center;
    }
    .section-marks-table td {
      border: 1px solid #333;
      padding: 5px 10px;
      text-align: center;
    }
    /* ── Question cards ── */
    .q-card { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px dashed #888; page-break-inside: avoid; }
    .q-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
    .q-num  { font-weight: bold; font-size: 12pt; white-space: nowrap; }
    .q-meta { font-size: 9.5pt; font-style: italic; color: #333; flex: 1; }
    .q-no   { font-size: 9pt; color: #555; white-space: nowrap; }
    .q-body { padding: 2px 16px 8px 16px; line-height: 1.8; font-size: 12pt; }
    .passage-block, .instruction-block, .solution-block { margin: 0 16px 10px 16px; padding: 8px 12px; border-radius: 4px; font-size: 11pt; line-height: 1.7; }
    .passage-block     { background: #f5f5f5; border-left: 3px solid #555; }
    .instruction-block { background: #fffbe6; border-left: 3px solid #f0a500; }
    .solution-block    { background: #edf7ff; border-left: 3px solid #1a73e8; }
    .block-label { font-weight: bold; font-size: 10pt; margin-bottom: 4px; }
    .opts-table { width: calc(100% - 32px); margin: 0 16px 10px 16px; border-collapse: collapse; }
    .opts-table tr { vertical-align: top; }
    .opt-cell { width: 48%; padding: 3px 6px; vertical-align: top; line-height: 1.6; }
    .opt-cell.opt-correct { font-weight: bold; text-decoration: underline; }
    .opt-gap  { width: 4%; }
    .opt-key  { font-weight: bold; margin-right: 5px; font-size: 11pt; }
    .opt-body { font-size: 11.5pt; }
    .opt-tick { color: #1a7a1a; font-size: 10pt; margin-left: 4px; }
    .matrix-wrap  { margin: 0 16px 10px 16px; }
    .matrix-cols  { width: 100%; border-collapse: collapse; }
    .matrix-head  { font-size: 10.5pt; font-weight: bold; padding: 4px 8px; border-bottom: 1px solid #333; }
    .matrix-side  { width: 50%; vertical-align: top; padding: 4px 8px; }
    .matrix-key   { font-weight: bold; padding: 3px 8px 3px 0; white-space: nowrap; }
    .matrix-cell  { padding: 3px 4px; line-height: 1.6; }
    .matrix-matches { margin-top: 10px; }
    .match-table { width: auto; border-collapse: collapse; font-size: 10.5pt; margin-top: 4px; }
    .match-table th { padding: 3px 12px; border: 1px solid #aaa; background: #eee; font-size: 10pt; }
    .match-table td { padding: 3px 12px; border: 1px solid #ccc; }
    .match-key   { font-weight: bold; }
    .match-badge { display: inline-block; background: #1a7a1a; color: #fff; padding: 0 5px; border-radius: 3px; margin-right: 2px; font-size: 10pt; }
    .match-marks { color: #1a7a1a; font-weight: bold; }
    .match-neg   { color: #c0392b; }
    .answer-row { margin: 6px 16px 0; padding-top: 5px; border-top: 1px solid #ccc; font-size: 11pt; }
    .ans-badge  { display: inline-block; background: #1a7a1a; color: #fff; padding: 1px 8px; border-radius: 3px; font-weight: bold; margin-left: 4px; }
    .ans-true   { background: #1a7a1a; }
    .ans-false  { background: #c0392b; }
    .ans-num    { background: #1a4fa8; }
    .ans-range  { font-size: 10pt; color: #555; }
    .ans-text   { font-style: italic; }
    img { max-width: 100%; height: auto; display: inline-block; vertical-align: middle; }
    .katex { font-size: 1em; }
    @media print {
      body { padding: 8px 18px; }
      .q-card { page-break-inside: avoid; }
      .instruction-page { page-break-after: always; }
      @page { margin: 12mm 15mm; size: A4; }
    }
  </style>
</head>
<body>
  ${
    !withAnswer
      ? `
  <!-- ══ PAGE 1: INSTRUCTIONS ══════════════════════════════════════════ -->
  <div class="instruction-page">
    <div class="instructions-page-header">
      <h2>${examMeta?.examName || 'EXAMINATION'}</h2>
      <div style="font-size:11pt; margin-top:6px;">
        Code: <strong>${examMeta?.examCode || ''}</strong>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        Duration: <strong>${examMeta?.duration || '—'} minutes</strong>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        Total Marks: <strong>${examMeta?.totalMarks || '—'}</strong>
      </div>
    </div>
    <div class="instructions-box">
      <h3>General Instructions</h3>
      <div class="instructions-general">
        <ol>
          <li>This question paper contains <strong>${questionsToPrint.length}</strong> questions.</li>
          <li>All questions are compulsory unless otherwise stated.</li>
          <li>Read each question carefully before answering.</li>
          <li>Use of calculator, mobile phone or any electronic device is <strong>not permitted</strong> unless specified.</li>
          <li>Write your Name, Date and Enrollment Number clearly in the space provided.</li>
          <li>Do not write anything on the question paper other than what is asked.</li>
          <li>Mark your answers clearly and legibly.</li>
          <li>Rough work, if any, should be done only in the space provided for rough work.</li>
        </ol>
      </div>
      ${
        (examMeta?.sections?.length || 0) > 1
          ? `
      <div style="margin-top:20px;">
        <div class="instructions-section-title">Section-wise Instructions</div>
        <div class="instructions-section">
          <ol>
            <li>The paper is divided into <strong>${examMeta.sections.length}</strong> sections.</li>
            <li>Each section has its own marking scheme — read carefully before attempting.</li>
            <li>You may attempt sections in any order.</li>
          </ol>
        </div>
        <table class="section-marks-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Section</th>
              <th>No. of Questions</th>
              <th>Marks per Question</th>
            </tr>
          </thead>
          <tbody>
            ${(examMeta.sections as any[])
              .map(
                (s: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${s.sectionName}</td>
                <td>${s.numberOfQuestions || '—'}</td>
                <td>—</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      `
          : ''
      }
    </div>
  </div>
  <!-- ══ END PAGE 1 ══════════════════════════════════════════════════ -->
  `
      : ''
  }
  <!-- ══ QUESTIONS PAGE ════════════════════════════════════════════ -->
  <div class="questions-page">
    <div class="page-header">
      <div class="doc-title">${docTitle}</div>
      <table class="header-table">
        <tr>
          <td style="width:60%;"><strong>Exam:</strong> ${examMeta?.examName || ''}</td>
          <td style="width:40%;text-align:right;"><strong>Code:</strong> ${examMeta?.examCode || ''}</td>
        </tr>
        <tr>
          <td><strong>Sections:</strong> ${sections}</td>
          <td style="text-align:right;"><strong>Duration:</strong> ${examMeta?.duration || '—'} min</td>
        </tr>
        <tr>
          <td><strong>Total Marks:</strong> ${examMeta?.totalMarks || '—'}</td>
          <td style="text-align:right;"><strong>Total Questions:</strong> ${questionsToPrint.length}</td>
        </tr>
      </table>
    </div>
    ${
      !withAnswer
        ? `
    <div class="student-strip">
      <div class="student-strip-title">Student Information</div>
      <div class="student-fields">
        <div class="student-field">
          <label>Name:</label>
          <div class="fill-line"></div>
        </div>
        <div class="student-field">
          <label>Date:</label>
          <div class="fill-line"></div>
        </div>
        <div class="student-field">
          <label>Enrollment No:</label>
          <div class="fill-line"></div>
        </div>
      </div>
    </div>
    `
        : ''
    }
    ${questionsHtml}
  </div>
  <!-- ══ END QUESTIONS PAGE ══════════════════════════════════════════ -->
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
      printWindow.document.close();
    }, 500);
  }

  openBankModal(): void {
    this.showBankModal = true;
    this.bankSelectedIds.clear();
    this.bankSectionId = '';
    this.bankPage = 1;
    this.resetBankFilters();
    if (this.questionData?.classNo) {
      this.bankFilterClassNo = this.questionData.classNo;
    }
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
    this.bankFilterClassNo = null;
    this.bankSearch = '';
    this.bankTopicOptions = [];
    this.bankSubTopicOptions = [];
  }

  searchBank(): void {
    this.bankPage = 1;
    this.fetchBankQuestions();
  }

  clearBankFilters(): void {
    const savedClassNo = this.bankFilterClassNo;
    this.resetBankFilters();
    this.bankFilterClassNo = savedClassNo;
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
    if (this.bankFilterClassNo) query.classNo = this.bankFilterClassNo;
    const queryString = Object.keys(query)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&');
    console.log(queryString);
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
          this.loadExamDetails();
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
          this.alert.success(res.message || `Questions mapped successfully`);
          this.bankSelectedIds.clear();
          this.loadQuestions();
          this.loadExamDetails();
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

  get actualQuestionCount(): number {
    return this.questions.length;
  }

  get canAddQuestion(): boolean {
    const limit = this.questionData?.totalQuestions || 0;
    if (!limit) return true; // no limit set
    return this.actualQuestionCount < limit;
  }

  getSectionActualCount(sectionId: string): number {
    return this.questions.filter((q: any) => q.sectionId === sectionId).length;
  }

  getSectionLimit(sectionId: string): number {
    const section = (this.questionData?.sections || []).find(
      (s: any) => s.sectionId === sectionId,
    );
    return section?.numberOfQuestions || 0;
  }

  canAddToSection(sectionId: string): boolean {
    const limit = this.getSectionLimit(sectionId);
    if (!limit) return true;
    return this.getSectionActualCount(sectionId) < limit;
  }

  private decodeHtmlEntities(text: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  renderLatexInHtml(html: string): string {
    if (!html) return html;
    let result = html.replace(/\\\[([\s\S]+?)\\\]/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        return m;
      }
    });
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        return m;
      }
    });
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return m;
      }
    });
    result = result.replace(/\$([^$]+?)\$/g, (m, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return m;
      }
    });
    return result;
  }

  getQuestionNumberForGrace(questionId: string): string {
    const idx = this.questions.findIndex(
      (q: any) => q.questionId === questionId,
    );
    if (idx === -1) return questionId;
    const q = this.questions[idx];
    const text = this.stripHtml(
      typeof q.questionHtml === 'string' ? q.questionHtml : '',
    ).substring(0, 50);
    return `${q.questionNo} ${text ? ' — ' + text + (text.length >= 50 ? '...' : '') : ''}`;
  }

  get actualTotalMarks(): number {
    return this.questions.reduce(
      (sum: number, q: any) => sum + (parseFloat(q.positiveMarks) || 0),
      0,
    );
  }

  get marksMismatch(): boolean {
    const defined = parseFloat(this.questionData?.totalMarks) || 0;
    if (!defined) return false;
    return this.questions.length > 0 && this.actualTotalMarks !== defined;
  }
}
