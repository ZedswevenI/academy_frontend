import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { AuthService } from '../../../../service/auth/auth.service';
import { PermissionService } from '../../../../shared/permission.service';
import { ListStateService } from '../../../../shared/list-state.service';
import * as XLSX from 'xlsx';

const ACTIVITY_LIST_STATE_KEY = 'activity-list';

@Component({
  selector: 'app-activity',
  standalone: false,
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss',
})
export class ActivityComponent implements OnInit {
  filterForm!: FormGroup;
  loading = false;
  tenantId: any;
  dataArray: any[] = [];
  totalRecords = 0;
  private lastPage = 1;
  private lastLimit = 10;
  restoredPage = 1;
  private lastSearch?: string;
  batch_options: any[] = [];
  center_options: any[] = [];
  status_options = [
    { label: 'Planned', value: 'PLANNED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];
  columnsArray = [
    { key: 'activityName', label: 'Activity', sortable: true },
    { key: 'startDateFormatted', label: 'Start Date', sortable: false },
    { key: 'endDateFormatted', label: 'End Date', sortable: false },
    { key: 'actualStartFormatted', label: 'Actual Start', sortable: false },
    { key: 'remarks', label: 'Remarks', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];
  // FIX: was `hidden:` — custom-table's template only ever reads
  // `action.show` (a HIDE predicate), so this was a silent no-op and the
  // Edit pencil showed on completed activities too. Renamed with inverted
  // logic and combined with permission checks.
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('activity:view'),
      callback: (row: any) => this.onView(row),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.goToEdit(row),
      show: (row: any) => row.status.toUpperCase() === 'COMPLETED' || !this.permissionService.hasPermission('activity:edit'),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      show: () => !this.permissionService.hasPermission('activity:delete'),
      callback: (row: any) => this.openDeleteModal(row),
    },
  ];
  selectedActivity: any = null;
  activityToDelete: any = null;
  isDragging = false;
  fileName = '';
  importLoading = false;
  parsedRows: any[] = [];
  errorRows: any[] = [];
  columnMap: { [key: string]: string } = {
    BatchCode: 'BatchCode',
    Activity: 'Activity',
    StartDate: 'StartDate',
    EndDate: 'EndDate',
    Remarks: 'Remarks',
    CentCode: 'CentCode',
    ActualDate: 'ActualDate',
  };
  requiredColumns = [
    'BatchCode',
    'Activity',
    'StartDate',
    'EndDate',
    'CentCode',
  ];
  previewColumns = [
    { field: 'BatchCode', header: 'Batch' },
    { field: 'Activity', header: 'Activity' },
    { field: 'StartDate', header: 'Start' },
    { field: 'EndDate', header: 'End' },
    { field: 'CentCode', header: 'Center' },
    { field: 'Remarks', header: 'Remarks' },
  ];
  columnMapDisplay = Object.keys(this.columnMap).map((k) => ({
    excel: k,
    api: this.columnMap[k],
  }));

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    public router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private authService: AuthService,
    private permissionService: PermissionService,
    private listStateService: ListStateService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Activity' }]);
    this.restoredPage = this.listStateService.consumePage(ACTIVITY_LIST_STATE_KEY);
  }

