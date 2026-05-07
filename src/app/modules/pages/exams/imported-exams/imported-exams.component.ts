import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AuthService } from '../../../../service/auth/auth.service';

@Component({
  selector: 'app-imported-exams',
  standalone: false,
  templateUrl: './imported-exams.component.html',
  styleUrl: './imported-exams.component.scss'
})
export class ImportedExamsComponent implements OnInit {

  loading = false;
  totalRecords = 0;
  dataArray: any[] = [];

  lastTableParams: any = null;
  showFilters = false;
  filterForm!: FormGroup;

  columnsArray = [
    { key: 'examCode',       label: 'Exam Code',   sortable: true },
    { key: 'examName',       label: 'Exam Name',   sortable: true },
    { key: 'totalQuestions', label: 'Questions',   sortable: true },
    { key: 'totalMarks',     label: 'Marks',       sortable: true },
    { key: 'duration',       label: 'Duration (min)', sortable: true },
    { key: 'statusDisplay',  label: 'Status',      sortable: false }
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View Exam',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewExam(row)
    }
  ];

  testTypeOptions = [
    { label: 'Practice', value: 'practice' },
    { label: 'Mock',     value: 'mock' },
    { label: 'Live',     value: 'live' }
  ];

  statusOptions = [
    { label: 'Draft',            value: 'draft' },
    { label: 'Published',        value: 'published' },
    { label: 'Result Published', value: 'result_published' },
    { label: 'Completed',        value: 'completed' }
  ];

  mediumOptions = [
    { label: 'English', value: 'en' },
    { label: 'Tamil',   value: 'ta' }
  ];

  constructor(
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
    private breadcrumb: BredcrumpService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Imported Exams' }]);
    this.filterForm = this.fb.group({
      testType: [''],
      status:   [''],
      medium:   ['']
    });
  }

  toggleFilters() { this.showFilters = !this.showFilters; }

  clearFilters() {
    this.filterForm.reset();
    if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
  }

  refresh() {
    if (this.lastTableParams) { this.fetchTableData(this.lastTableParams); return; }
    this.fetchTableData({ page: 1, pageSize: 10 });
  }

  fetchTableData(params: any) {
    this.lastTableParams = { ...params };
    this.loading = true;

    const query: any = { page: params.page, limit: params.pageSize, isImported: true };
    if (params.sortKey) {
      query.sort = params.sortDirection === 'desc' ? `-${params.sortKey}` : params.sortKey;
    }

    const filters = this.filterForm.value;
    if (params.search)    query.search   = params.search;
    if (filters.testType) query.testType = filters.testType;
    if (filters.status)   query.status   = filters.status;
    if (filters.medium)   query.medium   = filters.medium;

    const queryString = Object.keys(query)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&');

    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'exam', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              id: item._id,
              statusDisplay: this.formatStatus(item.status)
            }));
            this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: () => { this.loading = false; this.alert.error('Error loading exams'); }
      });
  }

  private formatStatus(status: string): string {
    const map: Record<string, string> = {
      draft:            'Draft',
      published:        'Published',
      result_published: 'Result Published',
      completed:        'Completed'
    };
    return map[status] || status;
  }

  importMarks() {
    this.router.navigate(['/app/exams/exams/marks-import']);
  }

  viewExam(row: any) {
    this.router.navigate(['/app/exams/exams/view'], { state: { exam: row } });
  }
}
