import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-ptm',
  standalone: false,
  templateUrl: './ptm.component.html',
  styleUrl: './ptm.component.scss'
})
export class PtmComponent implements OnInit {

  ptmForm!: FormGroup;
  isProceed = false;
  loading = false;
  tenantId: any;

  dataArray: any[] = [];
  totalRecords = 0;

  // Dropdown options
  batch_options: any[] = [];
  status_options = [
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  columnsArray = [
    { key: 'ptmDateFormatted', label: 'PTM Date', sortable: true },
    { key: 'startFormatted', label: 'Start Time', sortable: false },
    { key: 'endFormatted', label: 'End Time', sortable: false },
    { key: 'durationMins', label: 'Duration (min)', sortable: false },
    { key: 'meetingMode', label: 'Mode', sortable: false },
    { key: 'venue', label: 'Venue', sortable: false },
    { key: 'status', label: 'Status', sortable: false }
  ];

  // Column map: Excel header → API payload key
  columnMap: { [excelCol: string]: string } = {
    'CCode': 'CCode',
    'Batch Code': 'Batch Code',
    'Eno': 'Eno',
    'Student Name': 'Student Name',
    'PTM Date': 'PTM Date',
    'PTM Start Time': 'PTM Start Time',
    'PTM End Time': 'PTM End Time',
    'Duration': 'Duration',
    'Content': 'Content',
    'Venue': 'Venue'
  };

  // For display in the modal
  columnMapDisplay = Object.keys(this.columnMap).map(k => ({
    excel: k,
    api: this.columnMap[k]
  }));

  requiredColumns = Object.keys(this.columnMap);

  onImportFileSelected(files: File[]): void {
    const file = files?.[0];
    if (!file) return;
    this.processFile(file);  // ← call processFile directly, not readExcelFile
  }

  private readExcelFile(file: File): void {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = (window as any).XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[] = (window as any).XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawRows.length) {
          this.alert.error('File is empty');
          return;
        }

        // Check for missing columns
        const fileColumns = Object.keys(rawRows[0]);
        const missing = this.requiredColumns.filter(c => !fileColumns.includes(c));
        if (missing.length > 0) {
          this.alert.error(`Missing columns: ${missing.join(', ')}`);
          this.fileName = '';
          return;
        }

        // Map Excel columns → API keys
        this.parsedRows = rawRows.map((row: any) => {
          const mapped: any = {};
          Object.keys(this.columnMap).forEach(excelCol => {
            mapped[this.columnMap[excelCol]] = row[excelCol]?.toString().trim() || '';
          });
          return mapped;
        });

        this.validateRows();
      } catch {
        this.alert.error('Error reading file. Please check the format.');
        this.fileName = '';
      }
    };

    reader.readAsArrayBuffer(file);
  }

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.onView(row)
    },
    // {
    //   type: 'icon',
    //   icon: 'fa-regular fa-pen-to-square',
    //   tooltip: 'Edit',
    //   color: '#6B7280',
    //   hoverColor: '#16A34A',
    //   callback: (row: any) => this.router.navigate(['/app/ptm/create'], { state: { ptm: row } })
    // },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      callback: (row: any) => this.openDeleteModal(row)
    }
  ];

  isDragging = false;
  fileName = '';
  importLoading = false;
  parsedRows: any[] = [];
  errorRows: any[] = [];

  // requiredColumns = [
  //   'CCode', 'Batch Code', 'Eno', 'Student Name',
  //   'PTM Date', 'PTM Start Time', 'PTM End Time',
  //   'Duration', 'Content', 'Venue'
  // ];

  previewColumns = [
    { field: 'CCode', header: 'C.Code' },
    { field: 'Batch Code', header: 'Batch' },
    { field: 'Eno', header: 'Enroll No' },
    { field: 'Student Name', header: 'Student' },
    { field: 'PTM Date', header: 'Date' },
    { field: 'PTM Start Time', header: 'Start' },
    { field: 'PTM End Time', header: 'End' },
    { field: 'Duration', header: 'Dur.(min)' },
    { field: 'Content', header: 'Content' },
    { field: 'Venue', header: 'Venue' }
  ];


  openDeleteModal(row: any): void {
    this.ptmToDelete = row;
    const modalEl = document.getElementById('ptmDeleteModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  // Delete modal state
  ptmToDelete: any = null;

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'PTM' }]);
  }

  ngOnInit(): void {
    this.ptmForm = this.fb.group({
      batchCode: [''],
      status: ['']
    });

    this.loadBatches();
  }

  // ====================================================
  // LOAD BATCHES
  // ====================================================

  private loadBatches(): void {
    this.commonApi.fetchData(
      { entiId: this.tenantId },
      'batch',
      'list?list=full'
    ).subscribe({
      next: (res: any) => {
        this.batch_options = (res?.data || []).map((b: any) => ({
          label: b.batchName,
          value: b.batchCode
        }));
      },
      error: () => this.alert.error('Error loading batches')
    });
  }

  // ====================================================
  // PROCEED — fetch PTM list
  // ====================================================

  onProceed(): void {
    if (this.ptmForm.invalid) return;

    this.isProceed = true;
    this.fetchPTMList(1, 10);
  }

  fetchPTMList(page: number, limit: number, search?: string): void {
    const { batchCode, status } = this.ptmForm.value;

    this.loading = true;

    const body = { tenantId: this.tenantId };
    const query = `list?batchCode=${batchCode}&status=${status}&page=${page}&limit=${limit}${search ? '&search=' + search : ''}`;

    this.commonApi.fetchData(body, 'ims/ptm', query)
      .subscribe({
        next: (res: any) => {
          const raw: any[] = res?.data || [];

          this.dataArray = raw.map((p: any) => ({
            ...p,
            ptmDateFormatted: this.formatDate(p.ptmDate),
            startFormatted: this.formatTime(p.startTime),
            endFormatted: this.formatTime(p.endTime)
          }));

          this.totalRecords = res?.count || this.dataArray.length;
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading PTM list');
          this.loading = false;
        }
      });
  }

  // ====================================================
  // TABLE EVENTS
  // ====================================================

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }): void {
    // if (!this.isProceed) return;
    this.fetchPTMList(req.page, req.pageSize, req.search);
  }

  // ====================================================
  // ACTIONS
  // ====================================================

  onAction(event: { action: string; row: any }): void {
    const { action, row } = event;

    if (action === 'view') {
      this.onView(row);
    }

    if (action === 'edit') {
      this.router.navigate(['/app/ptm/create'], { state: { ptm: row } });
    }

    if (action === 'delete') {
      this.ptmToDelete = row;
      const modalEl = document.getElementById('ptmDeleteModal');
      if (modalEl) {
        const modal = new (window as any).bootstrap.Modal(modalEl);
        modal.show();
      }
    }
  }

  confirmDelete(): void {
    if (!this.ptmToDelete) return;

    const body = {
      tenantId: this.tenantId,
      ptmId: this.ptmToDelete.ptmId
    };

    this.commonApi.fetchData(body, 'ims/ptm', 'remove')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('PTM deleted successfully');
            this.dataArray = this.dataArray.filter(d => d.ptmId !== this.ptmToDelete.ptmId);
            this.totalRecords = this.dataArray.length;
            this.ptmToDelete = null;
          }
        },
        error: () => this.alert.error('Error deleting PTM')
      });
  }

  // View — show details modal
  selectedPtm: any = null;

  onView(row: any): void {
    this.selectedPtm = row;
    const modalEl = document.getElementById('ptmViewModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  // ====================================================
  // HELPERS
  // ====================================================

  private formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  private formatTime(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  openImportModal(): void {
    this.resetImport();
    this.openModal('ptmImportModal');
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  private processFile(file: File): void {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      this.alert.error('Only .xlsx, .xls or .csv files are allowed');
      return;
    }

    this.fileName = file.name;
    this.parsedRows = [];
    this.errorRows = [];

    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // ✅ Log what's coming from the file
        console.log('Total rows parsed:', rows.length);
        console.log('First row:', rows[0]);
        console.log('Column keys found:', rows[0] ? Object.keys(rows[0]) : 'no rows');
        console.log('Required columns:', this.requiredColumns);

        if (rows.length === 0) {
          this.alert.error('File is empty');
          this.fileName = '';
          return;
        }

        const fileColumns = Object.keys(rows[0]);
        const missing = this.requiredColumns.filter(c => !fileColumns.includes(c));

        console.log('Missing columns:', missing);

        if (missing.length > 0) {
          this.alert.error(`Missing columns: ${missing.join(', ')}`);
          this.fileName = '';
          return;
        }

        this.parsedRows = rows;
        this.validateRows();

      } catch (err: any) {
        // ✅ Show real error
        console.error('Full parse error:', err);
        this.alert.error('Parse error: ' + (err?.message ?? JSON.stringify(err)));
        this.fileName = '';
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader failed:', err);
      this.alert.error('Could not read file');
    };

    reader.readAsArrayBuffer(file);
  }

  private validateRows(): void {
    this.errorRows = [];
    this.parsedRows.forEach((row, i) => {
      const missing = this.requiredColumns.filter(col => !row[col]?.toString().trim());
      if (missing.length > 0) {
        this.errorRows.push({ rowNo: i + 2, missing: missing.join(', ') });
      }
    });
  }

  submitImport(): void {
    if (!this.parsedRows.length || this.errorRows.length > 0) return;

    this.importLoading = true;
    const payload = { tenantId: this.tenantId, rows: this.parsedRows };

    this.commonApi.fetchData(payload, 'ims/ptm/schedule', 'import')
      .subscribe({
        next: (res: any) => {
          this.importLoading = false;
          if (res?.status) {
            this.alert.success(`${this.parsedRows.length} PTM(s) imported successfully`);
            this.closeModal('ptmImportModal');
            this.resetImport();
            if (this.isProceed) this.fetchPTMList(1, 10);
          } else {
            this.alert.error(res?.message || 'Import failed');
          }
        },
        error: () => {
          this.importLoading = false;
          this.alert.error('Error importing PTM data');
        }
      });
  }

  downloadTemplate(): void {
    const sample = [{
      'CCode': '64', 'Batch Code': 'COIFR259A01', 'Eno': '902164259005',
      'Student Name': 'Rajesh', 'PTM Date': '2026-03-01',
      'PTM Start Time': '10:00:00', 'PTM End Time': '10:15:00',
      'Duration': '15', 'Content': 'Maths & Physics focus', 'Venue': 'Room 10'
    }];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PTM Import');
    XLSX.writeFile(wb, 'ptm_import_template.xlsx');
  }

  // ====================================================
  // HELPERS
  // ====================================================

  isRowError(rowNo: number): boolean {
    return this.errorRows.some(e => e.rowNo === rowNo);
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