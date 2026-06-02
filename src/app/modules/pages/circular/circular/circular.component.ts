import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-circular',
  standalone: false,
  templateUrl: './circular.component.html',
  styleUrl: './circular.component.scss',
})
export class CircularComponent implements OnInit {
  tenantId: any;
  loading = false;
  isProceed = false;
  filterForm!: FormGroup;
  dataArray: any[] = [];
  totalRecords = 0;
  private lastFilter: {
    filterType: string;
    filterValue: string;
    status: string;
    page: number;
    pageSize: number;
  } = {
    filterType: 'batchCode',
    filterValue: '',
    status: '',
    page: 1,
    pageSize: 5,
  };
  batch_options: any[] = [];
  center_options: any[] = [];
  status_options = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
  ];
  filterTypeList = [
    { label: 'Batch', value: 'batchCode' },
    { label: 'Center', value: 'centerCode' },
    { label: 'Institution', value: 'institution' },
  ];
  columnsArray = [
    { key: 'category', label: 'Category', sortable: false },
    { key: 'scope', label: 'Scope', sortable: false },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'publishedAtFormatted', label: 'Published', sortable: false },
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) =>
        this.router.navigate(['/app/circular/view'], {
          state: { circular: row },
        }),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      callback: (row: any) => {
        this.router.navigate(['/app/circular/create'], {
          state: { circular: row },
        });
      },
      hidden: (row: any) => row.status.toUpperCase() === 'PUBLISHED',
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-paper-plane',
      tooltip: 'Publish',
      color: '#6B7280',
      hoverColor: '#7C3AED',
      callback: (row: any) =>
        row.status === 'DRAFT' ? this.openPublishModal(row) : null,
      hidden: (row: any) => row.status.toUpperCase() === 'PUBLISHED',
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
  selectedCircular: any = null;
  circularToDelete: any = null;
  circularToPublish: any = null;
  publishLoading = false;

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Circulars' }]);
  }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      filterType: ['batchCode'],
      filterValue: [''],
      status: [''],
    });
    Promise.all([this.loadBatches(), this.loadCenters()]);
  }

  private loadBatches(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.batch_options = (res?.data || []).map((b: any) => ({
              label: b.batchName + ' (' + b.batchCode + ')',
              value: b.batchCode,
            }));
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private loadCenters(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'ims/center', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.center_options = (res?.data || []).map((c: any) => ({
              label: c.centerName + ' (' + c.centerCode + ')',
              value: c.centerCode,
            }));
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  get currentFilterOptions(): any[] {
    return this.filterForm.get('filterType')?.value === 'batchCode'
      ? this.batch_options
      : this.center_options;
  }

  get currentFilterLabel(): string {
    return this.filterForm.get('filterType')?.value === 'batchCode'
      ? 'Batch'
      : 'Center';
  }

  onFilterTypeChange(): void {
    this.filterForm.patchValue({ filterValue: '' }, { emitEvent: false });
  }

  get isInstitutionFilter(): boolean {
    return this.filterForm.get('filterType')?.value === 'institution';
  }

  onProceed(): void {
    this.isProceed = true;
    const { filterType, filterValue, status } = this.filterForm.value;
    this.lastFilter = { filterType, filterValue, status, page: 1, pageSize: 5 };
    this.fetchList(1, 5);
  }

  fetchList(page: number, limit: number, search?: string): void {
    const { filterType, filterValue, status } = this.filterForm.value;
    this.loading = true;
    let query = `list?page=${page}&limit=${limit}`;
    if (filterValue) query += `&${filterType}=${filterValue}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${search}`;
    this.commonApi
      .fetchData({ tenantId: this.tenantId }, 'institue/circular', query)
      .subscribe({
        next: (res: any) => {
          this.dataArray = (res?.data || []).map((c: any) => ({
            ...c,
            publishedAtFormatted: c.publishedAt
              ? this.formatDate(c.publishedAt)
              : '-',
          }));
          this.totalRecords = res?.count || this.dataArray.length;
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading circulars');
          this.loading = false;
        },
      });
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
  }): void {
    this.lastFilter.page = req.page;
    this.lastFilter.pageSize = req.pageSize;
    this.fetchList(req.page, req.pageSize, req.search);
  }

  downloadFile(url: string): void {
    this.commonApi.downloadByUrl({ url }, 'ims', 'download').subscribe({
      next: (res: any) => {
        const fileName = url.split('/').pop() || 'download';
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(res);
        a.href = objectUrl;
        a.download = fileName;
        a.click();
      },
      error: () => this.alert.error('Error downloading file'),
    });
  }

  onView(row: any): void {
    this.selectedCircular = row;
    this.openModal('circularViewModal');
  }

  openPublishModal(row: any): void {
    this.circularToPublish = row;
    this.openModal('circularPublishModal');
  }

  confirmPublish(): void {
    if (!this.circularToPublish) return;
    this.publishLoading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          circularId: this.circularToPublish.circularId,
        },
        'institue/circular',
        'publish',
      )
      .subscribe({
        next: (res: any) => {
          this.publishLoading = false;
          if (res?.status) {
            this.alert.success('Circular published successfully');
            this.circularToPublish = null;
            this.fetchList(this.lastFilter.page, this.lastFilter.pageSize);
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message);
        },
      });
  }

  openDeleteModal(row: any): void {
    this.circularToDelete = row;
    this.openModal('circularDeleteModal');
  }

  confirmDelete(): void {
    if (!this.circularToDelete) return;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          circularId: this.circularToDelete.circularId,
        },
        'institue/circular',
        'delete',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Circular deleted successfully');
            this.dataArray = this.dataArray.filter(
              (d) => d.circularId !== this.circularToDelete.circularId,
            );
            this.loadTableData(this.lastFilter);

            this.circularToDelete = null;
          }
        },
        error: () => this.alert.error('Error deleting circular'),
      });
  }

  getScopeClass(scope: string): string {
    const map: any = {
      INSTITUTE: 'bg-primary',
      CENTER: 'bg-info text-dark',
      BATCH: 'bg-warning text-dark',
    };
    return map[scope] || 'bg-secondary';
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

  onRowSelected(row: any) {
    this.router.navigate(['/app/circular/view'], { state: { circular: row } });
  }
}
