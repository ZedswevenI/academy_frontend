import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AuthService } from '../../../../service/auth/auth.service';
import { PermissionService } from '../../../../shared/permission.service';
import { ListStateService } from '../../../../shared/list-state.service';
import { ExamResultEmailModalComponent } from '../exam-result-email-modal/exam-result-email-modal.component';

const IMPORTED_EXAMS_LIST_STATE_KEY = 'imported-exams-list';

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
  currentPage = 1;
  restoredPage = 1;
  lastTableParams: any = null;
  showFilters = false;
  filterForm!: FormGroup;
  columnsArray = [
    { key: 'examCode', label: 'Exam Code', sortable: true },
    { key: 'examName', label: 'Exam Name', sortable: true },
    { key: 'totalQuestions', label: 'Questions', sortable: true },
    { key: 'totalMarks', label: 'Marks', sortable: true },
    { key: 'duration', label: 'Duration (min)', sortable: true },
    { key: 'statusDisplay', label: 'Status', sortable: false }
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View Exam',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('examImport:view'),
      callback: (row: any) => this.viewExam(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-envelope',
      tooltip: 'Send Result Email',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: (row: any) => row.status !== 'result_published' || !this.permissionService.hasPermission('communication:send'),
      callback: (row: any) => this.openSendResultEmail(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete Imported Exam',
      color: '#6B7280',
      hoverColor: '#DC2626',
      show: (row: any) => row.isImported !== true || !this.permissionService.hasPermission('examImport:delete'),
      callback: (row: any) => this.deleteImportedExam(row)
    }
  ];
  @ViewChild('resultEmailModal') resultEmailModal!: ExamResultEmailModalComponent;
  emailExamId = '';
  emailExamName = '';
  emailBatches: any[] = [];
  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({ label: `Class ${i + 6}`, value: i + 6 })),
    { label: '12th Pass', value: 13 }
  ];
  showDeleteConfirm = false;
  deleteExamId = '';
  deleteExamName = '';
  deleteLoading = false;

  constructor(
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
    private breadcrumb: BredcrumpService,
    public authService: AuthService,
    private permissionService: PermissionService,
    private listStateService: ListStateService
  ) {
    this.restoredPage = this.listStateService.consumePage(IMPORTED_EXAMS_LIST_STATE_KEY);
  }

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Imported Exams' }]);
    this.filterForm = this.fb.group({
      classNo: [null]
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
    this.currentPage = params.page;
    this.loading = true;
    const query: any = { page: params.page, limit: params.pageSize, isImported: true };
    if (params.sortKey) {
      query.sort = params.sortDirection === 'desc' ? `-${params.sortKey}` : params.sortKey;
    }
    const filters = this.filterForm.value;
    if (params.search) query.search = params.search;
    if (filters.classNo) query.classNo = filters.classNo;
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
      draft: 'Draft',
      published: 'Published',
      result_published: 'Result Published',
      completed: 'Completed'
    };
    return map[status] || status;
  }

  importMarks() {
    this.listStateService.savePage(IMPORTED_EXAMS_LIST_STATE_KEY, this.currentPage);
    this.router.navigate(['/app/exams/exams/marks-import']);
  }

  viewExam(row: any) {
    this.listStateService.savePage(IMPORTED_EXAMS_LIST_STATE_KEY, this.currentPage);
    this.router.navigate(['/app/exams/exams/view'], { state: { exam: row } });
  }

  openSendResultEmail(row: any) {
    const tenantId = localStorage.getItem('tenantId') || '';
    this.emailExamId = row.examId || '';
    this.emailExamName = row.examName || row.examCode || '';
    this.emailBatches = [];
    this.commonApi
      .fetchData({ entiId: tenantId, examId: this.emailExamId }, 'exam/batch', 'list-by-exam')
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.emailBatches = list.map((b: any) => ({
            batchId: b.batchId,
            label:
              b.batchName && b.batchCode
                ? `${b.batchName} (${b.batchCode})`
                : b.batchName || b.batchCode || b.batchId,
          }));
          setTimeout(() => this.resultEmailModal?.open());
        },
        error: () => {
          setTimeout(() => this.resultEmailModal?.open());
        },
      });
  }

  deleteImportedExam(row: any) {
    this.deleteExamId = row.examId;
    this.deleteExamName = row.examName || row.examCode || '';
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.deleteExamId = '';
    this.deleteExamName = '';
  }

  confirmDeleteImportedExam() {
    if (!this.deleteExamId) return;
    this.deleteLoading = true;
    this.commonApi
      .fetchData(
        { entiId: localStorage.getItem('tenantId'), examId: this.deleteExamId },
        'exam',
        'delete/import',
      )
      .subscribe({
        next: (res: any) => {
          this.deleteLoading = false;
          if (res?.status) {
            this.alert.success('Imported exam deleted successfully');
            this.closeDeleteConfirm();
            if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
          }
        },
        error: () => {
          this.deleteLoading = false;
          this.alert.error('Error deleting imported exam');
        },
      });
  }

  onRowSelected(row: any) {
    if (!this.permissionService.hasPermission('examImport:view')) return;
    this.listStateService.savePage(IMPORTED_EXAMS_LIST_STATE_KEY, this.currentPage);
    this.router.navigate(['/app/exams/exams/view'], { state: { exam: row } });
  }
}
