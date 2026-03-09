import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-activity',
  standalone: false,
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss'
})
export class ActivityComponent implements OnInit {

  filterForm!: FormGroup;
  loading = false;
  tenantId: any;

  dataArray: any[] = [];
  totalRecords = 0;

  // ── Track current page so delete + modal actions reload same page ─────────
  private lastPage   = 1;
  private lastLimit  = 10;
  private lastSearch?: string;

  // Dropdowns
  batch_options: any[] = [];
  center_options: any[] = [];
  status_options = [
    { label: 'Planned',     value: 'PLANNED'     },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed',   value: 'COMPLETED'   },
    { label: 'Cancelled',   value: 'CANCELLED'   }
  ];

  columnsArray = [
    { key: 'activityName',        label: 'Activity',     sortable: true  },
    { key: 'startDateFormatted',  label: 'Start Date',   sortable: false },
    { key: 'endDateFormatted',    label: 'End Date',      sortable: false },
    { key: 'actualStartFormatted',label: 'Actual Start', sortable: false },
    { key: 'remarks',             label: 'Remarks',      sortable: false },
    { key: 'status',              label: 'Status',       sortable: false }
  ];

  actions = [
    {
      type: 'icon', icon: 'fa-regular fa-eye',
      tooltip: 'View', color: '#6B7280', hoverColor: '#0066FF',
      callback: (row: any) => this.onView(row)
    },
    {
      type: 'icon', icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit', color: '#6B7280', hoverColor: '#16A34A',
      callback: (row: any) => this.router.navigate(['/app/activity/create'], { state: { activity: row } })
    },
    {
      type: 'icon', icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete', color: '#6B7280', hoverColor: '#DC2626',
      callback: (row: any) => this.openDeleteModal(row)
    }
  ];

  // View modal
  selectedActivity: any = null;

  // Delete modal
  activityToDelete: any = null;

  // ── Import ─────────────────────────────────────────────────────────────────
  isDragging    = false;
  fileName      = '';
  importLoading = false;
  parsedRows:   any[] = [];
  errorRows:    any[] = [];

  columnMap: { [key: string]: string } = {
    'BatchCode': 'BatchCode', 'Activity': 'Activity',
    'StartDate': 'StartDate', 'EndDate': 'EndDate',
    'Remarks': 'Remarks', 'CentCode': 'CentCode',
    'sno': 'sno', 'ActualStartDate': 'ActualStartDate', 'ActualEndDate': 'ActualEndDate'
  };

  requiredColumns = ['BatchCode', 'Activity', 'StartDate', 'EndDate', 'CentCode', 'sno'];

  previewColumns = [
    { field: 'BatchCode', header: 'Batch'    },
    { field: 'Activity',  header: 'Activity' },
    { field: 'StartDate', header: 'Start'    },
    { field: 'EndDate',   header: 'End'      },
    { field: 'CentCode',  header: 'Center'   },
    { field: 'Remarks',   header: 'Remarks'  },
    { field: 'sno',       header: 'S.No'     }
  ];

  columnMapDisplay = Object.keys(this.columnMap).map(k => ({ excel: k, api: this.columnMap[k] }));

