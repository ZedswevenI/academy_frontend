import { Component, OnInit } from '@angular/core';
import katex from 'katex';
import { FormArray, FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
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
  selector: 'app-question-creator',
  standalone: false,
  templateUrl: './question-creator.component.html',
  styleUrls: ['./question-creator.component.scss']
})
export class QuestionCreatorComponent implements OnInit {
  questionForm!: FormGroup;
  showPassagePopup = false;
  testId = '';
  showPreviewModal = false;
  previewTitle = '';
  previewHtml: SafeHtml = '';

  isEditMode = false;
  isBankMode = false;

  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({ label: `Class ${i + 6}`, value: i + 6 })),
    { label: '12th Pass', value: 13 }
  ];
  recId: string = '';
  entiId: string;
  private imageUrlMap = new Map<string, string>();

  /* ================= EXAM CONTEXT ================= */
  examId = '';
  examData: any = null;
  sections: any[] = [];
  selectedSubjectId = '';

  /* ================= BANK MODE: SUBJECT / TOPIC / SUBTOPIC ================= */
  subjects: any[] = [];
  allTopics: any[] = [];
  allSubTopics: any[] = [];
  subjectOptions: any[] = [];
  topicOptions: any[] = [];
  subTopicOptions: any[] = [];

  /* ================= PASSAGES & TAGS ================= */
  passages: any[] = [];
  tagInput = '';
  tags: string[] = [];

  questionTypes = [
    { value: 'mcq_single', label: 'MCQ (Single Answer)' },
    { value: 'mcq_multi', label: 'MCQ (Multiple Answers)' },
    { value: 'integer', label: 'Integer' },
    { value: 'numeric', label: 'Numerical' },
    { value: 'subjective', label: 'Subjective Type' },
    { value: 'true_false', label: 'True/False' },
    { value: 'passae_qns', label: 'Text Based' },
    { value: 'matrix', label: 'Matrix Type (Match the Questions)' }
  ];

  constructor(private fb: FormBuilder, private breadcrump: BredcrumpService,
    private commonApi: CommonapiService, private alert: AlertService, private router: Router,
    private sanitizer: DomSanitizer) {
    this.initializeForm();

    const state: any = history.state;
    this.entiId = localStorage.getItem('tenantId') || '';

    if (state?.bank) {
      // Bank mode — no exam/section context
      this.isBankMode = true;
      if (state.question?.recId) {
        this.isEditMode = true;
        this.recId = state.question.recId;
        this.breadcrump.set([{ label: 'Exams' }, { label: 'Questions', link: '/app/exams/questions' }, { label: 'Edit Question' }]);
      } else {
        this.breadcrump.set([{ label: 'Exams' }, { label: 'Questions', link: '/app/exams/questions' }, { label: 'Add Question' }]);
      }
    } else if (state?.question) {
      this.testId = state.question.testId;
      this.examId = state.question.examId || state.question.testId || '';
      this.examData = state.question;
      this.sections = state.question.sections || [];

      if (state.question.recId) {
        this.isEditMode = true;
        this.recId = state.question.recId;
        this.breadcrump.set([{ label: 'Questions', link: '' }, { label: 'Edit Question' }]);
      } else {
        this.breadcrump.set([{ label: 'Questions', link: '' }, { label: 'Add Question' }]);
      }
    }

  }
  initializeForm() {
    this.questionForm = this.fb.group({
      sectionId: [''],
      questionId: [''],
      sortOrder: [1, [Validators.required, Validators.min(1)]],
      bankSubjectId: [''],
      classNo: [null, this.isBankMode ? Validators.required : null],
      topicId: [''],
      subTopicId: [''],
      enablePassage: [false],
      enableInstruction: [false],
      enableSolution: [false],
      questionType: ['mcq_single', Validators.required],
      questionText: ['', Validators.required],
      positiveMarks: [4, [Validators.required, Validators.min(0)]],
      negativeMarks: [1, [Validators.required, Validators.min(0)]],
      hasPartialMarking: [false],
      numericMin: [null],
      numericMax: [null],
      difficulty: ['medium'],
      questionOptions: this.fb.array([]),
      passageId: [null],
      passageText: [''],
      instruction: [''],
      solution: [''],
      trueFalseAnswer: [null],
      subjectiveAnswer: [''],
      matrixLeft: this.fb.array([]),
      matrixRight: this.fb.array([])
    });
  }

  onSectionChange(): void {
    const sectionId = this.questionForm.get('sectionId')?.value;
    const section = this.sections.find((s: any) => s.sectionId === sectionId);
    this.selectedSubjectId = section?.subjectId || '';
  }

  getSelectedSectionName(): string {
    const sectionId = this.questionForm.get('sectionId')?.value;
    const section = this.sections.find((s: any) => s.sectionId === sectionId);
    return section ? `${section.sectionName} (${section.sectionCode})` : '';
  }


  ngOnInit(): void {
    this.loadPassages();

    if (this.isBankMode) {
      this.loadBankMasters();
    }

    if (this.isEditMode) {
      this.loadQuestionForEdit();
    } else {
      this.addOption();
      this.addOption();
      this.addOption();
      this.addOption();
    }

    this.handleOptionalToggles();

    this.questionForm.get('questionType')?.valueChanges.subscribe(type => {
      this.onQuestionTypeChange(type);
    });
  }

  /* ================= BANK MODE MASTERS ================= */

  private loadBankMasters(): void {
    const body = { entiId: this.entiId };

    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => {
        this.subjects = res?.data || [];
        this.subjectOptions = this.subjects.map((s: any) => ({
          label: s.subjectName, value: s._id
        }));
      }
    });

    // this.commonApi.fetchData(body, 'ims/topic', 'list?list=full').subscribe({
    //   next: (res: any) => { this.allTopics = res?.data || []; }
    // });

    // this.commonApi.fetchData(body, 'ims/subtopic', 'list?list=full').subscribe({
    //   next: (res: any) => { this.allSubTopics = res?.data || []; }
    // });
  }

  onBankSubjectChange(subjectId: string): void {
    this.topicOptions = [];
    this.subTopicOptions = [];
    this.questionForm.patchValue({ topicId: '', subTopicId: '' });
    if (subjectId) {
      this.topicOptions = this.allTopics
        .filter((t: any) => (t.subjectId?._id || t.subjectId) === subjectId)
        .map((t: any) => ({ label: t.topicName, value: t.topicId }));
    }
  }

  onBankTopicChange(topicId: string): void {
    this.subTopicOptions = [];
    this.questionForm.patchValue({ subTopicId: '' });
    if (topicId) {
      this.subTopicOptions = this.allSubTopics
        .filter((st: any) => (st.topicId?.topicId || st.topicId) === topicId)
        .map((st: any) => ({ label: st.subTopicName, value: st.subTopicId }));
    }
  }

  /* ================= LOAD PASSAGES ================= */

  loadPassages(): void {
    this.commonApi.fetchData(
      { entiId: this.entiId },
      'exam/passage',
      'list?list=full&status=active'
    ).subscribe({
      next: (res: any) => {
        this.passages = res?.data || [];
      },
      error: () => this.alert.error('Error loading passages')
    });
  }

  /* ================= TAGS ================= */

  addTag(): void {
    const tag = this.tagInput.trim().toLowerCase();
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
    }
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
            'download'
          )
        );

        if (downloadRes?.status) {

          const hashedUrl = downloadRes.url;

          // 🔥 Store mapping
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

    const body = {
      entiId: this.entiId,
      recId: this.recId
    };

    try {
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(body, 'exam/questions', 'view')
      );

      if (res?.status) {

        const q = res.data;

        // 🔥 Replace image URLs
        const questionHtml = await this.replaceDownloadUrls(q.questionHtml);
        const instructionHtml = await this.replaceDownloadUrls(q.instructionHtml);
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
          passageId: q.passageId || null,
          passageText: q.passageHtml || '',
          instruction: instructionHtml,
          solution: solutionHtml,
          trueFalseAnswer: q.questionType === 'true_false' ? q.correctAnswer === 'true' : null,
          subjectiveAnswer: q.subjectiveAnswer || q.correctAnswer || '',
          bankSubjectId: q.subjectId || '',
          topicId: q.topicId || '',
          subTopicId: q.subTopicId || '',
          classNo: q.classNo || null
        });

        // Set selectedSubjectId from patched sectionId
        this.onSectionChange();

        // Inject into editor
        setTimeout(() => {
          const questionEditor = document.getElementById('questionEditor');
          if (questionEditor) {
            questionEditor.innerHTML = questionHtml || '';
          }

          // Inject subjective answer
          if (q.questionType === 'subjective' || q.questionType === 'integer' || q.questionType === 'numeric') {
            const subjectiveEditor = document.getElementById('subjectiveEditor');
            if (subjectiveEditor) {
              subjectiveEditor.innerHTML = q.subjectiveAnswer || q.correctAnswer || '';
            }
          }
        }, 0);

        // 🔥 Load options
        if (q.questionOptions?.length) {

          this.options.clear();

          for (let i = 0; i < q.questionOptions.length; i++) {

            const opt = q.questionOptions[i];
            const processedOptionHtml = await this.replaceDownloadUrls(opt.textHtml);

            this.options.push(
              this.fb.group({
                text: processedOptionHtml,
                isCorrect: opt.isCorrect || false
              })
            );

            setTimeout(() => {
              const optionEditor = document.getElementById('optionEditor-' + i);
              if (optionEditor) {
                optionEditor.innerHTML = processedOptionHtml || '';
              }
            }, 0);
          }
        }

        // Load matrix pairs
        if (q.questionType === 'matrix' && q.leftColumn?.length) {
          this.matrixLeft.clear();
          this.matrixRight.clear();

          // Parse correctAnswer: "A:PQ;B:R"
          const answerMap: Record<string, string[]> = {};
          if (q.correctAnswer) {
            q.correctAnswer.split(';').forEach((pStr: string) => {
              const [lK, rKs] = pStr.split(':');
              if (lK && rKs) {
                // If rKs is "PQ", split('') gives ["P", "Q"]
                // If it was comma separated like "P,Q", we'd need split(',')
                // Based on user feedback "A:Q", we'll assume no delimiter between right keys
                answerMap[lK] = rKs.split('');
              }
            });
          }

          for (let i = 0; i < q.leftColumn.length; i++) {
            const leftHtml = await this.replaceDownloadUrls(q.leftColumn[i]?.text || '');
            const rightHtml = await this.replaceDownloadUrls(q.rightColumn?.[i]?.text || '');
            const lKey = String.fromCharCode(65 + i);

            this.matrixLeft.push(this.fb.group({
              text: leftHtml,
              selectedMatches: [answerMap[lKey] || []]
            }));
            this.matrixRight.push(this.fb.group({ text: rightHtml }));

            setTimeout(() => {
              const leftEditor = document.getElementById('matrixLeftEditor-' + i);
              const rightEditor = document.getElementById('matrixRightEditor-' + i);
              if (leftEditor) leftEditor.innerHTML = leftHtml || '';
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

    // Passage
    this.questionForm.get('enablePassage')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.questionForm.patchValue({
          passageId: null,
          passageText: ''
        });
      }
    });

    // Instruction
    this.questionForm.get('enableInstruction')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.questionForm.patchValue({
          instruction: ''
        });
      }
    });

    // Solution
    this.questionForm.get('enableSolution')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.questionForm.patchValue({
          solution: ''
        });
      }
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
    const optionGroup = this.fb.group({
      text: ['', Validators.required],
      isCorrect: [false]
    });
    this.options.push(optionGroup);
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      this.options.removeAt(index);
    }
  }

  addMatrixPair(): void {
    this.matrixLeft.push(this.fb.group({ text: '', selectedMatches: [[]] }));
    this.matrixRight.push(this.fb.group({ text: '' }));
  }

  removeMatrixPair(index: number): void {
    if (this.matrixLeft.length > 1) {
      this.matrixLeft.removeAt(index);
      this.matrixRight.removeAt(index);
    }
  }

  onQuestionTypeChange(type: string): void {
    // Clear options if switching to/from matrix type
    if (type === 'matrix') {
      this.options.clear();
      if (this.matrixLeft.length === 0) {
        this.addMatrixPair();
        this.addMatrixPair();
        this.addMatrixPair();
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
    if (type === 'mcq-single') {
      // For single answer, uncheck all other options
      this.options.controls.forEach((control, i) => {
        if (i !== index) {
          control.get('isCorrect')?.setValue(false);
        }
      });
    }
  }

  getSelectedQuestionType(): string {
    return this.questionForm.get('questionType')?.value || 'mcq-single';
  }

  logInvalidControls(form: FormGroup | FormArray, path: string = ''): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      const controlPath = path ? `${path}.${key}` : key;

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.logInvalidControls(control, controlPath);
      } else {
        if (control?.invalid) {
          console.log('❌ Invalid control:', controlPath, control.errors);
        }
      }
    });
  }

  onSubmit(): void {

    if (!this.questionForm.valid) {
      this.questionForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    if (this.isBankMode) {
      this.submitBankQuestion();
      return;
    }

    if (!this.selectedSubjectId) {
      this.alert.error('Please select a section first');
      return;
    }

    this.prepareQuestionData().then(payload => {

      const formValue = this.questionForm.value;

      const finalPayload: any = {
        entiId: this.entiId,
        examId: this.examId,
        sectionId: formValue.sectionId,
        subjectId: this.selectedSubjectId,
        sortOrder: formValue.sortOrder,
        questionId: formValue.questionId || undefined,
        status: 'active',
        ...payload
      };

      if (this.isEditMode) {

        finalPayload['recId'] = this.recId;

        this.commonApi.fetchData(
          finalPayload,
          'exam/questions',
          'update'
        ).subscribe({
          next: (res: any) => {
            if (res?.status) {
              this.alert.success('Question updated successfully');
              this.goBackToQuestions();
            }
          },
          error: (err) => {
            this.alert.error(err.error?.message || 'Update failed');
          }
        });

      } else {

        this.commonApi.fetchData(
          finalPayload,
          'exam/questions',
          'create'
        ).subscribe({
          next: (res: any) => {
            if (res?.status) {
              this.alert.success('Question created successfully');
              this.goBackToQuestions();
            }
          },
          error: (err) => {
            this.alert.error(err.error?.message || 'Create failed');
          }
        });
      }
    });
  }

  private goBackToQuestions(): void {
    if (this.examId) {
      this.router.navigate(['/app/exams/exams/question-view'], {
        state: {
          questions: { examId: this.examId, testId: this.testId },
          source: (history.state as any)?.source
        }
      });
    } else {
      this.router.navigate(['/app/exams/exams']);
    }
  }

  private submitBankQuestion(): void {
    this.prepareQuestionData().then(payload => {
      const formValue = this.questionForm.value;

      const finalPayload: any = {
        entiId: this.entiId,
        subjectId: formValue.bankSubjectId || undefined,
        topicId: formValue.topicId || undefined,
        subTopicId: formValue.subTopicId || undefined,
        classNo: formValue.classNo || undefined,
        sortOrder: formValue.sortOrder,
        status: 'active',
        ...payload
      };

      this.commonApi.fetchData(
        finalPayload,
        'exam/questions/bank',
        'create'
      ).subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Question created successfully');
            this.router.navigate(['/app/exams/questions']);
          }
        },
        error: (err) => {
          this.alert.error(err.error?.message || 'Create failed');
        }
      });
    });
  }

  execCommandFor(editorId: string, command: string, value: string | null = null) {
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
    if (!target) return;

    this.questionForm.patchValue({
      [controlName]: target.innerHTML
    });
  }

  onOptionEditorInput(index: number, event: Event) {
    const optionGroup = this.options.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    optionGroup.patchValue({
      text: target.innerHTML
    });
  }

  onMatrixRightEditorInput(index: number, event: Event) {
    const optionGroup = this.matrixRight.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    optionGroup.patchValue({
      text: target.innerHTML
    });
  }

  onMatrixLeftEditorInput(index: number, event: Event) {
    const optionGroup = this.matrixLeft.at(index) as FormGroup;
    const target = event.target as HTMLDivElement;
    optionGroup.patchValue({
      text: target.innerHTML
    });
  }

  extractBase64Images(html: string): { images: string[]; cleanedHtml: string } {
    const images: string[] = [];
    let cleanedHtml = html;

    const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/g;

    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }

    return { images, cleanedHtml };
  }


  async prepareFile(base64: string): Promise<File> {

    const compressed = await this.compressBase64Image(base64, 60);

    const arr = compressed.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], `img-${Date.now()}.jpg`, { type: mime });
  }

  base64SizeKB(base64: string): number {
    const base64String = base64.split(',')[1];
    const padding = (base64String.match(/=+$/) || [''])[0].length;
    const sizeInBytes = (base64String.length * 3) / 4 - padding;
    return sizeInBytes / 1024;
  }

  compressBase64Image(base64: string, maxSizeKB = 50): Promise<string> {
    return new Promise((resolve, reject) => {

      const img = new Image();

      img.onload = () => {

        let width = img.width;
        let height = img.height;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject('Canvas not supported');
          return;
        }

        let quality = 0.8;
        let compressed = base64;
        let attempts = 0;

        while (attempts < 15) {

          canvas.width = width;
          canvas.height = height;

          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          compressed = canvas.toDataURL('image/jpeg', quality);

          const sizeKB = this.base64SizeKB(compressed);

          if (sizeKB <= maxSizeKB) {
            resolve(compressed);
            return;
          }

          // 🔥 First reduce quality
          if (quality > 0.3) {
            quality -= 0.1;
          }
          // 🔥 Then reduce dimensions
          else {
            width *= 0.9;
            height *= 0.9;
          }

          attempts++;
        }

        resolve(compressed); // fallback
      };

      img.onerror = () => reject('Image load failed');

      img.src = base64;
    });
  }

  async uploadImage(base64: string): Promise<string | null> {
    try {
      const file = await this.prepareFile(base64);

      const formData = new FormData();
      formData.append('files', file); // important: key must match backend
      const res: any = await firstValueFrom(
        this.commonApi.uploadImage(formData, 'exam/questions', 'upload-image')
      );
      if (res?.status && res?.files?.length) {
        return res.files[0].s3Url;
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // async replaceImagesWithUrls(html: string): Promise<string> {    
  //   const { images } = this.extractBase64Images(html);
  //   let updatedHtml = html;
  //   for (const base64 of images) {
  //     const imageUrl = await this.uploadImage(base64);
  //     updatedHtml = updatedHtml.replace(
  //       base64,
  //       imageUrl || ''
  //     );
  //   }
  //   return updatedHtml;
  // }

  async replaceImagesWithUrls(html: string): Promise<string> {

    if (!html || !html.includes('<img')) return html;

    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;

    let updatedHtml = html;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {

      const currentSrc = match[1];

      // 🔥 New image (base64)
      if (currentSrc.startsWith('data:image')) {

        const uploadRes = await this.uploadImage(currentSrc);
        if (uploadRes) {
          updatedHtml = updatedHtml.replace(
            `src="${currentSrc}"`,
            `src="${uploadRes}"`
          );
        }
      }

      // 🔥 Hashed preview (edit mode)
      else if (this.imageUrlMap.has(currentSrc)) {

        const originalUrl = this.imageUrlMap.get(currentSrc);
        updatedHtml = updatedHtml.replace(
          `src="${currentSrc}"`,
          `src="${originalUrl}"`
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

  /* ================= EXTRACT IMAGE URLS FROM HTML ================= */

  private extractImageUrls(html: string): { url: string; label: string; order: number }[] {
    if (!html || !html.includes('<img')) return [];
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const images: { url: string; label: string; order: number }[] = [];
    let match;
    let order = 0;
    while ((match = imgRegex.exec(html)) !== null) {
      if (!match[1].startsWith('data:image')) {
        images.push({ url: match[1], label: `fig${order + 1}`, order: order++ });
      }
    }
    return images;
  }

  async prepareQuestionData(): Promise<any> {
    const formValue = this.questionForm.value;
    const questionType = formValue.questionType;

    // Process common rich-text fields
    const questionText = await this.replaceImagesWithUrls(formValue.questionText);
    const instruction = await this.replaceImagesWithUrls(formValue.instruction);
    const solution = await this.replaceImagesWithUrls(formValue.solution);

    const questionHtml = this.restoreOriginalUrls(questionText);
    const instructionHtml = this.restoreOriginalUrls(instruction);
    const solutionHtml = this.restoreOriginalUrls(solution);

    // Passage
    const passageId = formValue.enablePassage ? formValue.passageId : null;
    const selectedPassage = passageId ? this.passages.find((p: any) => p._id === passageId || p.passageId === passageId) : null;
    const passageHtml = selectedPassage?.passageHtml || '';

    // Collect all images from question + options + solution
    const allImages = [
      ...this.extractImageUrls(questionHtml),
      ...this.extractImageUrls(solutionHtml)
    ];

    const baseData: any = {
      enablePassage: formValue.enablePassage,
      enableInstruction: formValue.enableInstruction,
      enableSolution: formValue.enableSolution,
      questionType: questionType,
      instructionHtml: instructionHtml,
      solutionHtml: solutionHtml,
      questionHtml: questionHtml,
      positiveMarks: formValue.positiveMarks,
      negativeMarks: formValue.negativeMarks,
      hasPartialMarking: formValue.hasPartialMarking,
      difficulty: formValue.difficulty,
      tags: this.tags,
      passageId: passageId,
      passageHtml: passageHtml,
      images: allImages
    };

    // Numeric tolerance
    if (questionType === 'numeric') {
      baseData.numericMin = formValue.numericMin;
      baseData.numericMax = formValue.numericMax;
    } else {
      baseData.numericMin = null;
      baseData.numericMax = null;
    }

    switch (questionType) {

      /* ================= MCQ ================= */
      case 'mcq_single':
      case 'mcq_multi': {
        const processedOptions = await Promise.all(
          formValue.questionOptions.map(async (opt: any, idx: number) => {
            const replaced = await this.replaceImagesWithUrls(opt.text);
            const restored = this.restoreOriginalUrls(replaced);
            const key = String.fromCharCode(65 + idx); // A, B, C, D...

            return {
              key: key,
              textHtml: restored,
              isCorrect: opt.isCorrect,
              partialMark: 0
            };
          })
        );

        // Collect images from options too
        processedOptions.forEach(opt => {
          allImages.push(...this.extractImageUrls(opt.textHtml));
        });
        baseData.images = allImages;

        const correctKeys = processedOptions
          .filter(opt => opt.isCorrect)
          .map(opt => opt.key);

        return {
          ...baseData,
          questionOptions: processedOptions,
          correctAnswer: correctKeys.join(';')
        };
      }

      /* ================= TRUE / FALSE ================= */
      case 'true_false':
        return {
          ...baseData,
          correctAnswer: formValue.trueFalseAnswer,
          questionOptions: []
        };

      /* ================= SUBJECTIVE / INTEGER / NUMERIC ================= */
      case 'integer':
      case 'numeric':
      case 'subjective': {
        const sampleAnswer = await this.replaceImagesWithUrls(formValue.subjectiveAnswer);

        return {
          ...baseData,
          correctAnswer: sampleAnswer,
          questionOptions: []
        };
      }

      /* ================= TEXT BASED ================= */
      case 'passage_qns':
        return {
          ...baseData,
          questionOptions: []
        };

      /* ================= MATRIX ================= */
      case 'matrix': {
        const leftColumn = await Promise.all(
          formValue.matrixLeft.map(async (item: any, i: number) => ({
            ...item,
            key: String.fromCharCode(65 + i), // A, B, C, D...
            text: await this.replaceImagesWithUrls(item.text)
          }))
        );

        const rightColumn = await Promise.all(
          formValue.matrixRight.map(async (item: any, i: number) => ({
            ...item,
            key: String.fromCharCode(80 + i), // P, Q, R, S... (P=80)
            text: await this.replaceImagesWithUrls(item.text)
          }))
        );

        const correctPairs = leftColumn.map((item, i) => {
          const lKey = item.key;
          const selectedKeys = (item.selectedMatches || []).join('');
          return `${lKey}:${selectedKeys}`;
        });

        return {
          ...baseData,
          leftColumn,
          rightColumn,
          correctAnswer: correctPairs.join(';'),
          questionOptions: []
        };
      }

      default:
        return { ...baseData, questionOptions: [] };
    }
  }

  resetForm(): void {
    this.questionForm.reset({
      questionType: 'mcq-single',
      marks: 1,
      difficulty: 'medium'
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
    const editor = document.getElementById('optionEditor-' + index) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, '');
  }

  insertOptionTable(index: number) {
    const editor = document.getElementById('optionEditor-' + index) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let i = 0; i < +rows; i++) {
      html += '<tr>';
      for (let j = 0; j < +cols; j++) {
        html += '<td style="padding:8px;border:1px solid #ddd"></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }

  insertOptionLatex(index: number) {
    const editor = document.getElementById('optionEditor-' + index) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;

    const html =
      `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;

    document.execCommand('insertHTML', false, html);

    // If using MathJax
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
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
      group.get('selectedMatches')?.setValue(current.filter((k: string) => k !== rightKey));
    } else {
      group.get('selectedMatches')?.setValue([...current, rightKey].sort());
    }
  }

  isMatrixMatched(leftIndex: number, rightKey: string): boolean {
    const current = this.matrixLeft.at(leftIndex).get('selectedMatches')?.value || [];
    return current.includes(rightKey);
  }

  get allMatrixRightKeys(): string[] {
    return this.matrixRight.controls.map((_, i) => this.getMatrixRightKey(i));
  }

  execMatrixLeftCommand(index: number, command: string) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();
    document.execCommand(command, false);
  }

  insertMatrixLeftTable(index: number) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++) {
        html += '<td style="padding:8px;border:1px solid #ddd"></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }

  insertMatrixLeftLatex(index: number) {
    const editor = document.getElementById(
      'matrixLeftEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;

    const html = `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;
    document.execCommand('insertHTML', false, html);

    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
  }

  execMatrixRightCommand(index: number, command: string) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();
    document.execCommand(command, false);
  }
  insertMatrixRightTable(index: number) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++) {
        html += '<td style="padding:8px;border:1px solid #ddd">Cell</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    document.execCommand('insertHTML', false, html);
  }


  insertMatrixRightLatex(index: number) {
    const editor = document.getElementById(
      'matrixRightEditor-' + index
    ) as HTMLDivElement | null;

    if (!editor) return;

    editor.focus();

    const latex = prompt('Enter LaTeX:', '');
    if (!latex) return;

    const html = `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;
    document.execCommand('insertHTML', false, html);

    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
  }

  insertTable(editorId: string) {
    const editor = document.getElementById(editorId) as HTMLDivElement | null;
    if (!editor) return;

    editor.focus();

    const rows = prompt('Rows?', '2');
    const cols = prompt('Columns?', '2');
    if (!rows || !cols) return;

    let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < +rows; r++) {
      html += '<tr>';
      for (let c = 0; c < +cols; c++) {
        html += '<td style="padding:10px;border:1px solid #ddd"></td>';
      }
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

    const html = `<span class="latex-formula">$$${latex}$$</span>&nbsp;`;
    document.execCommand('insertHTML', false, html);

    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise([editor]);
    }
  }



  onPasteImage(event: ClipboardEvent, editorId: string) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 🔥 Detect image
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault(); // stop default paste

        const file = item.getAsFile();
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
          const editor = document.getElementById(editorId) as HTMLDivElement;
          if (!editor) return;

          editor.focus();

          // Insert image HTML
          const imgHtml = `
          <img 
            src="${reader.result}" 
            style="max-width:100%; height:auto; margin:8px 0; border-radius:4px;" 
          />
        `;

          document.execCommand('insertHTML', false, imgHtml);
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
      passageText: processedHtml
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
      this.renderLatexInHtml(editor.innerHTML)
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
      this.renderLatexInHtml(value)
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
    // Replace \[...\] (display math)
    let result = html.replace(/\\\[([\s\S]+?)\\\]/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: true });
      } catch (e) { return match; }
    });
    // Replace $$...$$ (display math)
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: true });
      } catch (e) { return match; }
    });
    // Replace \(...\) (inline math)
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: false });
      } catch (e) { return match; }
    });
    // Replace $...$ (inline math)
    result = result.replace(/\$([^$]+?)\$/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: false });
      } catch (e) { return match; }
    });
    return result;
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.previewHtml = '';
    this.previewTitle = '';
  }

}