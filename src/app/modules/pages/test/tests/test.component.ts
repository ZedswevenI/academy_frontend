import { Component, OnInit, OnDestroy } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-tests',
  standalone: false,
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent implements OnInit, OnDestroy {

  loading = false;
  totalRecords = 0;

  private routerSub!: Subscription;

  lastTableParams: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  } | null = null;

  /* ================= TABLE COLUMNS ================= */
  columnsArray = [
    { key: 'testNumber', label: 'Test No', sortable: true },
    { key: 'classNo', label: 'Class', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'numberOfQuestions', label: 'No of questions', sortable: false },
  ];

  dataArray: any[] = [];

  /* ================= FILTERS ================= */
  filterForm!: FormGroup;
  showFilters = false;

  classOptions = [
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: '10', value: 10 },
    { label: '11', value: 11 },
    { label: '12', value: 12 },
    { label: '13', value: 13 }
  ];

  topicOptions: any[] = [];
  subtopicOptions: any[] = [];
  subjectOptions: any[] = [];


  statusOptions = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
  ];

  /* ================= ACTIONS ================= */
  actions = [
    {
      type: 'dropdown',
      text: 'Actions',
      icon: 'fa-solid fa-ellipsis-vertical',
      color: 'secondary',
      dropdown: [
        { text: 'Edit Test', icon: 'fa-regular fa-pen-to-square', callback: (row: any) => this.editTest(row) },
        { text: 'View Questions', icon: 'fa-regular fa-eye', callback: (row: any) => this.viewQuestions(row) },
        { text: 'Rearrange Questions', icon: 'fa-solid fa-reorder', callback: (row: any) => this.rearrange(row) },
        { text: 'Add Question', icon: 'fa-solid fa-file-import', callback: (row: any) => this.addQuestions(row) },
        { text: 'Import Questions', icon: 'fa-solid fa-file-import', callback: (row: any) => this.importQuestions(row) },
        { text: 'Print Test', icon: 'fa-solid fa-print', callback: (row: any) => this.printTest(row) },
        { text: 'Student Feedbacks', icon: 'fa-solid fa-comments', callback: (row: any) => this.studentFeedbacks(row) },
        { text: 'Report', icon: 'fa-solid fa-chart-line', callback: (row: any) => this.report(row) },
        { text: 'Update Ans/Solutions', icon: 'fa-solid fa-pen', callback: (row: any) => this.updateAnswers(row) },
        { text: 'Delete', icon: 'fa-regular fa-trash-can', callback: (row: any) => this.deleteTest(row) }
      ]
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder
  ) { }

  /* ================= INIT ================= */
  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Assignment' }]);
    this.initFilterForm();

    this.filterForm.get('classNo')?.valueChanges.subscribe(classId => {
      if (classId) {
        // const selectedClass = Number();
        this.loadTopics(this.filterForm.get('subjectId')?.value);
      } else {
        this.topicOptions = [];
        this.subtopicOptions = [];
      }
      this.filterForm.patchValue({ topicId: '', subtopicId: '' });
    });

    // Class → Load Topics
    this.filterForm.get('subjectId')?.valueChanges.subscribe(classId => {
      if (classId) {
        this.loadTopics(classId);
      } else {
        this.topicOptions = [];
        this.subtopicOptions = [];
      }
      this.filterForm.patchValue({ topicId: '', subtopicId: '' });
    });

    // Topic → Load Subtopics
    this.filterForm.get('topicId')?.valueChanges.subscribe(topicId => {
      if (topicId) {
        this.loadSubtopics(topicId);
      } else {
        this.subtopicOptions = [];
      }
      this.filterForm.patchValue({ subtopicId: '' });
    });

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.forceCloseDropdowns();
      }
    });
    this.loadSubjects()

  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  initFilterForm() {
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      classNo: [''],
      topicId: [''],
      subjectId: [''],
      subtopicId: ['']
    });
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  clearFilters() {
    this.filterForm.reset();
    this.topicOptions = [];
    this.subtopicOptions = [];

    if (this.lastTableParams) {
      this.fetchTableData(this.lastTableParams);
    }
  }


  /* ================= API CALLS ================= */

  loadTopics(subjectId: string) {
    const body = {
      entiId: localStorage.getItem('tenantId'),
    };

    this.commonApi.fetchData(body, 'ims/topic', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            const selectedClass = Number(this.filterForm.get('classNo')?.value);
            this.topicOptions = res.data
              .filter((t: any) => t.subjectId?._id === subjectId && t.classNo === selectedClass)
              .map((t: any) => ({
                label: t.topicName,
                value: t.topicId
              }));
          }
        },
        error: () => this.alert.error('Error loading topics')
      });
  }

  loadSubjects() {
    this.commonApi.fetchData({
      entiId: localStorage.getItem('tenantId')
    }, 'ims/subject', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjectOptions = res.data.map((s: any) => ({
            label: s.subjectName,
            value: s._id
          }));
        },
        error: (err) => {
          this.alert.error('Error loading subjects');
        }
      });
  }

  loadSubtopics(topicId: string) {
    const body = {
      entiId: localStorage.getItem('tenantId'),
    };

    this.commonApi.fetchData(body, 'ims/subtopic', `list?topicId=${topicId}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.subtopicOptions = res.data.map((s: any) => ({
              label: s.subTopicName,
              value: s.subTopicId
            }));
          }
        },
        error: () => this.alert.error('Error loading subtopics')
      });
  }

  /* ================= TABLE ================= */

  fetchTableData(params: any) {

    this.lastTableParams = { ...params };
    this.loading = true;

    let sortParam = '';
    if (params.sortKey) {
      sortParam = params.sortDirection === 'desc'
        ? `-${params.sortKey}`
        : params.sortKey;
    }

    const query: any = {
      page: params.page,
      limit: params.pageSize
    };

    if (sortParam) query.sort = sortParam;

    const filters = this.filterForm.value;

    if (params.search) query.search = params.search;
    if (filters.classNo) query.classNo = filters.classNo;
    if (filters.topicId) query.topicId = filters.topicId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.subtopicId) query.subtopicId = filters.subtopicId;
    if (filters.status !== '' && filters.status !== null)
      query.status = filters.status;

    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'assignment', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              testNumber: item.testNo,
              classNo: item.classNo,
              subject: item.subjectId?.subjectName,
              numberOfQuestions: item.numberOfQuestions,
              status: item.status,
              id: item._id
            }));

            this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error loading assignments');
        }
      });
  }

  /* ================= ACTIONS ================= */

  deleteTest(row: any) {
    if (!confirm('Are you sure you want to delete this test?')) return;

    const body = {
      entiId: localStorage.getItem('tenantId'),
      testId: row.testId,
    };

    this.commonApi.fetchData(body, 'assignment', 'delete')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Deleted successfully');
            if (this.lastTableParams) {
              this.fetchTableData(this.lastTableParams);
            }
          }
        },
        error: () => this.alert.error('Error deleting test')
      });
  }

  viewQuestions(row: any) {
    this.router.navigate(['/app/tests/question-view'], { state: { questions: row } });
  }

  rearrange(row: any) {
    this.router.navigate(['/app/tests/question-rearrange'], { state: { questions: row } });
  }

  editTest(row: any) {
    this.router.navigate(['/app/tests/create'], { state: { test: row } });
  }

  importQuestions(row: any) {
    this.router.navigate(['/app/tests/question-import'], { state: { questions: row } });
  }

  addQuestions(row: any) {
    this.router.navigate(['/app/tests/question-create'], { state: { question: row } });
  }

  printTest(row: any) { }
  studentFeedbacks(row: any) { }
  report(row: any) { }
  updateAnswers(row: any) { }

  private forceCloseDropdowns(): void {
    document.querySelectorAll('.dropdown-menu.show')
      .forEach(menu => menu.classList.remove('show'));

    document.querySelectorAll('body > .dropdown-menu')
      .forEach(menu => menu.remove());

    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
      .forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
  }

  refresh() {

    // If table already loaded once → reload with last params
    if (this.lastTableParams) {
      this.fetchTableData(this.lastTableParams);
      return;
    }

    // If first time load (no params yet)
    this.fetchTableData({
      page: 1,
      pageSize: 10
    });
  }
}