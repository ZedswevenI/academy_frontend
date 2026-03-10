import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as XLSX from 'xlsx';
import { finalize } from 'rxjs/operators';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

@Component({
  selector: 'app-schoolexams',
  standalone: false,
  templateUrl: './schoolexams.component.html',
  styleUrl: './schoolexams.component.scss'
})
export class SchoolexamsComponent implements OnInit {
  private moduleName = 'ims';
  entiId: any;

  form!: FormGroup;

  // ── Dropdown options ─────────────────────────────────────────────────────
  classOptions = Array.from({ length: 8 }, (_, i) => 6 + i).map((n) => ({
    label: `Class ${n}`,
    value: n,
  }));

  statusOptions = [
    { label: 'Planned',   value: 'PLANNED'   },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  // ── Table ────────────────────────────────────────────────────────────────
  loading      = false;
  totalRecords = 0;
  tableData: any[] = [];

  columns = [
    { key: 'examName',    label: 'Exam Name',      sortable: true  },
    { key: 'academicYear',label: 'Academic Year',  sortable: true  },
    { key: 'classNo',     label: 'Class',          sortable: true  },
    { key: 'startDate',   label: 'Start Date',     sortable: false },
    { key: 'endDate',     label: 'End Date',       sortable: false },
    { key: 'status',      label: 'Status',         sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      callback: (r: any) => this.edit(r),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      callback: (r: any) => this.openDelete(r),
    },
  ];

  // ── Create / Edit modal ──────────────────────────────────────────────────
  showForm  = false;
  formMode: 'create' | 'edit' = 'create';
  saving    = false;

  // ── Delete modal ─────────────────────────────────────────────────────────
  deleteModalVisible = false;
  deleteTarget: any  = null;
  deleteMessage      = '';

  // ── Import ───────────────────────────────────────────────────────────────
  showImport        = false;
  importFileName    = '';
  importPreviewRows: any[] = [];
  importHasInvalidRows = false;
  importInvalidCount   = 0;
  importing            = false;

  constructor(
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([
      { label: 'Control Panel' },
      { label: 'Masters' },
      { label: 'School Exams' },
    ]);
  }

  ngOnInit(): void {
    this.initForm();
    this.fetchTableData({ page: 1, pageSize: 10 });
  }

  // ── Form init ────────────────────────────────────────────────────────────
  private initForm() {
    this.form = this.fb.group({
      examId:       [null],
      examName:     ['', [Validators.required, Validators.maxLength(120)]],
      academicYear: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{4}$/)]],
      classNo:      [null, Validators.required],
      startDate:    [''],
      endDate:      [''],
      status:       ['PLANNED'],
    });
  }

  // ── List ─────────────────────────────────────────────────────────────────
  fetchTableData(event?: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    const page  = event?.page     || 1;
    const limit = event?.pageSize || 10;

    const payload: any = { entiId: this.entiId, page, limit };

    this.loading = true;

    this.commonApi
      .fetchData(payload, this.moduleName, 'school/exam/list')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          this.totalRecords = res?.count || 0;

          this.tableData = rows.map((x: any) => ({
            examId:      x.examId,
            examName:    x.examName    || '—',
            academicYear:x.academicYear|| '—',
            classNo:     x.classNo     != null ? `Class ${x.classNo}` : '—',
            startDate:   x.startDate   ? this.epochToDate(x.startDate) : '—',
            endDate:     x.endDate     ? this.epochToDate(x.endDate)   : '—',
            status:      x.status      || 'PLANNED',
            _raw: x,
          }));
        },
        error: () => this.alert.error('Failed to load school exams'),
      });
  }

  // ── Add ──────────────────────────────────────────────────────────────────
  add() {
    this.formMode = 'create';
    this.form.reset({
      examId:       null,
      examName:     '',
      academicYear: '',
      classNo:      null,
      startDate:    '',
      endDate:      '',
      status:       'PLANNED',
    });
    this.showForm = true;
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  edit(row: any) {
    const x = row?._raw || row;
    this.formMode = 'edit';
    this.form.patchValue({
      examId:       x.examId,
      examName:     x.examName     || '',
      academicYear: x.academicYear || '',
      classNo:      x.classNo      ?? null,
      startDate:    x.startDate    ? this.epochToInputDate(x.startDate) : '',
      endDate:      x.endDate      ? this.epochToInputDate(x.endDate)   : '',
      status:       x.status       || 'PLANNED',
    });
    this.showForm = true;
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  save() {
    if (this.saving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alert.error('Please fill required fields');
      return;
    }

    const v = this.form.value || {};

    // Validate date range
    if (v.startDate && v.endDate) {
      const sd = new Date(v.startDate).getTime();
      const ed = new Date(v.endDate).getTime();
      if (sd > ed) {
        this.alert.error('Start date cannot be after end date');
        return;
      }
    }

    const payload: any = {
      entiId:       this.entiId,
      userId:       localStorage.getItem('userId') || '',
      examName:     (v.examName     || '').toString().trim(),
      academicYear: (v.academicYear || '').toString().trim(),
      classNo:      Number(v.classNo),
      startDate:    v.startDate ? new Date(v.startDate).getTime() : null,
      endDate:      v.endDate   ? new Date(v.endDate).getTime()   : null,
      status:       v.status    || 'PLANNED',
    };

    const endpoint = this.formMode === 'create' ? 'school/exam/create' : 'school/exam/update';
    if (this.formMode === 'edit') payload.examId = v.examId;

    this.saving = true;

    this.commonApi
      .fetchData(payload, this.moduleName, endpoint)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.status === false) {
            this.alert.error(res?.message || 'Save failed');
            return;
          }
          this.alert.success(this.formMode === 'create' ? 'School exam created' : 'School exam updated');
          this.showForm = false;
          this.fetchTableData({ page: 1, pageSize: 10 });
        },
        error: (err: any) => this.alert.error(err?.error?.message || 'Save failed'),
      });
  }

  cancel() {
    if (this.saving) return;
    this.showForm = false;
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  openDelete(row: any) {
    const x = row?._raw || row;
    this.deleteTarget  = { examId: x.examId, examName: x.examName };
    this.deleteMessage = `Are you sure you want to delete "${x.examName}"?`;
    this.deleteModalVisible = true;
  }

  onDeleteModalClosed(confirmed: boolean) {
    this.deleteModalVisible = false;
    if (!confirmed || !this.deleteTarget) return;

    const payload = {
      entiId:  this.entiId,
      userId:  localStorage.getItem('userId') || '',
      examId:  this.deleteTarget.examId,
    };

    this.commonApi
      .fetchData(payload, this.moduleName, 'school/exam/delete')
      .subscribe({
        next: (res: any) => {
          if (res?.status === false) {
            this.alert.error(res?.message || 'Delete failed');
            return;
          }
          this.alert.success('School exam deleted');
          this.fetchTableData({ page: 1, pageSize: 10 });
        },
        error: (err: any) => this.alert.error(err?.error?.message || 'Delete failed'),
      });

    this.deleteTarget = null;
  }

  // ── Import ────────────────────────────────────────────────────────────────
  openImport() {
    if (this.importing) return;
    this.showImport = true;
    this.resetImport();
  }

  closeImport() {
    if (this.importing) return;
    this.showImport = false;
  }

  resetImport() {
    if (this.importing) return;
    this.importFileName      = '';
    this.importPreviewRows   = [];
    this.importHasInvalidRows = false;
    this.importInvalidCount  = 0;
  }

  onExcelSelected(ev: any) {
    if (this.importing) return;
    const file: File = ev?.target?.files?.[0];
    if (!file) return;

    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.alert.error('Please upload a valid Excel file (.xlsx / .xls)');
      return;
    }

    this.importFileName = file.name;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb  = XLSX.read(e.target.result, { type: 'binary' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
        this.importPreviewRows = raw.map((r, idx) => this.mapExcelRow(r, idx + 2));
        this.computeImportValidation();
      } catch {
        this.alert.error('Unable to read Excel file');
        this.importPreviewRows = [];
        this.computeImportValidation();
      }
    };
    reader.onerror = () => this.alert.error('Unable to read file');
    reader.readAsBinaryString(file);
  }

  private mapExcelRow(r: any, rowNo: number) {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '')
          return String(r[k]).trim();
      }
      return '';
    };

    const examName    = get('Exam Name', 'ExamName', 'examName');
    const academicYear = get('Academic Year', 'AcademicYear', 'academicYear');
    const classRaw    = get('Class', 'classNo', 'ClassNo');
    const classNo     = Number(String(classRaw).trim());
    const statusRaw   = get('Status', 'status').toUpperCase() || 'PLANNED';
    const VALID_STATUS = ['PLANNED', 'COMPLETED', 'CANCELLED'];
    const status      = VALID_STATUS.includes(statusRaw) ? statusRaw : 'PLANNED';

    // Parse dates — accept DD-MM-YYYY, YYYY-MM-DD, or Excel serial numbers
    const parseDateToEpoch = (val: string): number | null => {
      if (!val) return null;
      // Excel serial number
      const serial = Number(val);
      if (!isNaN(serial) && serial > 40000) {
        return new Date(Math.round((serial - 25569) * 86400 * 1000)).getTime();
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.getTime();
    };

    const startDateRaw = get('Start Date', 'StartDate', 'startDate');
    const endDateRaw   = get('End Date', 'EndDate', 'endDate');
    const startDate    = parseDateToEpoch(startDateRaw);
    const endDate      = parseDateToEpoch(endDateRaw);

    const errors: string[] = [];

    if (!examName)    errors.push('Exam Name required');
    if (!academicYear || !/^\d{4}-\d{4}$/.test(academicYear))
      errors.push('Academic Year must be YYYY-YYYY');
    if (!Number.isFinite(classNo) || classNo < 6 || classNo > 13)
      errors.push('Invalid Class (6–13)');
    if (startDate && endDate && startDate > endDate)
      errors.push('Start Date after End Date');

    return {
      _rowNo:      rowNo,
      _valid:      errors.length === 0,
      _errors:     errors,
      examName,
      academicYear,
      classNo:     Number.isFinite(classNo) ? classNo : classRaw,
      startDate,
      endDate,
      startDateLabel: startDateRaw || '—',
      endDateLabel:   endDateRaw   || '—',
      status,
    };
  }

  private computeImportValidation() {
    const invalid = (this.importPreviewRows || []).filter(x => !x._valid);
    this.importInvalidCount   = invalid.length;
    this.importHasInvalidRows = invalid.length > 0;
  }

  confirmImport() {
    if (this.importing) return;
    if (!this.importPreviewRows.length) { this.alert.error('Upload an Excel file first'); return; }
    if (this.importHasInvalidRows)      { this.alert.error('Fix invalid rows before importing'); return; }

    const rows = this.importPreviewRows.map(x => ({
      examName:     (x.examName     || '').toString().trim(),
      academicYear: (x.academicYear || '').toString().trim(),
      classNo:      Number(x.classNo),
      startDate:    x.startDate || null,
      endDate:      x.endDate   || null,
      status:       x.status    || 'PLANNED',
    }));

    const payload = { entiId: this.entiId, userId: localStorage.getItem('userId') || '', rows };

    this.importing = true;

    this.commonApi
      .fetchData(payload, this.moduleName, 'school/exam/import')
      .pipe(finalize(() => (this.importing = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.status === false) { this.alert.error(res?.message || 'Import failed'); return; }
          const inserted = res?.data?.inserted ?? 0;
          const updated  = res?.data?.updated  ?? 0;
          this.alert.success(`Import completed — Inserted: ${inserted}, Updated: ${updated}`);
          this.showImport = false;
          this.resetImport();
          this.fetchTableData({ page: 1, pageSize: 10 });
        },
        error: (err: any) => this.alert.error(err?.error?.message || 'Import failed'),
      });
  }

  downloadSampleExcel() {
    const rows = [
      { 'Exam Name': 'Midterm', 'Academic Year': '2025-2026', 'Class': 9,  'Start Date': '2025-09-01', 'End Date': '2025-09-05', 'Status': 'PLANNED' },
      { 'Exam Name': 'Quarterly', 'Academic Year': '2025-2026', 'Class': 10, 'Start Date': '2025-10-10', 'End Date': '2025-10-15', 'Status': 'PLANNED' },
      { 'Exam Name': 'Annual', 'Academic Year': '2025-2026', 'Class': 11, 'Start Date': '',            'End Date': '',            'Status': 'PLANNED' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SchoolExams');
    XLSX.writeFile(wb, 'SchoolExam_Import_Sample.xlsx');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private epochToDate(epoch: number): string {
    return new Date(epoch).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  private epochToInputDate(epoch: number): string {
    return new Date(epoch).toISOString().split('T')[0];
  }
}
