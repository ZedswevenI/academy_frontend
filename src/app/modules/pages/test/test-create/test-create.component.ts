import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-ass-create',
  standalone: false,
  templateUrl: './test-create.component.html',
  styleUrl: './test-create.component.scss'
})
export class TestCreateComponent {

  constructor(private breadcrump: BredcrumpService, private router: Router, private fb: FormBuilder, private commonApi: CommonapiService,
    private alert: AlertService) {
    this.breadcrump.set([{ label: 'Assignment', link: '/app/tests' }, { label: 'Create' }])
  }

  addAss() {
    this.router.navigate(['/app/assignment'])
  }

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

  loading = false;


  ngOnInit(): void {
    console.log('Component initialized');

    this.testForm = this.fb.group({
      classNo: ['', Validators.required],
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

    this.loadSubjects();
    this.loadExamCategories();

    this.testForm.get('subjectId')?.valueChanges.subscribe(val => {
      console.log('Subject changed:', val);
      this.onSubjectChange(val);
    });

    this.testForm.get('topicId')?.valueChanges.subscribe(val => {
      console.log('Topic changed:', val);
      this.onTopicChange(val);
    });

    this.testForm.get('categoryId')?.valueChanges.subscribe(val => {
      console.log('Category changed:', val);
      this.onCategoryChange(val);
    });
  }

  /* ---------- SUBJECT ---------- */
  loadSubjects() {
    const body = {
      entiId: localStorage.getItem('tenantId')
    };
    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full')
      .subscribe({
        next: (res: any) => this.subjects = res?.data || [],
        error: () => this.alert.error('Error loading subjects')
      });
  }

  /* ---------- TOPIC ---------- */
  onSubjectChange(data: any) {
    this.topics = [];
    this.subTopics = [];
    const body = {
      entiId: localStorage.getItem('tenantId')
    };
    console.log("Class ",this.testForm.value.classNo);
    
    this.commonApi.fetchData(body, 'ims/topic', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.topics = (res?.data || []).filter((t: any) =>
            (t.subjectId?._id || t.subjectId) === data && t.classNo == this.testForm.value.classNo);
        },
        error: () => this.alert.error('Error loading topics')
      });
  }

  /* ---------- SUB TOPIC ---------- */
  onTopicChange(topicId: any) {
    // const topicId = this.testForm.value.topicId;
    console.log("Tets data ", topicId);
    this.subTopics = [];
    const body = {
      entiId: localStorage.getItem('tenantId')
    };
    this.commonApi.fetchData(body, 'ims/subtopic', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subTopics = (res?.data || []).filter((s: any) =>
            s.topicId === topicId
          );
        },
        error: () => this.alert.error('Error loading sub topics')
      });
  }

  /* ---------- EXAM CATEGORY ---------- */
  loadExamCategories() {
    const body = {
      entiId: localStorage.getItem('tenantId')
    };
    this.commonApi.fetchData(body, 'ims/exam/category', 'list?list=full')
      .subscribe({
        next: (res: any) => this.examCategories = res?.data || [],
        error: () => this.alert.error('Error loading exam categories')
      });
  }

  /* ---------- EXAM SUB CATEGORY ---------- */
  onCategoryChange(categoryId: any) {
    this.examSubCategories = [];
    const body = {
      entiId: localStorage.getItem('tenantId')
    };
    this.commonApi.fetchData(body, 'ims/exam/subcategory', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.examSubCategories = (res?.data || []).filter((s: any) =>
            s.categoryId === categoryId
          );
        },
        error: () => this.alert.error('Error loading exam sub categories')
      });
  }

  /* ---------- SUBMIT ---------- */
  submitTest() {
    if (this.testForm.invalid) {
      this.alert.error('Please fill all required fields');
      return;
    }

    if (this.testForm.invalid) {
      this.alert.error('Please fill all required fields');
      this.testForm.markAllAsTouched();
      return;
    }

    const formValue = this.testForm.value;

    const payload = {
      entiId: localStorage.getItem('tenantId'),
      classNo:  Number(formValue.classNo),
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

    console.log('CREATE ASSIGNMENT PAYLOAD', payload);

    this.commonApi.fetchData(payload, 'assignment', 'create')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Assignment created successfully');
            this.router.navigate(['/app/tests']);
          }
        },
        error: () => this.alert.error('Error creating assignment')
      });
  }


}
