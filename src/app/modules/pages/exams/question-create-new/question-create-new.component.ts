import { Component, NgZone, OnInit } from '@angular/core';
import katex from 'katex';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

interface QuestionOption {
  optionHtml: string;
  isCorrect: boolean;
}

interface MatrixPair {
  left: string;
  right: string;
}

@Component({
  selector: 'app-question-create-new',
  standalone: false,
  templateUrl: './question-create-new.component.html',
  styleUrl: './question-create-new.component.scss',
})
export class QuestionCreateNewComponent implements OnInit {
  questionForm!: FormGroup;
  showPassagePopup = false;
  testId = '';
  showPreviewModal = false;
  previewTitle = '';
  previewHtml: SafeHtml = '';

  isEditMode = false;
  isBankMode = false;

  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({
      label: `Class ${i + 6}`,
      value: i + 6,
    })),
    { label: '12th Pass', value: 13 },
  ];
  recId: string = '';
  entiId: string;
  private imageUrlMap = new Map<string, string>();
  examId = '';
  examData: any = null;
  sections: any[] = [];
  selectedSubjectId = '';
  subjects: any[] = [];
  subjectOptions: any[] = [];
  passages: any[] = [];
  allPassages: any[] = [];
  tagInput = '';
  tags: string[] = [];
  private ntaDefaults: Record<
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
  private noPartialTypes = new Set([
    'mcq_single',
    'integer',
    'numeric',
    'true_false',
    'subjective',
    'short_answer',
  ]);
  questionTypes = [
    { value: 'mcq_single', label: 'MCQ (Single Answer)' },
    { value: 'mcq_multi', label: 'MCQ (Multiple Answers)' },
    { value: 'integer', label: 'Integer' },
    { value: 'numeric', label: 'Numerical' },
    { value: 'subjective', label: 'Subjective Type' },
    { value: 'true_false', label: 'True/False' },
    { value: 'passage_qns', label: 'Text Based' },
    { value: 'matrix', label: 'Matrix Type (Match Questions)' },
  ];
  matrixLeftCount: number = 4;
  matrixRightCount: number = 4;

  constructor(
    private fb: FormBuilder,
    private zone: NgZone,
    private breadcrump: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {
    this.initializeForm();
    const state: any = history.state;
    this.entiId = localStorage.getItem('tenantId') || '';

    if (state?.bank) {
      this.isBankMode = true;
      if (state.question?.recId) {
        this.isEditMode = true;
        this.recId = state.question.recId;
        this.breadcrump.set([
          { label: 'Exams' },
          { label: 'Questions', link: '/app/exams/questions' },
          { label: 'Edit Question' },
        ]);
      } else {
        this.breadcrump.set([
          { label: 'Exams' },
          { label: 'Questions', link: '/app/exams/questions' },
          { label: 'Add Question' },
        ]);
      }
    } else if (state?.question) {
      this.testId = state.question.testId;
      this.examId = state.question.examId || state.question.testId || '';
      this.examData = state.question;
      this.sections = state.question.sections || [];
      if (state.question.recId) {
        this.isEditMode = true;
        this.recId = state.question.recId;
        this.breadcrump.set([
          { label: 'Questions', link: '' },
          { label: 'Edit Question' },
        ]);
      } else {
        this.breadcrump.set([
          { label: 'Questions', link: '' },
          { label: 'Add Question' },
        ]);
      }
    }
  }

  initializeForm() {
    this.questionForm = this.fb.group({
      sectionId: [''],
      questionId: [''],
      sortOrder: [1, [Validators.required, Validators.min(1)]],
      bankSubjectId: [''],
      classNo: [null],
      topicId: [''],
      subTopicId: [''],
      enablePassage: [false],
      enableInstruction: [false],
      enableSolution: [false],
      questionType: ['mcq_single', Validators.required],
      questionText: [''],
      positiveMarks: [4, [Validators.required, Validators.min(0)]],
      negativeMarks: [1, [Validators.required, Validators.min(0)]],
      hasPartialMarking: [false],
      partialMarkPerCorrect: [1, [Validators.min(0)]],
      wrongPenalty: [2, [Validators.min(0)]],
      numericMin: [null],
      numericMax: [null],
      difficulty: ['medium'],
      questionOptions: this.fb.array([]),
      passageId: [null],
      passageText: [''],
      instruction: [''],
      solution: [''],
      trueFalseAnswer: [null],
      integerAnswer: [null], // plain integer input
      subjectiveAnswer: [''],
      matrixLeft: this.fb.array([]),
      matrixRight: this.fb.array([]),
    });
  }

  onSectionChange(): void {
    const sectionId = this.questionForm.get('sectionId')?.value;
    const section = this.sections.find((s: any) => s.sectionId === sectionId);
    this.selectedSubjectId =
      section?.subjectId?._id || section?.subjectId || '';
    this.loadPassages();
    if (this.selectedSubjectId && !this.isEditMode) {
      this.fetchAndSetQuestionNo(this.selectedSubjectId);
    }
  }

  fetchAndSetQuestionNo(subjectId: string): void {
    if (this.isEditMode) return;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, subjectId },
        'exam/questions',
        'preview-question-no',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.questionForm.patchValue({ questionId: res.questionNo });
          }
        },
        error: () => {},
      });
  }

  getSelectedSectionName(): string {
    const sectionId = this.questionForm.get('sectionId')?.value;
    const section = this.sections.find((s: any) => s.sectionId === sectionId);
    return section ? `${section.sectionName} (${section.sectionCode})` : '';
  }

  ngOnInit(): void {
    if (this.isBankMode) {
      this.loadBankMasters();
    }
    this.loadPassages();

    if (this.isEditMode) {
      this.loadQuestionForEdit();
    } else {
      this.addOption();
      this.addOption();
      this.addOption();
      this.addOption();
    }
    this.handleOptionalToggles();
    this.questionForm.get('questionType')?.valueChanges.subscribe((type) => {
      this.onQuestionTypeChange(type);
    });
    this.questionForm.get('bankSubjectId')?.valueChanges.subscribe(() => {
      this.loadPassages();
    });
    this.questionForm.get('classNo')?.valueChanges.subscribe(() => {
      this.loadPassages();
    });
  }

  showPartialMarkingToggle(): boolean {
    const qt = this.getSelectedQuestionType();
    return !this.noPartialTypes.has(qt);
  }

  private loadBankMasters(): void {
    const body = { entiId: this.entiId };
    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full').subscribe({
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
    this.questionForm.patchValue({ topicId: '', subTopicId: '' });
    if (subjectId) this.fetchAndSetQuestionNo(subjectId);
  }

  loadPassages(): void {
    const classNo = this.isBankMode
      ? this.questionForm.get('classNo')?.value
      : this.examData?.classNo || null;
    const subjectId = this.isBankMode
      ? this.questionForm.get('bankSubjectId')?.value
      : this.selectedSubjectId || null;
    let query = 'list?list=full&status=active';
    if (classNo) query += `&classNo=${classNo}`;
    if (subjectId) query += `&subjectId=${subjectId}`;
    this.commonApi
      .fetchData({ entiId: this.entiId }, 'exam/passage', query)
      .subscribe({
        next: (res: any) => {
          this.passages = res?.data || [];
          this.allPassages = res?.data || [];
        },
        error: () => this.alert.error('Error loading passages'),
      });
  }

  addTag(): void {
    const tag = this.tagInput.trim().toLowerCase();
    if (tag && !this.tags.includes(tag)) this.tags.push(tag);
    this.tagInput = '';
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  removeTag(index: number): void {
    this.tags.splice(index, 1);
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
          const hashedUrl = downloadRes.url;
          this.imageUrlMap.set(hashedUrl, originalUrl);
          updatedHtml = updatedHtml.replace(originalUrl, hashedUrl);
        }
      } catch (err) {
        console.error('Image download error:', err);
      }
    }
    return updatedHtml;
  }

  async loadQuestionForEdit() {
    const body = { entiId: this.entiId, recId: this.recId };
    try {
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(body, 'exam/questions', 'view'),
      );
      if (res?.status) {
        const q = res.data;
        const questionHtml = await this.replaceDownloadUrls(q.questionHtml);
        const instructionHtml = await this.replaceDownloadUrls(
          q.instructionHtml,
        );
        const solutionHtml = await this.replaceDownloadUrls(q.solutionHtml);
        this.questionForm.patchValue({
          sectionId: q.sectionId || '',
          questionId: q.questionId || '',
          sortOrder: q.sortOrder || 1,
          questionType: q.questionType,
          questionText: questionHtml,
          positiveMarks: q.positiveMarks,
          negativeMarks: q.negativeMarks,
          hasPartialMarking: q.hasPartialMarking || false,
          numericMin: q.numericMin ?? null,
          numericMax: q.numericMax ?? null,
          difficulty: q.difficulty,
          enablePassage: !!(q.passageId || q.passageHtml),
          enableInstruction: !!q.instructionHtml,
          enableSolution: !!q.solutionHtml,
          // passageId: q.passageId || null,
          // passageText: q.passageHtml || '',
          passageId: q.passageId?._id || q.passageId || null,
          passageText:
            q.passageData?.passageHtml || q.passageId?.passageHtml || q.passageHtml || '',
          instruction: instructionHtml,
          solution: solutionHtml,
          trueFalseAnswer:
            q.questionType === 'true_false'
              ? q.correctAnswer === 'true' || q.correctAnswer === true
              : null,
          integerAnswer:
            q.questionType === 'integer' ? parseInt(q.correctAnswer, 10) : null,
          subjectiveAnswer:
            q.questionType === 'subjective' || q.questionType === 'numeric'
              ? q.correctAnswer || ''
              : '',
          bankSubjectId: q.subjectId || '',
          topicId: q.topicId || '',
          subTopicId: q.subTopicId || '',
          classNo: q.classNo || null,
        });
        this.onSectionChange();
        setTimeout(() => {
          const questionEditor = document.getElementById('questionEditor');
          if (questionEditor) questionEditor.innerHTML = questionHtml || '';
          if (q.solutionHtml) {
            const solutionEditor = document.getElementById('solutionEditor');
            if (solutionEditor) solutionEditor.innerHTML = solutionHtml || '';
          }
          if (q.instructionHtml) {
            const instructionEditor =
              document.getElementById('instructionEditor');
            if (instructionEditor)
              instructionEditor.innerHTML = instructionHtml || '';
          }
          if (
            ['subjective', 'numeric', 'short_answer'].includes(q.questionType)
          ) {
            const subjectiveEditor =
              document.getElementById('subjectiveEditor');
            if (subjectiveEditor)
              subjectiveEditor.innerHTML = q.correctAnswer || '';
          }
        }, 0);
        if (q.questionOptions?.length) {
          this.options.clear();
          for (let i = 0; i < q.questionOptions.length; i++) {
            const opt = q.questionOptions[i];
            const processedOptionHtml = await this.replaceDownloadUrls(
              opt.textHtml,
            );
            this.options.push(
              this.fb.group({
                text: processedOptionHtml,
                isCorrect: opt.isCorrect || false,
              }),
            );
            setTimeout(() => {
              const optionEditor = document.getElementById('optionEditor-' + i);
              if (optionEditor)
                optionEditor.innerHTML = processedOptionHtml || '';
            }, 0);
          }
        }
        if (q.questionType === 'matrix' && q.leftColumn?.length) {
          this.matrixLeft.clear();
          this.matrixRight.clear();
          const answerMap: Record<
            string,
            { keys: string[]; marks: number; negMark: number }
          > = {};
          if (q.correctAnswer) {
            q.correctAnswer.split(';').forEach((pStr: string) => {
              const match = pStr.match(
                /^([^:]+):([^(]+)\(([^,)]+)(?:,([^)]+))?\)$/,
              );
              if (match) {
                const lKey = match[1].trim().toUpperCase();
                const rKeysRaw = match[2].trim().toUpperCase();
                const marks = parseFloat(match[3]) || 0;
                const negMark =
                  match[4] !== undefined ? parseFloat(match[4]) : 0;
                if (!answerMap[lKey])
                  answerMap[lKey] = { keys: [], marks, negMark };
                const rKeys = rKeysRaw.split(',').filter(Boolean);
                for (const rk of rKeys) {
                  for (const singleKey of rk.split('').filter(Boolean)) {
                    if (!answerMap[lKey].keys.includes(singleKey)) {
                      answerMap[lKey].keys.push(singleKey);
                    }
                  }
                }
              }
            });
          }
          const leftCount = q.leftColumn.length;
          const rightCount = q.rightColumn?.length || 0;
          const defaultPairMarks = q.positiveMarks / (leftCount || 1);
          this.matrixLeftCount = leftCount;
          this.matrixRightCount = rightCount;
          for (let i = 0; i < leftCount; i++) {
            const leftHtml = await this.replaceDownloadUrls(
              q.leftColumn[i]?.text || '',
            );
            const lKey = String.fromCharCode(65 + i);
            this.matrixLeft.push(
              this.fb.group({
                text: leftHtml,
                selectedMatches: [answerMap[lKey]?.keys || []],
                pairMarks: [answerMap[lKey]?.marks ?? defaultPairMarks],
                negativeMark: [answerMap[lKey]?.negMark ?? 0],
              }),
            );
            setTimeout(() => {
              const leftEditor = document.getElementById(
                'matrixLeftEditor-' + i,
              );
              if (leftEditor) leftEditor.innerHTML = leftHtml || '';
            }, 0);
          }
          for (let i = 0; i < rightCount; i++) {
            const rightHtml = await this.replaceDownloadUrls(
              q.rightColumn[i]?.text || '',
            );
            this.matrixRight.push(this.fb.group({ text: rightHtml }));
            setTimeout(() => {
              const rightEditor = document.getElementById(
                'matrixRightEditor-' + i,
              );
              if (rightEditor) rightEditor.innerHTML = rightHtml || '';
            }, 0);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  handleOptionalToggles(): void {
    this.questionForm
      .get('enablePassage')
      ?.valueChanges.subscribe((enabled) => {
        if (!enabled)
          this.questionForm.patchValue({ passageId: null, passageText: '' });
      });
    this.questionForm
      .get('enableInstruction')
      ?.valueChanges.subscribe((enabled) => {
        if (!enabled) this.questionForm.patchValue({ instruction: '' });
      });
    this.questionForm
      .get('enableSolution')
      ?.valueChanges.subscribe((enabled) => {
        if (!enabled) this.questionForm.patchValue({ solution: '' });
      });
  }

  get options(): FormArray {
    return this.questionForm.get('questionOptions') as FormArray;
  }

  get matrixLeft(): FormArray {
    return this.questionForm.get('matrixLeft') as FormArray;
  }

  get matrixRight(): FormArray {
    return this.questionForm.get('matrixRight') as FormArray;
  }

  addOption(): void {
    this.options.push(this.fb.group({ text: [''], isCorrect: [false] }));
  }

  removeOption(index: number): void {
    if (this.options.length > 2) this.options.removeAt(index);
  }

  addMatrixPair(): void {
    const defaultPairMarks = this.getDefaultPairMarks();
    this.matrixLeft.push(
      this.fb.group({
        text: '',
        selectedMatches: [[]],
        pairMarks: [defaultPairMarks],
        negativeMark: [0],
      }),
    );
    this.matrixRight.push(this.fb.group({ text: '' }));
  }

  generateMatrix(): void {
    const leftCount = Math.max(
      1,
      Math.min(8, parseInt(String(this.matrixLeftCount), 10) || 4),
    );
    const rightCount = Math.max(
      1,
      Math.min(8, parseInt(String(this.matrixRightCount), 10) || 4),
    );
    const defaultPairMarks = parseFloat(
      (
        (this.questionForm.get('positiveMarks')?.value || 8) / leftCount
      ).toFixed(2),
    );
    this.matrixLeft.clear();
    this.matrixRight.clear();
    for (let i = 0; i < leftCount; i++) {
      this.matrixLeft.push(
        this.fb.group({
          text: '',
          selectedMatches: [[]],
          pairMarks: [defaultPairMarks],
          negativeMark: [0],
        }),
      );
    }
    for (let i = 0; i < rightCount; i++) {
      this.matrixRight.push(this.fb.group({ text: '' }));
    }
  }

  removeMatrixPair(index: number): void {
    if (this.matrixLeft.length > 1) {
      this.matrixLeft.removeAt(index);
      // this.matrixRight.removeAt(index);
    }
  }

  private getDefaultPairMarks(): number {
    const pos = parseFloat(this.questionForm.get('positiveMarks')?.value) || 8;
    const count = this.matrixLeft.length || 1;
    return parseFloat((pos / count).toFixed(2));
  }

  getMatrixPairMarksTotal(): number {
    return this.matrixLeft.controls.reduce(
      (sum, c) => sum + (parseFloat(c.get('pairMarks')?.value) || 0),
      0,
    );
  }

  matrixMarksExceeded(): boolean {
    const pos = parseFloat(this.questionForm.get('positiveMarks')?.value) || 0;
    return this.getMatrixPairMarksTotal() > pos;
  }

  mcqPartialMarksExceeded(): boolean {
    const qt = this.getSelectedQuestionType();
    if (qt !== 'mcq_multi') return false;
    const pos = parseFloat(this.questionForm.get('positiveMarks')?.value) || 0;
    const perCorrect =
      parseFloat(this.questionForm.get('partialMarkPerCorrect')?.value) || 0;
    const correctCount = this.options.controls.filter(
      (c) => c.get('isCorrect')?.value,
    ).length;
    return perCorrect * correctCount > pos;
  }

  onQuestionTypeChange(type: string): void {
    const defaults = this.ntaDefaults[type];
    if (defaults) {
      this.questionForm.patchValue({
        positiveMarks: defaults.pos,
        negativeMarks: defaults.neg,
        hasPartialMarking: defaults.partial,
      });
    }
    if (type === 'matrix') {
      this.options.clear();
      this.matrixLeftCount = 4;
      this.matrixRightCount = 4;
      if (this.matrixLeft.length === 0) {
        this.generateMatrix();
      }
    } else if (type === 'mcq_single' || type === 'mcq_multi') {
      this.matrixLeft.clear();
      this.matrixRight.clear();
      if (this.options.length === 0) {
        this.addOption();
        this.addOption();
        this.addOption();
        this.addOption();
      }
    } else {
      this.options.clear();
      this.matrixLeft.clear();
      this.matrixRight.clear();
    }
  }

  onOptionChange(index: number, type: string): void {
    if (type === 'mcq_single') {
      this.options.controls.forEach((control, i) => {
        if (i !== index) control.get('isCorrect')?.setValue(false);
      });
    }
  }

  getSelectedQuestionType(): string {
    return this.questionForm.get('questionType')?.value || 'mcq_single';
  }

  private validateBeforeSubmit(): boolean {
    const qt = this.getSelectedQuestionType();
    if (qt === 'mcq_single' || qt === 'mcq_multi') {
      const correctCount = this.options.controls.filter(
        (c) => c.get('isCorrect')?.value,
      ).length;
      if (correctCount === 0) {
        this.alert.error('Please mark at least one option as correct');
        return false;
      }
      if (qt === 'mcq_single' && correctCount > 1) {
        this.alert.error('MCQ Single can only have one correct option');
        return false;
      }
    }
    if (qt === 'integer') {
      const val = this.questionForm.get('integerAnswer')?.value;
      if (val === null || val === undefined || val === '') {
        this.alert.error('Please enter an integer answer');
        return false;
      }
      if (!Number.isInteger(Number(val))) {
        this.alert.error('Answer must be a whole integer (no decimals)');
        return false;
      }
    }
    if (qt === 'numeric') {
      const min = this.questionForm.get('numericMin')?.value;
      const max = this.questionForm.get('numericMax')?.value;
      if (
        min === null ||
        min === undefined ||
        max === null ||
        max === undefined
      ) {
        this.alert.error('Please enter both Numeric Min and Max values');
        return false;
      }
      if (parseFloat(min) > parseFloat(max)) {
        this.alert.error('Numeric Min must be less than or equal to Max');
        return false;
      }
    }
    if (qt === 'matrix') {
      const anyUnmatched = this.matrixLeft.controls.some(
        (c) => !c.get('selectedMatches')?.value?.length,
      );
      if (anyUnmatched) {
        this.alert.error(
          'Please select at least one match for each left column item',
        );
        return false;
      }
      if (this.matrixMarksExceeded()) {
        this.alert.error(
          `Sum of pair marks (${this.getMatrixPairMarksTotal()}) exceeds question marks (${this.questionForm.get('positiveMarks')?.value})`,
        );
        return false;
      }
    }
    if (this.mcqPartialMarksExceeded()) {
      this.alert.error(
        'Partial marks per correct × number of correct options exceeds total positive marks',
      );
      return false;
    }
    return true;
  }

  onSubmit(): void {
    if (!this.questionForm.valid) {
      this.questionForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }
    if (!this.validateBeforeSubmit()) return;
    if (this.isBankMode) {
      this.submitBankQuestion();
      return;
    }
    if (!this.selectedSubjectId) {
      this.alert.error('Please select a section first');
      return;
    }
    this.prepareQuestionData().then((payload) => {
      const formValue = this.questionForm.value;
      const finalPayload: any = {
        entiId: this.entiId,
        examId: this.examId,
        sectionId: formValue.sectionId,
        subjectId: this.selectedSubjectId,
        sortOrder: formValue.sortOrder,
        questionId: formValue.questionId || undefined,
        status: 'active',
        ...payload,
      };
      if (this.isEditMode) {
        finalPayload['recId'] = this.recId;
        this.commonApi
          .fetchData(finalPayload, 'exam/questions', 'update')
          .subscribe({
            next: (res: any) => {
              if (res?.status) {
                this.alert.success('Question updated successfully');
                this.goBackToQuestions();
              }
            },
            error: (err) =>
              this.alert.error(err.error?.message || 'Update failed'),
          });
      } else {
        this.commonApi
          .fetchData(finalPayload, 'exam/questions', 'create')
          .subscribe({
            next: (res: any) => {
              if (res?.status) {
                this.alert.success('Question created successfully');
                this.goBackToQuestions();
              }
            },
            error: (err) =>
              this.alert.error(err.error?.message || 'Create failed'),
          });
      }
    });
  }

  public goBackToQuestions(): void {
    if (this.examId) {
      this.router.navigate(['/app/exams/exams/question-view'], {
        state: {
          questions: { examId: this.examId, testId: this.testId },
          source: (history.state as any)?.source,
        },
      });
    } else {
      this.router.navigate(['/app/exams/questions']);
    }
  }

  private submitBankQuestion(): void {
    const formValue = this.questionForm.value;
    if (!formValue.bankSubjectId) {
      this.alert.error('Please select a subject');
      return;
    }
    if (!formValue.topicId?.trim()) {
      this.alert.error('Topic is required for bank questions');
      return;
    }
    if (!formValue.classNo) {
      this.alert.error('Please select a class');
      return;
    }
    this.prepareQuestionData().then((payload) => {
      const formValue = this.questionForm.value;
      const finalPayload: any = {
        entiId: this.entiId,
        subjectId: formValue.bankSubjectId || undefined,
        topicId: formValue.topicId || undefined,
        subTopicId: formValue.subTopicId || undefined,
        classNo: formValue.classNo || undefined,
        sortOrder: formValue.sortOrder,
        status: 'active',
        ...payload,
      };
      if (this.isEditMode) {
        finalPayload['recId'] = this.recId;
        this.commonApi
          .fetchData(finalPayload, 'exam/questions', 'update')
          .subscribe({
            next: (res: any) => {
              if (res?.status) {
                this.alert.success('Question updated successfully');
                this.router.navigate(['/app/exams/questions']);
              }
            },
            error: (err) =>
              this.alert.error(err.error?.message || 'Update failed'),
          });
      } else {
        this.commonApi
          .fetchData(finalPayload, 'exam/questions/bank', 'create')
          .subscribe({
            next: (res: any) => {
              if (res?.status) {
                this.alert.success('Question created successfully');
                this.router.navigate(['/app/exams/questions']);
              }
            },
            error: (err) =>
              this.alert.error(err.error?.message || 'Create failed'),
          });
      }
    });
  }

  execCommandFor(
    editorId: string,
    command: string,
    value: string | null = null,
  ) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value || '');
  }

  execCommand(command: string, value: string | null = null) {
    document.execCommand(command, false, value || '');
  }

  onEditorInput(event: Event, controlName: string) {
    const target = event.target as HTMLDivElement;
    this.zone.run(() => {
      this.questionForm.patchValue({ [controlName]: target.innerHTML });
    });
  }

  onOptionEditorInput(index: number, event: Event) {
    const target = event.target as HTMLDivElement;
    this.zone.run(() => {
      const optionGroup = this.options.at(index) as FormGroup;
      optionGroup.patchValue({ text: target.innerHTML });
    });
  }

  onMatrixRightEditorInput(index: number, event: Event) {
    const group = this.matrixRight.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    group.patchValue({ text: target.innerHTML });
  }

  onMatrixLeftEditorInput(index: number, event: Event) {
    const group = this.matrixLeft.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    group.patchValue({ text: target.innerHTML });
  }

  extractBase64Images(html: string): { images: string[]; cleanedHtml: string } {
    const images: string[] = [];
    let cleanedHtml = html;
    const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/g;
    let match;
    while ((match = imgRegex.exec(html)) !== null) images.push(match[1]);
    return { images, cleanedHtml };
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
    const base64String = base64.split(',')[1];
    const padding = (base64String.match(/=+$/) || [''])[0].length;
    return ((base64String.length * 3) / 4 - padding) / 1024;
  }

  compressBase64Image(base64: string, maxSizeKB = 50): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width,
          height = img.height;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Canvas not supported');
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
      if (res?.status && res?.files?.length) return res.files[0].s3Url;
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async replaceImagesWithUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let updatedHtml = html,
      match;
    while ((match = imgRegex.exec(html)) !== null) {
      const currentSrc = match[1];
      if (currentSrc.startsWith('data:image')) {
        const uploadRes = await this.uploadImage(currentSrc);
        if (uploadRes)
          updatedHtml = updatedHtml.replace(
            `src="${currentSrc}"`,
            `src="${uploadRes}"`,
          );
      } else if (this.imageUrlMap.has(currentSrc)) {
        const originalUrl = this.imageUrlMap.get(currentSrc);
        updatedHtml = updatedHtml.replace(
          `src="${currentSrc}"`,
          `src="${originalUrl}"`,
        );
      }
    }
    return updatedHtml;
  }

  restoreOriginalUrls(html: string): string {
    if (!html || !html.includes('<img')) return html;
    let restoredHtml = html;
    this.imageUrlMap.forEach((originalUrl, hashedUrl) => {
      restoredHtml = restoredHtml.replace(hashedUrl, originalUrl);
    });
    return restoredHtml;
  }

  private extractImageUrls(
    html: string,
  ): { url: string; label: string; order: number }[] {
    if (!html || !html.includes('<img')) return [];
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const images: { url: string; label: string; order: number }[] = [];
    let match,
      order = 0;
    while ((match = imgRegex.exec(html)) !== null) {
      if (!match[1].startsWith('data:image')) {
        images.push({
          url: match[1],
          label: `fig${order + 1}`,
          order: order++,
        });
      }
    }
    return images;
  }

  async prepareQuestionData(): Promise<any> {
    const formValue = this.questionForm.value;
    const questionType = formValue.questionType;
    const questionText = await this.replaceImagesWithUrls(
      formValue.questionText,
    );
    const instruction = await this.replaceImagesWithUrls(formValue.instruction);
    const solution = await this.replaceImagesWithUrls(formValue.solution);
    const questionHtml = this.restoreOriginalUrls(questionText);
    const instructionHtml = this.restoreOriginalUrls(instruction);
    const solutionHtml = this.restoreOriginalUrls(solution);
    const passageId = formValue.enablePassage ? formValue.passageId : null;
    const passageHtml = formValue.enablePassage
      ? formValue.passageText || ''
      : '';
    const allImages = [
      ...this.extractImageUrls(questionHtml),
      ...this.extractImageUrls(solutionHtml),
    ];
    const baseData: any = {
      enablePassage: formValue.enablePassage,
      enableInstruction: formValue.enableInstruction,
      enableSolution: formValue.enableSolution,
      questionType,
      instructionHtml,
      solutionHtml,
      questionHtml,
      positiveMarks: formValue.positiveMarks,
      negativeMarks: formValue.negativeMarks,
      hasPartialMarking: formValue.hasPartialMarking,
      difficulty: formValue.difficulty,
      tags: this.tags,
      passageId,
      passageHtml,
      images: allImages,
    };
    if (questionType === 'numeric') {
      baseData.numericMin = formValue.numericMin;
      baseData.numericMax = formValue.numericMax;
    } else {
      baseData.numericMin = null;
      baseData.numericMax = null;
    }
    switch (questionType) {
      case 'mcq_single':
      case 'mcq_multi': {
        const partialMarkPerCorrect =
          parseFloat(formValue.partialMarkPerCorrect) || 0;
        const wrongPenalty = parseFloat(formValue.wrongPenalty) || 0;

        const processedOptions = await Promise.all(
          formValue.questionOptions.map(async (opt: any, idx: number) => {
            const replaced = await this.replaceImagesWithUrls(opt.text);
            const restored = this.restoreOriginalUrls(replaced);
            const key = String.fromCharCode(65 + idx);
            const partialMark =
              questionType === 'mcq_multi' &&
              formValue.hasPartialMarking &&
              opt.isCorrect
                ? partialMarkPerCorrect
                : 0;
            return {
              key,
              textHtml: restored,
              isCorrect: opt.isCorrect,
              partialMark,
            };
          }),
        );
        processedOptions.forEach((opt) =>
          allImages.push(...this.extractImageUrls(opt.textHtml)),
        );
        baseData.images = allImages;
        if (questionType === 'mcq_multi' && formValue.hasPartialMarking) {
          baseData.negativeMarks = wrongPenalty;
        }
        const correctKeys = processedOptions
          .filter((opt) => opt.isCorrect)
          .map((opt) => opt.key);
        return {
          ...baseData,
          questionOptions: processedOptions,
          correctAnswer: correctKeys.join(';'),
        };
      }
      case 'true_false':
        return {
          ...baseData,
          correctAnswer: String(formValue.trueFalseAnswer),
          questionOptions: [],
        };
      case 'integer': {
        const intVal = parseInt(String(formValue.integerAnswer), 10);
        return {
          ...baseData,
          correctAnswer: isNaN(intVal) ? '' : String(intVal),
          questionOptions: [],
        };
      }
      case 'numeric':
      case 'subjective': {
        const sampleAnswer = await this.replaceImagesWithUrls(
          formValue.subjectiveAnswer || '',
        );
        return {
          ...baseData,
          correctAnswer: sampleAnswer,
          questionOptions: [],
        };
      }
      case 'short_answer': {
        return {
          ...baseData,
          correctAnswer: (formValue.subjectiveAnswer || '').trim(),
          questionOptions: [],
        };
      }
      case 'passage_qns':
        return { ...baseData, questionOptions: [] };
      case 'matrix': {
        const leftColumn = await Promise.all(
          formValue.matrixLeft.map(async (item: any, i: number) => ({
            key: String.fromCharCode(65 + i),
            text: await this.replaceImagesWithUrls(item.text),
          })),
        );
        const rightColumn = await Promise.all(
          formValue.matrixRight.map(async (item: any, i: number) => ({
            key: String.fromCharCode(80 + i),
            text: await this.replaceImagesWithUrls(item.text),
          })),
        );
        const correctPairs: string[] = [];
        formValue.matrixLeft.forEach((item: any, i: number) => {
          const lKey = String.fromCharCode(65 + i);
          const pairMarks = parseFloat(item.pairMarks) || 0;
          const negativeMark = parseFloat(item.negativeMark) || 0;
          const matches: string[] = item.selectedMatches || [];
          if (matches.length === 0) return;
          const rKeys = matches.join(',');
          correctPairs.push(`${lKey}:${rKeys}(${pairMarks},${negativeMark})`);
        });
        return {
          ...baseData,
          hasPartialMarking: true,
          leftColumn,
          rightColumn,
          correctAnswer: correctPairs.join(';'),
          questionOptions: [],
        };
      }
      default:
        return { ...baseData, questionOptions: [] };
    }
  }

  resetForm(): void {
    this.questionForm.reset({
      questionType: 'mcq_single',
      positiveMarks: 4,
      negativeMarks: 1,
      difficulty: 'medium',
    });
    this.options.clear();
    this.matrixLeft.clear();
    this.matrixRight.clear();
    this.addOption();
    this.addOption();
    this.addOption();
    this.addOption();
  }

  execOptionCommand(index: number, command: string) {
    const editor = document.getElementById(
      'optionEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, '');
  }

  insertOptionTable(index: number) {
    const editor = document.getElementById(
      'optionEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;
    let html =
      '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let i = 0; i < +rows; i++) {
      html += '<tr>';
      for (let j = 0; j < +cols; j++)
        html += '<td style="padding:8px;border:1px solid #ddd"></td>';
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';
    document.execCommand('insertHTML', false, html);
  }

  insertOptionLatex(index: number) {
    const editor = document.getElementById(
      'optionEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;
    document.execCommand(
      'insertHTML',
      false,
      `<span class="latex-formula">$$${latex}$$</span>&nbsp;`,
    );
    if ((window as any).MathJax)
      (window as any).MathJax.typesetPromise([editor]);
  }

  getMatrixLeftKey(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getMatrixRightKey(index: number): string {
    return String.fromCharCode(80 + index);
  }

  toggleMatrixMatch(leftIndex: number, rightKey: string) {
    const group = this.matrixLeft.at(leftIndex) as FormGroup;
    const current = group.get('selectedMatches')?.value || [];
    if (current.includes(rightKey)) {
      group
        .get('selectedMatches')
        ?.setValue(current.filter((k: string) => k !== rightKey));
    } else {
      group.get('selectedMatches')?.setValue([...current, rightKey].sort());
    }
  }

  isMatrixMatched(leftIndex: number, rightKey: string): boolean {
    return (
      this.matrixLeft.at(leftIndex).get('selectedMatches')?.value || []
    ).includes(rightKey);
  }

  get allMatrixRightKeys(): string[] {
    return this.matrixRight.controls.map((_, i) => this.getMatrixRightKey(i));
  }

  execMatrixLeftCommand(index: number, command: string) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false);
  }

  insertMatrixLeftTable(index: number) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;
    let html =
      '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++)
        html += '<td style="padding:8px;border:1px solid #ddd"></td>';
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';
    document.execCommand('insertHTML', false, html);
  }

  insertMatrixLeftLatex(index: number) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;
    document.execCommand(
      'insertHTML',
      false,
      `<span class="latex-formula">$$${latex}$$</span>&nbsp;`,
    );
    if ((window as any).MathJax)
      (window as any).MathJax.typesetPromise([editor]);
  }

  execMatrixRightCommand(index: number, command: string) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false);
  }

  insertMatrixRightTable(index: number) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;
    let html =
      '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++)
        html += '<td style="padding:8px;border:1px solid #ddd">Cell</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';
    document.execCommand('insertHTML', false, html);
  }

  insertMatrixRightLatex(index: number) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index,
    ) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;
    document.execCommand(
      'insertHTML',
      false,
      `<span class="latex-formula">$$${latex}$$</span>&nbsp;`,
    );
    if ((window as any).MathJax)
      (window as any).MathJax.typesetPromise([editor]);
  }

  insertTable(editorId: string) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;
    let html =
      '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++)
        html += '<td style="padding:10px;border:1px solid #ddd"></td>';
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';
    document.execCommand('insertHTML', false, html);
  }

  insertLatex(editorId: string) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;
    editor.focus();
    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;
    document.execCommand(
      'insertHTML',
      false,
      `<span class="latex-formula">$$${latex}$$</span>&nbsp;`,
    );
    if ((window as any).MathJax)
      (window as any).MathJax.typesetPromise([editor]);
  }

  onPasteImage(event: ClipboardEvent, editorId: string) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const editor = document.getElementById(editorId) as HTMLDivElement;
          if (!editor) return;
          editor.focus();
          document.execCommand(
            'insertHTML',
            false,
            `<img src="${reader.result}" style="max-width:100%;height:auto;margin:8px 0;border-radius:4px;" />`,
          );
        };
        reader.readAsDataURL(file);
      }
    }
  }

  openPassagePopup(): void {
    this.showPassagePopup = true;
  }

  async onPassageSelected(passage: any): Promise<void> {
    const rawHtml = passage.passageHtml || passage.content || '';
    const processedHtml = await this.replaceDownloadUrls(rawHtml);
    this.questionForm.patchValue({
      passageId: passage._id || passage.passageId,
      passageText: processedHtml,
    });
    this.showPassagePopup = false;
  }

  closePassagePopup(): void {
    this.showPassagePopup = false;
  }

  openPreview(title: string, editorId: string): void {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    this.previewTitle = title;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(
      this.renderLatexInHtml(editor.innerHTML),
    );
    this.showPreviewModal = true;
  }

  openPreviewFromValue(title: string, formControlName: string): void {
    const value = this.questionForm.get(formControlName)?.value || '';
    if (!value) {
      this.alert.error('No content to preview');
      return;
    }
    this.previewTitle = title;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(
      this.renderLatexInHtml(value),
    );
    this.showPreviewModal = true;
  }

  private decodeHtmlEntities(text: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  private renderLatexInHtml(html: string): string {
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

  closePreview(): void {
    this.showPreviewModal = false;
    this.previewHtml = '';
    this.previewTitle = '';
  }

  logInvalidControls(form: FormGroup | FormArray, path: string = ''): void {
    Object.keys((form as any).controls).forEach((key) => {
      const control = form.get(key);
      const controlPath = path ? `${path}.${key}` : key;
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.logInvalidControls(control, controlPath);
      } else if (control?.invalid) {
        console.log('❌ Invalid control:', controlPath, control.errors);
      }
    });
  }

  // isFormReadyToSubmit(): boolean {
  //   if (this.questionForm.invalid) return false;
  //   const questionText = (this.questionForm.get('questionText')?.value || '').trim();
  // if (!questionText || questionText === '<br>' || questionText === '<div><br></div>') {
  //   return false;
  // }
  //   if (!this.isBankMode && !this.isEditMode) {
  //     if (!this.questionForm.get('sectionId')?.value) return false;
  //     if (!this.selectedSubjectId) return false;
  //   }
  //   if (this.isBankMode && !this.isEditMode) {
  //     if (!this.questionForm.get('bankSubjectId')?.value) return false;
  //     if (!this.questionForm.get('topicId')?.value?.trim()) return false;
  //     if (!this.questionForm.get('classNo')?.value) return false;
  //   }
  //   const qt = this.getSelectedQuestionType();
  //   if (qt === 'mcq_single' || qt === 'mcq_multi') {
  //     const correctCount = this.options.controls.filter(
  //       (c) => c.get('isCorrect')?.value,
  //     ).length;
  //     if (correctCount === 0) return false;
  //     if (qt === 'mcq_single' && correctCount > 1) return false;
  //   }
  //   if (qt === 'integer') {
  //     const val = this.questionForm.get('integerAnswer')?.value;
  //     if (val === null || val === undefined || val === '') return false;
  //     if (!Number.isInteger(Number(val))) return false;
  //   }
  //   if (qt === 'numeric') {
  //     const min = this.questionForm.get('numericMin')?.value;
  //     const max = this.questionForm.get('numericMax')?.value;
  //     if (
  //       min === null ||
  //       min === undefined ||
  //       max === null ||
  //       max === undefined
  //     )
  //       return false;
  //     if (parseFloat(min) > parseFloat(max)) return false;
  //   }
  //   if (qt === 'matrix') {
  //     const anyUnmatched = this.matrixLeft.controls.some(
  //       (c) => !c.get('selectedMatches')?.value?.length,
  //     );
  //     if (anyUnmatched) return false;
  //     if (this.matrixMarksExceeded()) return false;
  //   }
  //   if (this.mcqPartialMarksExceeded()) return false;
  //   return true;
  // }

  // isFormReadyToSubmit() — add manual content checks:

  isFormReadyToSubmit(): boolean {
    if (this.questionForm.invalid) return false;
    const qt = this.getSelectedQuestionType();
    const questionText = (this.questionForm.get('questionText')?.value || '')
      .replace(/<[^>]*>/g, '')
      .trim();
    if (!questionText) return false;
    if (this.isBankMode) {
      if (!this.questionForm.get('bankSubjectId')?.value) return false;
      if (!(this.questionForm.get('topicId')?.value || '').trim()) return false;
      if (!this.questionForm.get('classNo')?.value) return false;
    }
    if (!this.isBankMode && !this.isEditMode) {
      if (!this.questionForm.get('sectionId')?.value) return false;
    }
    if (['mcq_single', 'mcq_multi', 'passage_qns'].includes(qt)) {
      const filledOptions = this.options.controls.filter((c) => {
        const t = (c.get('text')?.value || '').replace(/<[^>]*>/g, '').trim();
        return !!t;
      });
      if (filledOptions.length < 2) return false;
      const correctCount = this.options.controls.filter(
        (c) => c.get('isCorrect')?.value,
      ).length;
      if (correctCount === 0) return false;
      if (qt === 'mcq_single' && correctCount > 1) return false;
    }
    if (qt === 'integer') {
      const val = this.questionForm.get('integerAnswer')?.value;
      if (val === null || val === undefined || val === '') return false;
      if (!Number.isInteger(Number(val))) return false;
    }
    if (qt === 'numeric') {
      const min = this.questionForm.get('numericMin')?.value;
      const max = this.questionForm.get('numericMax')?.value;
      if (
        min === null ||
        min === undefined ||
        max === null ||
        max === undefined
      )
        return false;
      if (parseFloat(min) > parseFloat(max)) return false;
    }
    if (qt === 'matrix') {
      const anyUnmatched = this.matrixLeft.controls.some(
        (c) => !c.get('selectedMatches')?.value?.length,
      );
      if (anyUnmatched) return false;
      if (this.matrixMarksExceeded()) return false;
    }
    if (this.mcqPartialMarksExceeded()) return false;
    return true;
  }

  get safePassageHtml(): SafeHtml {
    const html = this.questionForm.get('passageText')?.value || '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getLargerArray(): any[] {
    const count = Math.max(this.matrixLeft.length, this.matrixRight.length);
    return Array(count).fill(null);
  }
}
