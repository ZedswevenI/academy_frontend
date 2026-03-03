import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-ass-create',
  standalone: false,
  templateUrl: './test-create.component.html',
  styleUrl: './test-create.component.scss'
})
export class TestCreateComponent implements OnInit {

  isEditMode = false;
  testId:   string = '';
  editData: any    = null;
  tenantId: string = '';

  private isPopulating = false;

  testForm!: FormGroup;

  classes = [
    { label: '6th',       value: 6  },
    { label: '7th',       value: 7  },
    { label: '8th',       value: 8  },
    { label: '9th',       value: 9  },
    { label: '10th',      value: 10 },
    { label: '11th',      value: 11 },
    { label: '12th',      value: 12 },
    { label: '12th Pass', value: 13 }
  ];

  subjects:          any[] = [];
  topics:            any[] = [];
  subTopics:         any[] = [];
  examCategories:    any[] = [];
  examSubCategories: any[] = [];

  allExamSubCategories: any[] = [];

  loading          = false;
  loadingTopics    = false;
  loadingSubTopics = false;

  constructor(
    private breadcrump: BredcrumpService,
    private router:     Router,
    private fb:         FormBuilder,
    private commonApi:  CommonapiService,
    private alert:      AlertService,
    private cdr:        ChangeDetectorRef
  ) {
    const state: any = history.state;
    this.tenantId = localStorage.getItem('tenantId') || '';

    if (state?.test) {
      this.isEditMode = true;
      this.testId     = state.test.testId || state.test;
      this.editData   = state.test;
      this.breadcrump.set([{ label: 'Assignment', link: '/app/assignment' }, { label: 'Edit' }]);
    } else {
      this.breadcrump.set([{ label: 'Assignment', link: '/app/assignment' }, { label: 'Create' }]);
    }
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  private initializeForm(): void {
    this.testForm = this.fb.group({
      classNo:           [6,  Validators.required],
      subjectId:         ['', Validators.required],
      topicId:           [''],
      subTopicId:        [''],
      categoryId:        ['', Validators.required],
      subCategoryId:     ['', Validators.required],
      testNumber:        ['', Validators.required],
      testCode:          ['', Validators.required],
      numberOfQuestions: [0,  [Validators.required, Validators.min(1)]],
      status:            ['active']
    });

    this.setupValueChangeListeners();
  }

  private setupValueChangeListeners(): void {
    // Subject changes → reload topics
    this.testForm.get('subjectId')?.valueChanges.subscribe(subjectId => {
      if (this.isPopulating) return;
      this.resetTopics();
      if (subjectId) this.loadTopics();
    });

    // Class changes → reload topics (subject must already be selected)
    this.testForm.get('classNo')?.valueChanges.subscribe(() => {
      if (this.isPopulating) return;
      this.resetTopics();
      const subjectId = this.testForm.get('subjectId')?.value;
      if (subjectId) this.loadTopics();
    });

    // Topic changes → reload subtopics
    this.testForm.get('topicId')?.valueChanges.subscribe(topicId => {
      if (this.isPopulating) return;
      this.resetSubTopics();
      if (topicId) this.loadSubTopics(topicId);
    });

    // Category changes → filter subcategories client-side
    this.testForm.get('categoryId')?.valueChanges.subscribe(categoryId => {
      if (this.isPopulating) return;
      this.examSubCategories = [];
      this.testForm.patchValue({ subCategoryId: '' }, { emitEvent: false });
      if (categoryId) {
        this.examSubCategories = this.allExamSubCategories.filter(
          (s: any) => s.categoryId === categoryId
        );
      }
    });
  }

  private resetTopics(): void {
    this.topics    = [];
    this.subTopics = [];
    this.testForm.patchValue({ topicId: '', subTopicId: '' }, { emitEvent: false });
  }

  private resetSubTopics(): void {
    this.subTopics = [];
    this.testForm.patchValue({ subTopicId: '' }, { emitEvent: false });
  }

  // ── Initial load ───────────────────────────────────────────────────────────

  private async loadInitialData(): Promise<void> {
    try {
      this.loading = true;
      await Promise.all([
        this.loadSubjects(),
        this.loadExamCategories(),
        this.loadAllExamSubCategories()
      ]);

      if (this.isEditMode && this.editData) {
        await this.populateFormForEdit();
      }
    } catch (e) {
      this.alert.error('Error loading data');
    } finally {
      this.loading = false;
    }
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  private async populateFormForEdit(): Promise<void> {
    const data = this.editData;

    // subjectId may arrive as object { _id, subjectName } or plain string
    const subjectId = typeof data.subjectId === 'object'
      ? data.subjectId._id
      : data.subjectId;

    // classNo from API is a number, form control also stores number — keep as Number()
    const classNo = Number(data.classNo);

    // ── Step 1: patch all non-dependent fields first ───────────────────────
    this.isPopulating = true;
    this.testForm.patchValue({
      classNo:           classNo,
      subjectId:         subjectId,
      categoryId:        data.categoryId,
      testNumber:        data.testNo || data.testNumber,
      testCode:          data.testCode,
      numberOfQuestions: data.numberOfQuestions,
      status:            data.status ?? 'active'
    });
    this.isPopulating = false;

    // ── Step 2: populate exam subcategory options (client-side) ───────────
    this.examSubCategories = this.allExamSubCategories.filter(
      (s: any) => s.categoryId === data.categoryId
    );

    // ── Step 3: load topics from API (awaited so options exist before patch)
    await this.loadTopicsAsync(classNo, subjectId);

    // ── Step 4: load subtopics from API (awaited)  ─────────────────────────
    if (data.topicId) {
      await this.loadSubTopicsAsync(data.topicId);
    }

    // ── Step 5: detectChanges so Angular renders all <option> nodes NOW ────
    this.cdr.detectChanges();

    // ── Step 6: patch the child dropdowns — options exist in DOM ──────────
    this.isPopulating = true;
    this.testForm.patchValue({
      topicId:       data.topicId       ?? '',
      subTopicId:    data.subTopicId    ?? '',
      subCategoryId: data.subCategoryId ?? ''
    });
    this.isPopulating = false;

    // Final detectChanges to reflect patched values in view
    this.cdr.detectChanges();

    this.disableEditModeFields();
  }

private disableEditModeFields(): void {
    ['classNo','subjectId','topicId','subTopicId',
     'categoryId','subCategoryId','testNumber','testCode']
      .forEach(f => this.testForm.get(f)?.disable({ emitEvent: false }));
  }

  // ── Topic loaders ──────────────────────────────────────────────────────────

  /** Observable version — used by valueChanges listeners in create mode */
  private loadTopics(): void {
    const classNo   = Number(this.testForm.get('classNo')?.value);
    const subjectId = this.testForm.get('subjectId')?.value;
    if (!classNo || !subjectId) return;

    this.loadingTopics = true;
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims/topic',
        `list?classNo=${classNo}&subjectId=${subjectId}&list=full`)
      .subscribe({
        next:  (res: any) => { this.topics = res?.data || []; this.loadingTopics = false; },
        error: ()         => { this.alert.error('Error loading topics'); this.loadingTopics = false; }
      });
  }

  /** Promise version — used in edit mode so we can await completion */
  private loadTopicsAsync(classNo: number, subjectId: string): Promise<void> {
    this.loadingTopics = true;
    return new Promise((resolve, reject) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'ims/topic',
          `list?classNo=${classNo}&subjectId=${subjectId}&list=full`)
        .subscribe({
          next: (res: any) => {
            this.topics        = res?.data || [];
            this.loadingTopics = false;
            resolve();
          },
          error: (err: any) => {
            this.alert.error('Error loading topics');
            this.loadingTopics = false;
            reject(err);
          }
        });
    });
  }

  // ── SubTopic loaders ───────────────────────────────────────────────────────

  /** Observable version — used by valueChanges listeners in create mode */
  private loadSubTopics(topicId: string): void {
    this.loadingSubTopics = true;
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims/subtopic', `list?topicId=${topicId}`)
      .subscribe({
        next:  (res: any) => { this.subTopics = res?.data || []; this.loadingSubTopics = false; },
        error: ()         => { this.alert.error('Error loading subtopics'); this.loadingSubTopics = false; }
      });
  }

  /** Promise version — used in edit mode so we can await completion */
  private loadSubTopicsAsync(topicId: string): Promise<void> {
    this.loadingSubTopics = true;
    return new Promise((resolve, reject) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'ims/subtopic', `list?topicId=${topicId}`)
        .subscribe({
          next: (res: any) => {
            this.subTopics         = res?.data || [];
            this.loadingSubTopics  = false;
            resolve();
          },
          error: (err: any) => {
            this.alert.error('Error loading subtopics');
            this.loadingSubTopics = false;
            reject(err);
          }
        });
    });
  }

  // ── Static loaders ─────────────────────────────────────────────────────────

  private loadSubjects(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full')
        .subscribe({
          next:  (res: any) => { this.subjects = res?.data || []; resolve(); },
          error: (err: any) => { this.alert.error('Error loading subjects'); reject(err); }
        });
    });
  }

  private loadExamCategories(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/exam/category', 'list?list=full')
        .subscribe({
          next:  (res: any) => { this.examCategories = res?.data || []; resolve(); },
          error: (err: any) => { this.alert.error('Error loading categories'); reject(err); }
        });
    });
  }

  private loadAllExamSubCategories(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/exam/subcategory', 'list?list=full')
        .subscribe({
          next:  (res: any) => { this.allExamSubCategories = res?.data || []; resolve(); },
          error: (err: any) => { this.alert.error('Error loading subcategories'); reject(err); }
        });
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  submitTest(): void {
    if (this.testForm.invalid) {
      this.alert.error('Please fill all required fields');
      this.testForm.markAllAsTouched();
      return;
    }

    const formValue = this.testForm.getRawValue();
    this.isEditMode ? this.updateTest(formValue) : this.createTest(formValue);
  }

  private createTest(formValue: any): void {
    const payload = {
      entiId:            this.tenantId,
      classNo:           Number(formValue.classNo),
      subjectId:         formValue.subjectId,
      topicId:           formValue.topicId    || null,
      subTopicId:        formValue.subTopicId || null,
      categoryId:        formValue.categoryId,
      subCategoryId:     formValue.subCategoryId,
      testNo:            formValue.testNumber,
      testCode:          formValue.testCode,
      numberOfQuestions: formValue.numberOfQuestions,
      status:            formValue.status
    };
    this.commonApi.fetchData(payload, 'assignment', 'create').subscribe({
      next:  (res: any) => { if (res?.status) { this.alert.success('Created successfully'); this.router.navigate(['/app/assignment']); }},
      error: ()         => this.alert.error('Error creating assignment')
    });
  }

  private updateTest(formValue: any): void {
    const payload = {
      entiId:            this.tenantId,
      testId:            this.testId,
      numberOfQuestions: formValue.numberOfQuestions,
      status:            formValue.status
    };
    this.commonApi.fetchData(payload, 'assignment', 'edit').subscribe({
      next:  (res: any) => { if (res?.status) { this.alert.success('Updated successfully'); this.router.navigate(['/app/assignment']); }},
      error: ()         => this.alert.error('Error updating assignment')
    });
  }

  addAss(): void {
    this.router.navigate(['/app/assignment']);
  }
}