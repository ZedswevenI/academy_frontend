import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-ass-create',
  standalone: false,
  templateUrl: './test-create.component.html',
  styleUrl: './test-create.component.scss'
})
export class TestCreateComponent implements OnInit {

  isEditMode = false;
  testId: string = '';
  editData: any = null;
  tenantId: string = '';

  testForm!: FormGroup;

  classes = [
    { label: '6th', value: 6 },
    { label: '7th', value: 7 },
    { label: '8th', value: 8 },
    { label: '9th', value: 9 },
    { label: '10th', value: 10 },
    { label: '11th', value: 11 },
    { label: '12th', value: 12 },
    { label: '12th Pass', value: 13 }
  ];

  subjects: any[] = [];
  topics: any[] = [];
  subTopics: any[] = [];
  examCategories: any[] = [];
  examSubCategories: any[] = [];
  
  // Store all data for filtering
  allTopics: any[] = [];
  allSubTopics: any[] = [];
  allExamSubCategories: any[] = [];
  
  loading = false;

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    const state: any = history.state;
    this.tenantId = localStorage.getItem('tenantId') || '';

    // Check if coming from edit (state has test data)
    if (state?.test) {
      this.isEditMode = true;
      this.testId = state.test.testId || state.test;
      this.editData = state.test;
      this.breadcrump.set([{ label: 'Assignment', link: '/app/assignment' }, { label: 'Edit' }]);
    } else {
      this.breadcrump.set([{ label: 'Assignment', link: '/app/assignment' }, { label: 'Create' }]);
    }
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
  }

  /**
   * Initialize form with validators
   */
  private initializeForm(): void {
    this.testForm = this.fb.group({
      classNo: [6, Validators.required],
      subjectId: ['', Validators.required],
      topicId: [''],
      subTopicId: [''],
      categoryId: ['', Validators.required],
      subCategoryId: ['', Validators.required],
      testNumber: ['', Validators.required],
      testCode: ['', Validators.required],
      numberOfQuestions: [0, [Validators.required, Validators.min(1)]],
      status: ['active']
    });

    // Subscribe to value changes
    this.setupValueChangeListeners();
  }

  /**
   * Setup value change listeners for cascading dropdowns
   */
  private setupValueChangeListeners(): void {
    // When subject changes, load topics
    this.testForm.get('subjectId')?.valueChanges.subscribe(subjectId => {
      if (subjectId) {
        this.onSubjectChange(subjectId);
      }
    });

    // When topic changes, load subtopics
    this.testForm.get('topicId')?.valueChanges.subscribe(topicId => {
      if (topicId) {
        this.onTopicChange(topicId);
      }
    });

    // When category changes, load subcategories
    this.testForm.get('categoryId')?.valueChanges.subscribe(categoryId => {
      if (categoryId) {
        this.onCategoryChange(categoryId);
      }
    });
  }

  /**
   * Load all initial data: subjects, topics, subtopics, categories, subcategories
   * For edit mode, also load the test data and populate form
   */
  private async loadInitialData(): Promise<void> {
    try {
      this.loading = true;

      // Load subjects and exam categories in parallel
      await Promise.all([
        this.loadSubjects(),
        this.loadExamCategories(),
        this.loadAllTopics(),
        this.loadAllSubTopics(),
        this.loadAllExamSubCategories()
      ]);
      
      // If edit mode, populate form with existing data
      if (this.isEditMode && this.editData) {
        this.populateFormForEdit();
      }

      this.loading = false;
    } catch (error) {
      this.alert.error('Error loading initial data');
      this.loading = false;
    }
  }

  /**
   * Load all subjects
   */
  private loadSubjects(): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = {
        entiId: this.tenantId
      };

      this.commonApi.fetchData(body, 'ims/subject', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.subjects = res?.data || [];
            resolve();
          },
          error: (err) => {
            this.alert.error('Error loading subjects');
            reject(err);
          }
        });
    });
  }

  /**
   * Load exam categories
   */
  private loadExamCategories(): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = {
        entiId: this.tenantId
      };

      this.commonApi.fetchData(body, 'ims/exam/category', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.examCategories = res?.data || [];
            resolve();
          },
          error: (err) => {
            this.alert.error('Error loading exam categories');
            reject(err);
          }
        });
    });
  }

  /**
   * Load all topics (cache for filtering)
   */
  private loadAllTopics(): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = {
        entiId: this.tenantId
      };

      this.commonApi.fetchData(body, 'ims/topic', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.allTopics = res?.data || [];
            console.log('All topics loaded:', this.allTopics.length);
            resolve();
          },
          error: (err) => {
            console.error('Error loading topics:', err);
            this.alert.error('Error loading topics');
            reject(err);
          }
        });
    });
  }

  /**
   * Load all subtopics (cache for filtering)
   */
  private loadAllSubTopics(): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = {
        entiId: this.tenantId
      };

      this.commonApi.fetchData(body, 'ims/subtopic', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.allSubTopics = res?.data || [];
            console.log('All subtopics loaded:', this.allSubTopics.length);
            resolve();
          },
          error: (err) => {
            console.error('Error loading subtopics:', err);
            this.alert.error('Error loading subtopics');
            reject(err);
          }
        });
    });
  }

  /**
   * Load all exam subcategories (cache for filtering)
   */
  private loadAllExamSubCategories(): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = {
        entiId: this.tenantId
      };

      this.commonApi.fetchData(body, 'ims/exam/subcategory', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.allExamSubCategories = res?.data || [];
            console.log('All subcategories loaded:', this.allExamSubCategories.length);
            resolve();
          },
          error: (err) => {
            console.error('Error loading exam subcategories:', err);
            this.alert.error('Error loading exam subcategories');
            reject(err);
          }
        });
    });
  }

  /**
   * Populate form for edit mode with current data
   * Based on received data structure:
   * {
   *   subjectId: { _id: string, subjectName: string, subjectCode: string }
   *   topicId: string (UUID)
   *   subTopicId: string (UUID)
   *   categoryId: string (UUID)
   *   subCategoryId: string (UUID)
   * }
   */
  private populateFormForEdit(): void {
    const data = this.editData;

    console.log('Edit data received:', data);

    // Extract subject ID (handle both object and string formats)
    const subjectId = typeof data.subjectId === 'object' 
      ? data.subjectId._id 
      : data.subjectId;

    // Pre-populate topics based on subject + class
    if (subjectId) {
      this.topics = this.allTopics.filter((t: any) => {
        const topicSubjectId = typeof t.subjectId === 'object' 
          ? t.subjectId._id 
          : t.subjectId;
        return topicSubjectId === subjectId && t.classNo === data.classNo;
      });
      console.log('Filtered topics:', this.topics.length);
    }

    // Pre-populate subtopics based on topic
    if (data.topicId) {
      this.subTopics = this.allSubTopics.filter((s: any) => {
        const subTopicTopicId = typeof s.topicId === 'object' 
          ? s.topicId._id 
          : s.topicId;
        return subTopicTopicId === data.topicId;
      });
      console.log('Filtered subtopics:', this.subTopics.length);
    }

    // Pre-populate subcategories based on category
    if (data.categoryId) {
      this.examSubCategories = this.allExamSubCategories.filter((s: any) => {
        const subCatCategoryId = typeof s.categoryId === 'object' 
          ? s.categoryId._id 
          : s.categoryId;
        return subCatCategoryId === data.categoryId;
      });
      console.log('Filtered subcategories:', this.examSubCategories.length);
    }

    // Now patch the form with all data
    this.testForm.patchValue({
      classNo: data.classNo,
      subjectId: subjectId,
      topicId: data.topicId,
      subTopicId: data.subTopicId,
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      testNumber: data.testNo || data.testNumber,
      testCode: data.testCode,
      numberOfQuestions: data.numberOfQuestions,
      status: data.status
    });

    // Disable fields in edit mode
    this.disableEditModeFields();
  }

  /**
   * Disable fields that shouldn't be edited
   */
  private disableEditModeFields(): void {
    const fieldsToDisable = [
      'classNo',
      'subjectId',
      'topicId',
      'subTopicId',
      'categoryId',
      'subCategoryId',
      'testNumber',
      'testCode'
    ];

    fieldsToDisable.forEach(field => {
      this.testForm.get(field)?.disable();
    });
  }

  /**
   * Handle subject change - load topics
   */
  private onSubjectChange(subjectId: any): void {
    this.topics = [];
    this.subTopics = [];
    this.testForm.patchValue({ topicId: '', subTopicId: '' }, { emitEvent: false });

    if (!subjectId) {
      return;
    }

    const selectedClass = Number(this.testForm.get('classNo')?.value);

    // Filter topics based on selected subject and class
    this.topics = this.allTopics.filter((t: any) => {
      const topicSubjectId = typeof t.subjectId === 'object' 
        ? t.subjectId._id 
        : t.subjectId;
      return topicSubjectId === subjectId && t.classNo === selectedClass;
    });
  }

  /**
   * Handle topic change - load subtopics
   */
  private onTopicChange(topicId: any): void {
    this.subTopics = [];
    this.testForm.patchValue({ subTopicId: '' }, { emitEvent: false });

    if (!topicId) {
      return;
    }

    // Filter subtopics based on selected topic
    this.subTopics = this.allSubTopics.filter((s: any) => {
      const subTopicTopicId = typeof s.topicId === 'object' 
        ? s.topicId._id 
        : s.topicId;
      return subTopicTopicId === topicId;
    });

    console.log('Subtopics filtered for topic:', topicId, 'Count:', this.subTopics.length);
  }

  /**
   * Handle category change - load subcategories
   */
  private onCategoryChange(categoryId: any): void {
    this.examSubCategories = [];
    this.testForm.patchValue({ subCategoryId: '' }, { emitEvent: false });

    if (!categoryId) {
      return;
    }

    // Filter exam subcategories based on selected category
    this.examSubCategories = this.allExamSubCategories.filter((s: any) => {
      const subCatCategoryId = typeof s.categoryId === 'object' 
        ? s.categoryId._id 
        : s.categoryId;
      return subCatCategoryId === categoryId;
    });

    console.log('Subcategories filtered for category:', categoryId, 'Count:', this.examSubCategories.length);
  }

  /**
   * Submit form - create or update test
   */
  submitTest(): void {
    if (this.testForm.invalid) {
      this.alert.error('Please fill all required fields');
      this.testForm.markAllAsTouched();
      return;
    }

    const formValue = this.testForm.getRawValue(); // Important for disabled fields

    if (this.isEditMode) {
      this.updateTest(formValue);
    } else {
      this.createTest(formValue);
    }
  }

  /**
   * Create new test
   */
  private createTest(formValue: any): void {
    const payload = {
      entiId: this.tenantId,
      classNo: Number(formValue.classNo),
      subjectId: formValue.subjectId,
      topicId: formValue.topicId || null,
      subTopicId: formValue.subTopicId || null,
      categoryId: formValue.categoryId,
      subCategoryId: formValue.subCategoryId,
      testNo: formValue.testNumber,
      testCode: formValue.testCode,
      numberOfQuestions: formValue.numberOfQuestions,
      status: formValue.status
    };

    this.commonApi.fetchData(payload, 'assignment', 'create')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Assignment created successfully');
            this.router.navigate(['/app/assignment']);
          }
        },
        error: () => this.alert.error('Error creating assignment')
      });
  }

  /**
   * Update existing test
   */
  private updateTest(formValue: any): void {
    const payload = {
      entiId: this.tenantId,
      testId: this.testId,
      numberOfQuestions: formValue.numberOfQuestions,
      status: formValue.status
    };

    this.commonApi.fetchData(payload, 'assignment', 'edit')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Assignment updated successfully');
            this.router.navigate(['/app/assignment']);
          }
        },
        error: () => this.alert.error('Error updating assignment')
      });
  }

  /**
   * Navigate to assignment page
   */
  addAss(): void {
    this.router.navigate(['/app/assignment']);
  }
}