import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AuthService } from '../../../../service/auth/auth.service';

@Component({
  selector: 'app-feedback',
  standalone: false,
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
})
export class FeedbackComponent implements OnInit {
  loading = false;
  tenantId: any;
  filterForm!: FormGroup;
  dataArray: any[] = [];
  totalRecords = 0;
  status_options = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Closed', value: 'CLOSED' },
  ];
  category_options = [
    { label: 'Staff / Teacher', value: 'STAFF' },
    { label: 'Batch / Class', value: 'BATCH' },
    { label: 'Facility', value: 'FACILITY' },
    { label: 'Course Content', value: 'COURSE' },
  ];
  columnsArray = [
    { key: 'title', label: 'Title', sortable: false },
    { key: 'categoryLabel', label: 'Category', sortable: false },
    { key: 'assignedBatches', label: 'Batches', sortable: false },
    { key: 'startFormatted', label: 'Start Date', sortable: false },
    { key: 'endFormatted', label: 'End Date', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'responseCount', label: 'Responses', sortable: false },
    { key: 'responseRate', label: 'Response %', sortable: false },
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-chart-bar',
      tooltip: 'View Results',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) =>
        this.router.navigate(['/app/feedback/results', row._id]),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      callback: (row: any) =>
        this.router.navigate(['/app/feedback/edit', row._id]),
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-toggle-on',
      tooltip: 'Change Status',
      color: '#6B7280',
      hoverColor: '#854F0B',
      callback: (row: any) => this.openStatusModal(row),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      callback: (row: any) => this.openDeleteModal(row),
    },
  ];
  selectedForm: any = null;
  newStatus = '';
  statusSaving = false;
  formToDelete: any = null;
  categoryMap: Record<string, string> = {
    STAFF: 'Staff / Teacher',
    BATCH: 'Batch / Class',
    FACILITY: 'Facility',
    COURSE: 'Course Content',
  };

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
    private authService: AuthService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Feedback' }]);
  }

  ngOnInit(): void {
    this.filterForm = this.fb.group({ status: [''], category: [''] });
    this.fetchForms(1, 10);
  }

  showCreate(): boolean {
    const role = this.authService.getRole();
    return role === 'L1' || role === 'L3';
  }

  fetchForms(page: number, limit: number): void {
    this.loading = true;
    const { status, category } = this.filterForm.value;
    const body: any = { tenantId: this.tenantId };
    let query = `list?page=${page}&limit=${limit}`;
    if (status) query += `&status=${status}`;
    if (category) query += `&category=${category}`;
    this.commonApi.fetchData(body, 'feedback', query).subscribe({
      next: (res: any) => {
        this.dataArray = (res?.data || []).map((f: any) => ({
          ...f,
          categoryLabel: this.categoryMap[f.category] || f.category,
          startFormatted: this.formatDate(f.startDate),
          endFormatted: this.formatDate(f.endDate),
          assignedBatches: (f.assignedBatches || []).join(', '),
          responseRate: f.responseRate + '%',
        }));
        this.totalRecords = res?.count || this.dataArray.length;
        this.loading = false;
      },
      error: () => {
        this.alert.error('Error loading feedback forms');
        this.loading = false;
      },
    });
  }

  loadTableData(req: { page: number; pageSize: number }): void {
    this.fetchForms(req.page, req.pageSize);
  }

  onSearch(): void {
    this.fetchForms(1, 10);
  }

  openStatusModal(row: any): void {
    this.selectedForm = row;
    this.newStatus = row.status;
    this.statusSaving = false;
    this.openModal('statusModal');
  }

  saveStatus(): void {
    if (!this.selectedForm || !this.newStatus) return;
    this.statusSaving = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          formId: this.selectedForm._id,
          status: this.newStatus,
        },
        'feedback',
        'status',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success(`Status changed to ${this.newStatus}`);
            this.closeModal('statusModal');
            this.fetchForms(1, 10);
          }
          this.statusSaving = false;
        },
        error: () => {
          this.alert.error('Error changing status');
          this.statusSaving = false;
        },
      });
  }

  openDeleteModal(row: any): void {
    this.formToDelete = row;
    this.openModal('feedbackDeleteModal');
  }

  confirmDelete(): void {
    if (!this.formToDelete) return;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, formId: this.formToDelete._id },
        'feedback',
        'delete',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Feedback form deleted');
            this.formToDelete = null;
            this.fetchForms(1, 10);
          }
        },
        error: () => this.alert.error('Error deleting form'),
      });
  }

  private formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) new (window as any).bootstrap.Modal(el).show();
  }

  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }
}