  goToEdit(row: any): void {
    this.listStateService.savePage(ACTIVITY_LIST_STATE_KEY, this.lastPage);
    this.router.navigate(['/app/activity/create'], {
      state: { activity: row },
    });
  }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      batchCodes: [[]],
      centerCode: [''],
      status: [''],
      fromDate: [null],
      toDate: [null],
    });
    Promise.all([this.loadBatches(), this.loadCenters()]);
  }

  private loadBatches(): Promise<void> {
    return new Promise((resolve) => {
      const role = this.authService.getRole();
      if (role === 'L4') {
        const staffId = this.authService.getStaffId();
        this.commonApi
          .fetchData(
            { tenantId: this.tenantId, staffId },
            'teacher',
            'getstaffmaps',
          )
          .subscribe({
            next: (res: any) => {
              if (res.status && res.data) {
                this.batch_options = (res.data.batches || []).map((b: any) => ({
                  label: `${b.batchName} (${b.batchCode})`,
                  value: b.batchCode,
                }));
              }
              resolve();
            },
            error: () => resolve(),
          });
      } else {
        this.commonApi
          .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
          .subscribe({
            next: (res: any) => {
              this.batch_options = (res?.data || []).map((b: any) => ({
                label: `${b.batchName} (${b.batchCode})`,
                value: b.batchCode,
              }));
              resolve();
            },
            error: () => resolve(),
          });
      }
    });
  }

  private loadCenters(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'ims/center', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.center_options = (res?.data || []).map((c: any) => ({
              label: c.centerName,
              value: c.centerCode,
            }));
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  onProceed(): void {
    const { fromDate, toDate } = this.filterForm.value;
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      this.alert.error('From date cannot be after To date');
      return;
    }
    this.fetchList(1, this.lastLimit);
  }

  fetchList(page: number, limit: number, search?: string): void {
    this.lastPage = page;
    this.lastLimit = limit;
    this.lastSearch = search;
    this.loading = true;
    const { batchCodes, centerCode, status, fromDate, toDate } =
      this.filterForm.value;
    const payload: any = {
      tenantId: this.tenantId,
      page,
      limit,
      sort: '-createdAt',
    };
    if (batchCodes?.length === 1) payload.batchCode = batchCodes[0];
    if (batchCodes?.length > 1) payload.batchCodes = batchCodes;
    if (centerCode) payload.centerCode = centerCode;
    if (status) payload.status = status;
    if (search) payload.search = search;
    if (fromDate) payload.fromDate = new Date(fromDate).setHours(0, 0, 0, 0);
    if (toDate) payload.toDate = new Date(toDate).setHours(23, 59, 59, 999);
    this.commonApi.fetchData(payload, 'institue/activity', 'list').subscribe({
      next: (res: any) => {
        this.dataArray = (res?.data || []).map((a: any) => ({
          ...a,
          startDateFormatted: this.formatDate(a.startDate),
          endDateFormatted: this.formatDate(a.endDate),
          actualStartFormatted: a.actualStartDate
            ? this.formatDate(a.actualStartDate)
            : '-',
          batchLabel: a.batchName && a.batchCode ? `${a.batchName} (${a.batchCode})` : (a.batchName || a.batchCode || ''),
        }));
        this.totalRecords = res?.count || this.dataArray.length;
        this.loading = false;
      },
      error: () => {
        this.alert.error('Error loading activities');
        this.loading = false;
      },
    });
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
  }): void {
    this.fetchList(req.page, req.pageSize, req.search);
  }

  private reloadCurrentPage(): void {
    this.fetchList(this.lastPage, this.lastLimit, this.lastSearch);
  }

  onView(row: any): void {
    this.selectedActivity = row;
    this.openModal('activityViewModal');
  }

  openDeleteModal(row: any): void {
    this.activityToDelete = row;
    this.openModal('activityDeleteModal');
  }

  confirmDelete(): void {
    if (!this.activityToDelete) return;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          activityId: this.activityToDelete.activityId,
        },
        'institue/activity',
        'delete',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Activity deleted successfully');
            this.activityToDelete = null;
            this.closeModal('activityDeleteModal');
            const remaining = this.dataArray.length - 1;
            const reloadPage =
              remaining === 0 && this.lastPage > 1
                ? this.lastPage - 1
                : this.lastPage;

            this.fetchList(reloadPage, this.lastLimit, this.lastSearch);
          }
        },
        error: () => this.alert.error('Error deleting activity'),
      });
  }

  openImportModal(): void {
    this.resetImport();
    this.openModal('activityImportModal');
  }

  resetImport(): void {
    this.fileName = '';
    this.parsedRows = [];
    this.errorRows = [];
    this.isDragging = false;
    this.importLoading = false;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }
  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onImportFileSelected(files: File[]): void {
    const file = files?.[0];
    if (!file) return;
    this.fileName = file.name;
    this.parsedRows = [];
    this.errorRows = [];
    this.processFile(file);
  }

  private processFile(file: File): void {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      this.alert.error('Only .xlsx, .xls or .csv files are allowed');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rawRows.length) {
          this.alert.error('File is empty');
          return;
        }
        const missing = this.requiredColumns.filter(
          (c) => !Object.keys(rawRows[0]).includes(c),
        );
        if (missing.length) {
          this.alert.error(`Missing columns: ${missing.join(', ')}`);
          this.fileName = '';
          return;
        }
        const dateFields = ['StartDate', 'EndDate'];
        this.parsedRows = rawRows.map((row: any) => {
          const mapped: any = {};
          Object.keys(this.columnMap).forEach((col) => {
            const apiKey = this.columnMap[col];
            if (dateFields.includes(apiKey)) {
              mapped[apiKey] = this.formatDateForPreview(row[col]);
            } else {
              mapped[apiKey] = row[col]?.toString().trim() || '';
            }
          });
          return mapped;
        });
        this.validateRows();
      } catch (err: any) {
        this.alert.error('Parse error: ' + (err?.message || 'Unknown'));
        this.fileName = '';
      }
    };
    reader.onerror = () => this.alert.error('Could not read the file');
    reader.readAsArrayBuffer(file);
  }

  private validateRows(): void {
    this.errorRows = [];
    this.parsedRows.forEach((row, i) => {
      const missing = this.requiredColumns.filter(
        (col) => !row[col]?.toString().trim(),
      );
      if (missing.length)
        this.errorRows.push({ rowNo: i + 2, missing: missing.join(', ') });
    });
  }

  isRowError(rowNo: number): boolean {
    return this.errorRows.some((e) => e.rowNo === rowNo);
  }

  submitImport(): void {
    if (!this.parsedRows.length || this.errorRows.length > 0) return;
    this.importLoading = true;
    const rows = this.parsedRows.map((row) => ({
      ...row,
      StartDate: this.parseDDMMMYYYY(row.StartDate),
      EndDate: this.parseDDMMMYYYY(row.EndDate),
      sno: Math.random().toString(36).substring(2, 10).toUpperCase(),
    }));
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, rows },
        'institue/activity',
        'bulkupload',
      )
      .subscribe({
        next: (res: any) => {
          this.importLoading = false;
          if (res?.status) {
            this.alert.success(
              `${this.parsedRows.length} activity(s) imported successfully`,
            );
            this.closeModal('activityImportModal');
            this.resetImport();
            this.reloadCurrentPage();
          } else {
            this.alert.error(res?.message || 'Import failed');
          }
        },
        error: () => {
          this.importLoading = false;
          this.alert.error('Error importing activity data');
        },
      });
  }

  downloadTemplate(): void {
    const sample = [
      {
        BatchCode: '1154A3',
        Activity: 'Phase 4 Orientation',
        StartDate: '12-Mar-2026',
        EndDate: '12-Mar-2026',
        Remarks: 'Mandatory for all new joins',
        CentCode: '64',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Import');
    XLSX.writeFile(wb, 'activity_import_template.xlsx');
  }

  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) new (window as any).bootstrap.Modal(el).show();
  }

  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }

  private formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatDateForPreview(raw: any): string {
    const ms = this.parseDDMMMYYYY(raw);
    if (!ms) return raw?.toString().trim() || '';
    const d = new Date(ms);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${d.getUTCDate().toString().padStart(2, '0')}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
  }

  private parseDDMMMYYYY(dateStr: any): number | null {
    if (dateStr instanceof Date && !isNaN(dateStr.getTime()))
      return Date.UTC(
        dateStr.getFullYear(),
        dateStr.getMonth(),
        dateStr.getDate(),
      );
    if (
      typeof dateStr === 'number' &&
      Number.isFinite(dateStr) &&
      dateStr > 59 &&
      dateStr < 2958466
    ) {
      const ms = (Math.round(dateStr) - 25569) * 86400 * 1000;
      const d = new Date(ms);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    const raw =
      dateStr === undefined || dateStr === null ? '' : String(dateStr).trim();
    if (!raw) return null;
    if (/^\d{5,6}(\.\d+)?$/.test(raw)) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 59 && n < 2958466) {
        const ms = (Math.round(n) - 25569) * 86400 * 1000;
        const d = new Date(ms);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      }
    }
    const s = raw.split(/[\sT]/)[0].trim();
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const [, y, mo, dd] = iso.map(Number);
      if (mo < 1 || mo > 12 || dd < 1 || dd > 31) return null;
      return Date.UTC(y, mo - 1, dd);
    }
    const named = s.match(
      /^(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{2}|\d{4})$/,
    );
    if (named) {
      const months: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      const dd = Number(named[1]);
      const mo = months[named[2].slice(0, 3).toLowerCase()];
      let yyyy = Number(named[3]);
      if (yyyy < 100) yyyy += yyyy < 50 ? 2000 : 1900;
      if (mo === undefined || dd < 1 || dd > 31 || yyyy < 1900) return null;
      return Date.UTC(yyyy, mo, dd);
    }
    return null;
  }

  onRowSelected(row: any) {
    // Row click bypasses the View icon's `show` gate — same open-modal path
    // as onView(), so it needs the same check independently.
    if (!this.permissionService.hasPermission('activity:view')) return;
    this.selectedActivity = row;
    this.openModal('activityViewModal');
  }

  onClearFilters(): void {
    this.filterForm.reset({
      batchCodes: [],
      centerCode: '',
      status: '',
      fromDate: null,
      toDate: null,
    });
    this.dataArray = [];
    this.totalRecords = 0;
  }
}