  constructor(
    private breadcrump: BredcrumpService,
    private fb:         FormBuilder,
    public  router:     Router,
    private commonApi:  CommonapiService,
    private alert:      AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Activity' }]);
  }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      batchCode:  [''],
      centerCode: [''],
      status:     ['']
    });

    Promise.all([this.loadBatches(), this.loadCenters()]);
  }

  // ====================================================
  // DROPDOWNS
  // ====================================================

  private loadBatches(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full').subscribe({
        next:  (res: any) => { this.batch_options  = (res?.data || []).map((b: any) => ({ label: b.batchName,  value: b.batchCode  })); resolve(); },
        error: () => resolve()
      });
    });
  }

  private loadCenters(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/center', 'list?list=full').subscribe({
        next:  (res: any) => { this.center_options = (res?.data || []).map((c: any) => ({ label: c.centerName, value: c.centerCode })); resolve(); },
        error: () => resolve()
      });
    });
  }

  // ====================================================
  // LIST
  // ====================================================

  onProceed(): void {
    this.fetchList(1, 5);
  }

  fetchList(page: number, limit: number, search?: string): void {
    // Always persist so any reload (delete, import) comes back to same page
    this.lastPage   = page;
    this.lastLimit  = limit;
    this.lastSearch = search;

    const { batchCode, centerCode, status } = this.filterForm.value;
    this.loading = true;

    let query = `list?page=${page}&limit=${limit}`;
    if (batchCode)  query += `&batchCode=${batchCode}`;
    if (centerCode) query += `&centerCode=${centerCode}`;
    if (status)     query += `&status=${status}`;
    if (search)     query += `&search=${search}`;

    this.commonApi.fetchData({ tenantId: this.tenantId }, 'institue/activity', query).subscribe({
      next: (res: any) => {
        this.dataArray = (res?.data || []).map((a: any) => ({
          ...a,
          startDateFormatted:   this.formatDate(a.startDate),
          endDateFormatted:     this.formatDate(a.endDate),
          actualStartFormatted: a.actualStartDate ? this.formatDate(a.actualStartDate) : '-'
        }));
        this.totalRecords = res?.count || this.dataArray.length;
        this.loading = false;
      },
      error: () => { this.alert.error('Error loading activities'); this.loading = false; }
    });
  }

  loadTableData(req: { page: number; pageSize: number; search?: string }): void {
    this.fetchList(req.page, req.pageSize, req.search);
  }

  private reloadCurrentPage(): void {
    this.fetchList(this.lastPage, this.lastLimit, this.lastSearch);
  }

  // ====================================================
  // VIEW
  // ====================================================

  onView(row: any): void {
    this.selectedActivity = row;
    this.openModal('activityViewModal');
  }

  // ====================================================
  // DELETE
  // ====================================================

  openDeleteModal(row: any): void {
    this.activityToDelete = row;
    this.openModal('activityDeleteModal');
  }

  confirmDelete(): void {
    if (!this.activityToDelete) return;

    this.commonApi.fetchData(
      { tenantId: this.tenantId, activityId: this.activityToDelete.activityId },
      'institue/activity', 'delete'
    ).subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Activity deleted successfully');
          this.activityToDelete = null;
          this.closeModal('activityDeleteModal');

          // If deleted last item on a page > 1, go back one page
          const remaining = this.dataArray.length - 1;
          const reloadPage = remaining === 0 && this.lastPage > 1
            ? this.lastPage - 1
            : this.lastPage;

          this.fetchList(reloadPage, this.lastLimit, this.lastSearch);
        }
      },
      error: () => this.alert.error('Error deleting activity')
    });
  }

  // ====================================================
  // IMPORT
  // ====================================================

  openImportModal(): void {
    this.resetImport();
    this.openModal('activityImportModal');
  }

  resetImport(): void {
    this.fileName     = '';
    this.parsedRows   = [];
    this.errorRows    = [];
    this.isDragging   = false;
    this.importLoading = false;
  }

  onDragOver(event: DragEvent): void  { event.preventDefault(); this.isDragging = true; }
  onDragLeave(): void                  { this.isDragging = false; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onImportFileSelected(files: File[]): void {
    const file = files?.[0];
    if (!file) return;
    this.fileName   = file.name;
    this.parsedRows = [];
    this.errorRows  = [];
    this.processFile(file);
  }

  private processFile(file: File): void {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      this.alert.error('Only .xlsx, .xls or .csv files are allowed'); return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data      = new Uint8Array(e.target.result);
        const workbook  = XLSX.read(data, { type: 'array' });
        const sheet     = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawRows.length) { this.alert.error('File is empty'); return; }

        const missing = this.requiredColumns.filter(c => !Object.keys(rawRows[0]).includes(c));
        if (missing.length) {
          this.alert.error(`Missing columns: ${missing.join(', ')}`);
          this.fileName = ''; return;
        }

        this.parsedRows = rawRows.map((row: any) => {
          const mapped: any = {};
          Object.keys(this.columnMap).forEach(col => {
            mapped[this.columnMap[col]] = row[col]?.toString().trim() || '';
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
      const missing = this.requiredColumns.filter(col => !row[col]?.toString().trim());
      if (missing.length) this.errorRows.push({ rowNo: i + 2, missing: missing.join(', ') });
    });
  }

  isRowError(rowNo: number): boolean {
    return this.errorRows.some(e => e.rowNo === rowNo);
  }

  submitImport(): void {
    if (!this.parsedRows.length || this.errorRows.length > 0) return;
    this.importLoading = true;

    this.commonApi.fetchData({ tenantId: this.tenantId, rows: this.parsedRows }, 'institue/activity', 'bulkupload')
      .subscribe({
        next: (res: any) => {
          this.importLoading = false;
          if (res?.status) {
            this.alert.success(`${this.parsedRows.length} activity(s) imported successfully`);
            this.closeModal('activityImportModal');
            this.resetImport();
             this.reloadCurrentPage();  // ← stays on current page
          } else {
            this.alert.error(res?.message || 'Import failed');
          }
        },
        error: () => { this.importLoading = false; this.alert.error('Error importing activity data'); }
      });
  }

  downloadTemplate(): void {
    const sample = [{
      'BatchCode': '1154A3', 'Activity': 'Phase 4 Orientation',
      'StartDate': '2018-10-17 00:00:00', 'EndDate': '2019-01-06 00:00:00',
      'Remarks': 'Mandatory for all new joins', 'CentCode': '64',
      'sno': '1', 'ActualStartDate': 'NULL', 'ActualEndDate': 'NULL'
    }];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Import');
    XLSX.writeFile(wb, 'activity_import_template.xlsx');
  }

  // ====================================================
  // HELPERS
  // ====================================================

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
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}