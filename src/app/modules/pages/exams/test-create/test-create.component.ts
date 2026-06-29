import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-exam-create',
  standalone: false,
  templateUrl: './test-create.component.html',
  styleUrl: './test-create.component.scss',
})
export class TestCreateComponent implements OnInit {
  isEditMode = false;
  isDuplicateMode = false;
  examId = '';
  editData: any = null;
  tenantId = '';
  loading = false;
  withQuestions = true;
  examForm!: FormGroup;
  subjects: any[] = [];
  instructions: any[] = [];
  testTypeOptions = [
    { label: 'Practice', value: 'practice' },
  ];
  mediumOptions = [
    { label: 'English', value: 'en' },
    { label: 'Tamil', value: 'ta' },
  ];
  calculatorOptions = [
    { label: 'None', value: 'none' },
    { label: 'Normal', value: 'normal' },
    { label: 'Scientific', value: 'scientific' },
  ];
  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({
      label: `Class ${i + 6}`,
      value: i + 6,
    })),
    { label: '12th Pass', value: 13 },
  ];
  examCodeLoading = false;
  minDateTime = '';

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {
    const state: any = history.state;
    this.tenantId = localStorage.getItem('tenantId') || '';

    if (state?.test && state?.duplicate) {
      this.isDuplicateMode = true;
      this.editData = state.test;
      this.withQuestions = state.withQuestions !== false;
      this.breadcrumb.set([
        { label: 'Exams', link: '/app/exams/exams' },
        { label: 'Duplicate' },
      ]);
    } else if (state?.test) {
      this.isEditMode = true;
      this.examId = state.test.examId || '';
      this.editData = state.test;
      this.breadcrumb.set([
        { label: 'Exams', link: '/app/exams/exams' },
        { label: 'Edit' },
      ]);
    } else {
      this.breadcrumb.set([
        { label: 'Exams', link: '/app/exams/exams' },
        { label: 'Create' },
      ]);
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  private loadNextExamCode(): void {
    if (this.isEditMode) return;
  this.examCodeLoading = true;
  this.commonApi.fetchData(
    { entiId: this.tenantId },
    'exam', 'next-code'
  ).subscribe({
    next: (res: any) => {
      this.examCodeLoading = false;
      if (res?.status) {
        this.examForm.patchValue({ examCode: res.examCode });
      }
    },
    error: () => { this.examCodeLoading = false; }
  });
}

  private initForm(): void {
    this.minDateTime = this.isEditMode ? '' : this.toDatetimeLocal(Date.now());
    this.examForm = this.fb.group(
      {
        examCode: ['', Validators.required],
        examName: ['', Validators.required],
        password: [
          '',
          this.isEditMode
            ? [Validators.minLength(6), Validators.maxLength(10)]
            : [
                Validators.required,
                Validators.minLength(6),
                Validators.maxLength(10),
              ],
        ],
        description: [''],
        testType: ['practice', Validators.required],
        medium: ['en', Validators.required],
        duration: [180, [Validators.required, Validators.min(1)]],
        totalMarks: [0, [Validators.required, Validators.min(0)]],
        totalQuestions: [0, [Validators.required, Validators.min(0)]],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
        autoPublishAt: [''],
        instructionId: [''],
        calculatorType: ['none'],
        classNo: [null, Validators.required],
        sections: this.fb.array([]),
      },
      { validators: this.dateValidators.bind(this) },
    );
  }

  private dateValidators(group: AbstractControl): ValidationErrors | null {
    const startTime = group.get('startTime')?.value;
    const endTime = group.get('endTime')?.value;
    const autoPublishAt = group.get('autoPublishAt')?.value;
    const errors: ValidationErrors = {};
    if (!this.isEditMode && startTime) {
      const startTs = new Date(startTime).getTime();
      if (startTs <= Date.now()) {
        errors['startTimeNotFuture'] = true;
      }
    }
    if (!this.isEditMode && endTime) {
      const endTs = new Date(endTime).getTime();
      if (endTs <= Date.now()) {
        errors['endTimeNotFuture'] = true;
      }
    }
    if (startTime && endTime) {
      const startTs = new Date(startTime).getTime();
      const endTs = new Date(endTime).getTime();
      if (endTs <= startTs) {
        errors['endBeforeStart'] = true;
      }
    }
    if (autoPublishAt && endTime) {
      const publishTs = new Date(autoPublishAt).getTime();
      const endTs = new Date(endTime).getTime();
      if (publishTs < endTs) {
        errors['publishBeforeEnd'] = true;
      }
    }
    return Object.keys(errors).length ? errors : null;
  }

  get dateErrors(): ValidationErrors | null {
    return this.examForm?.errors;
  }

  get sections(): FormArray {
    return this.examForm.get('sections') as FormArray;
  }

  addSection(): void {
    this.sections.push(
      this.fb.group({
        sectionId: [''],
        sectionCode: ['', Validators.required],
        sectionName: ['', Validators.required],
        subjectId: ['', Validators.required],
        numberOfQuestions: [0, [Validators.required, Validators.min(1)]],
        sortOrder: [this.sections.length],
      }),
    );
  }

  removeSection(index: number): void {
    if (this.sections.length > 1) {
      this.sections.removeAt(index);
      this.sections.controls.forEach((c, i) => c.get('sortOrder')?.setValue(i));
    }
  }

  onSectionSubjectChange(index: number): void {
    const section = this.sections.at(index) as FormGroup;
    const subjectId = section.get('subjectId')?.value;
    if (!subjectId) return;
    const duplicate = this.sections.controls.some(
      (c, i) => i !== index && c.get('subjectId')?.value === subjectId,
    );
    if (duplicate) {
      this.alert.error('This subject is already added in another section');
      section.patchValue({ subjectId: '', sectionCode: '', sectionName: '' });
      return;
    }
    const subject = this.subjects.find((s: any) => s._id === subjectId);
    if (subject) {
      section.patchValue({
        sectionCode: subject.subjectCode || '',
        sectionName: subject.subjectName || '',
      });
    }
  }

  hasDuplicateSubjects(): boolean {
    const ids = this.sections.controls
      .map((c) => c.get('subjectId')?.value)
      .filter((v) => !!v);
    return new Set(ids).size !== ids.length;
  }

  get sectionQuestionsTotal(): number {
    return this.sections.controls.reduce(
      (sum, c) => sum + (Number(c.get('numberOfQuestions')?.value) || 0),
      0,
    );
  }

  private async loadInitialData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([this.loadSubjects(), this.loadInstructions()]);
      if ((this.isEditMode || this.isDuplicateMode) && this.editData) {
        this.populateFormForEdit();
      } else {
        this.addSection();
        this.loadNextExamCode()
      }
    } catch (e) {
      this.alert.error('Error loading data');
    } finally {
      this.loading = false;
    }
  }

  private loadSubjects(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.subjects = res?.data || [];
            resolve();
          },
          error: (err: any) => {
            this.alert.error(err?.error?.message || 'Error loading subjects');
            reject(err);
          },
        });
    });
  }

  private loadInstructions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.commonApi
        .fetchData(
          { entiId: this.tenantId },
          'exam/instruction',
          'list?list=full',
        )
        .subscribe({
          next: (res: any) => {
            this.instructions = res?.data || [];
            resolve();
          },
          error: (err: any) => {
            this.alert.error(
              err?.error?.message || 'Error loading instructions',
            );
            reject(err);
          },
        });
    });
  }

  private populateFormForEdit(): void {
    const d = this.editData;
    this.examForm.patchValue({
      examCode: this.isDuplicateMode ? '' : d.examCode,
      examName: d.examName,
      password: this.isDuplicateMode ? '' : d.password || '',
      description: d.description || '',
      testType: d.testType,
      medium: d.medium,
      duration: d.duration,
      totalMarks: d.totalMarks,
      totalQuestions: d.totalQuestions,
      startTime: this.toDatetimeLocal(d.startTime),
      endTime: this.toDatetimeLocal(d.endTime),
      autoPublishAt: d.autoPublishAt
        ? this.toDatetimeLocal(d.autoPublishAt)
        : '',
      instructionId: d.instructionId?._id || d.instructionId || '',
      calculatorType: d.calculatorType || 'none',
      classNo: d.classNo || null,
    });
    this.sections.clear();
    (d.sections || []).forEach((s: any) => {
      this.sections.push(
        this.fb.group({
          sectionId: [s.sectionId],
          sectionCode: [s.sectionCode, Validators.required],
          sectionName: [s.sectionName, Validators.required],
          subjectId: [s.subjectId?._id || s.subjectId, Validators.required],
          numberOfQuestions: [
            s.numberOfQuestions,
            [Validators.required, Validators.min(1)],
          ],
          sortOrder: [s.sortOrder],
        }),
      );
    });
    if (!this.sections.length) this.addSection();
  }

  private toDatetimeLocal(ts: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toTimestamp(datetimeLocal: string): number | null {
    if (!datetimeLocal) return null;
    return new Date(datetimeLocal).getTime();
  }

  submitExam(): void {
    this.examForm.markAllAsTouched();
    if (this.dateErrors?.['startTimeNotFuture']) {
      this.alert.error('Start time must be in the future');
      return;
    }
    if (this.dateErrors?.['endTimeNotFuture']) {
      this.alert.error('End time must be in the future');
      return;
    }
    if (this.dateErrors?.['endBeforeStart']) {
      this.alert.error('End time must be after start time');
      return;
    }
    if (this.dateErrors?.['publishBeforeEnd']) {
      this.alert.error('Auto publish time must be after end time');
      return;
    }
    if (this.hasDuplicateSubjects()) {
      this.alert.error('Each section must have a unique subject');
      return;
    }
    const totalQ = Number(this.examForm.get('totalQuestions')?.value) || 0;
    if (totalQ > 0 && this.sectionQuestionsTotal !== totalQ) {
      this.alert.error(
        `Section questions total (${this.sectionQuestionsTotal}) does not match Total Questions (${totalQ})`,
      );
      return;
    }
    if (this.examForm.invalid) {
      this.alert.error('Please fill all required fields');
      return;
    }
    const f = this.examForm.getRawValue();
    const payload: any = {
      entiId: this.tenantId,
      examCode: f.examCode,
      examName: f.examName,
      password: f.password || undefined,
      description: f.description || undefined,
      testType: f.testType,
      medium: f.medium,
      duration: f.duration,
      totalMarks: f.totalMarks,
      totalQuestions: f.totalQuestions,
      startTime: this.toTimestamp(f.startTime),
      endTime: this.toTimestamp(f.endTime),
      autoPublishAt: this.toTimestamp(f.autoPublishAt) || null,
      instructionId: f.instructionId || undefined,
      calculatorType: f.calculatorType,
      classNo: f.classNo || null,
      sections: f.sections.map((s: any) => ({
        ...(s.sectionId ? { sectionId: s.sectionId } : {}),
        sectionCode: s.sectionCode,
        sectionName: s.sectionName,
        subjectId: s.subjectId,
        numberOfQuestions: s.numberOfQuestions,
        sortOrder: s.sortOrder,
      })),
    };
    if (this.isEditMode) {
      payload.examId = this.examId;
      this.commonApi.fetchData(payload, 'exam', 'update').subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Exam updated successfully');
            this.router.navigate(['/app/exams/exams/view'], {
              state: { exam: res.data },
            });
          }
        },
        error: (err: any) =>
          this.alert.error(err?.error?.message || 'Error updating exam'),
      });
    } else if (this.isDuplicateMode && this.withQuestions) {
      payload.refExamId = this.editData?.examId;
      this.commonApi.fetchData(payload, 'exam', 'duplicate').subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Exam duplicated successfully');
            this.router.navigate(['/app/exams/exams/view'], {
              state: { exam: res.data },
            });
          }
        },
        error: (err: any) =>
          this.alert.error(err?.error?.message || 'Error duplicating exam'),
      });
    } else {
      this.commonApi.fetchData(payload, 'exam', 'create').subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Exam created successfully');
            this.router.navigate(['/app/exams/exams/view'], {
              state: { exam: res.data },
            });
          }
        },
        error: (err: any) =>
          this.alert.error(err?.error?.message || 'Error creating exam'),
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/app/exams/exams']);
  }
}
