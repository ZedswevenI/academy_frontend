import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AuthService } from '../../../../service/auth/auth.service';
 
const safeTrim = (v: any): string => (v == null ? '' : String(v).trim());
 
// Non-subject columns — everything else treated as subject
const META_COLS = new Set([
  'exam name','examname','exam date','examdate',
  'student eno','studenteno','student_eno','enrollment no',
  'student id','studentid','student_id','student name',
  'studentname','name','class','classno','total marks','totalmarks','total'
]);
const isMetaCol = (col: string) => META_COLS.has(safeTrim(col).toLowerCase());
 
const parseMarks = (val: any): { marks: number | null; isAbsent: boolean } => {
  if (val === null || val === undefined || val === '') return { marks: null, isAbsent: false };
  const s = safeTrim(String(val)).toUpperCase();
  if (['AB','ABS','ABSENT','-'].includes(s)) return { marks: null, isAbsent: true };
  const n = Number(String(val).replace(/,/g, '').trim());
  return { marks: Number.isFinite(n) ? n : null, isAbsent: false };
};
 
const parseExcelDate = (val: any): number | null => {
  if (!val) return null;
  if (typeof val === 'number' && val > 1000) {
    const ms = (val - 25569) * 86400 * 1000;
    const d  = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const s = safeTrim(String(val));
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime();
};
 
const epochToDateStr = (ms: number): string => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
};
 
const dateStrToEpoch = (s: string): number | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

@Component({
  selector: 'app-schoolexams',
  standalone: false,
  templateUrl: './schoolexams.component.html',
  styleUrl: './schoolexams.component.scss'
})
export class SchoolexamsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly moduleName = 'school';
 
  tenantId = '';
  loading  = false;
 
  // ── List state ────────────────────────────────────────────────────────────
  exams:        any[] = [];
  totalRecords  = 0;
  currentPage   = 1;
  pageSize      = 10;
  hasSearched   = false;
 
  // ── Filters ───────────────────────────────────────────────────────────────
  filterExamName    = '';
  filterBatchCode   = '';
  filterAcademicYear= '';
 
  // ── Batch / center dropdowns ──────────────────────────────────────────────
  batchesFull:  any[] = [];
  centersFull:  any[] = [];
 
  // ── Upload modal ──────────────────────────────────────────────────────────
  showUpload    = false;
  uploading     = false;
  parseError    = '';
  parsing       = false;
 
  // Upload form
  uploadExamName     = '';
  uploadExamDateStr  = '';
  uploadBatchCode    = '';
  uploadAcademicYear = '';
 
  // Parsed preview
  parsedRows:      any[] = [];
  parsedSubjects:  string[] = [];
  parsedStats      = { total: 0, matched: 0, absent: 0 };
  previewTruncated = false;
  private readonly PREVIEW_LIMIT = 20;
  public parsedPayload: any[] = [];  // full rows for submission
 
  // ── View / delete modal ───────────────────────────────────────────────────
  showView       = false;
  viewExam:      any = null;
  viewLoading    = false;
 
  showDeleteConfirm = false;
  deleteTarget:  any = null;
  deleting       = false;
 
  // ── Import result ─────────────────────────────────────────────────────────
  showImportResult  = false;
  importResult:  any = null;
 
  constructor(
    private commonApi: CommonapiService,
    private alert:     AlertService,
    private breadcrumb:BredcrumpService,
    private router:    Router,
    private authService: AuthService
  ) {
    this.tenantId = localStorage.getItem('tenantId') || localStorage.getItem('entiId') || '';
    this.breadcrumb.set([{ label: 'Control Panel' }, { label: 'School Exams' }]);
  }
 
  ngOnInit(): void {
    this.loadLookups();
  }
 
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
 
  // ── Lookups ───────────────────────────────────────────────────────────────
  loadLookups(): void {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r: any) => { this.batchesFull = r?.data || []; } });
    this.commonApi.fetchData({ entiId: this.tenantId }, 'ims', 'center/list?list=full')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r: any) => { this.centersFull = r?.data || []; } });
  }
 
  // ── List ──────────────────────────────────────────────────────────────────
  loadExams(): void {
    this.loading = true;
    const body: any = {
      tenantId: this.tenantId,
      page:  this.currentPage,
      limit: this.pageSize
    };
    if (this.filterExamName)     body.examName     = this.filterExamName;
    if (this.filterBatchCode)    body.batchCode    = this.filterBatchCode;
    if (this.filterAcademicYear) body.academicYear = this.filterAcademicYear;
 
    this.commonApi.fetchData(body, this.moduleName, 'exam/list')
      .pipe(takeUntil(this.destroy$), finalize(() => { this.loading = false; this.hasSearched = true; }))
      .subscribe({
        next: (r: any) => {
          this.exams       = r?.data  || [];
          this.totalRecords= r?.count || 0;
        },
        error: () => this.alert.error('Failed to load exams')
      });
  }
 
  applyFilters(): void {
    this.currentPage = 1;
    this.loadExams();
  }
 
  resetFilters(): void {
    this.filterExamName = '';
    this.filterBatchCode = '';
    this.filterAcademicYear = '';
    this.currentPage = 1;
    this.hasSearched = false;
    this.exams = [];
    this.totalRecords = 0;
  }
 
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadExams();
  }
 
  // ── View ──────────────────────────────────────────────────────────────────
  openView(exam: any): void {
    this.showView   = true;
    this.viewExam   = null;
    this.viewLoading= true;
    this.commonApi.fetchData({ tenantId: this.tenantId, examLogId: exam.examLogId }, this.moduleName, 'exam/upload')
      .pipe(takeUntil(this.destroy$), finalize(() => this.viewLoading = false))
      .subscribe({
        next: (r: any) => { this.viewExam = r?.data || null; },
        error: () => { this.alert.error('Failed to load exam details'); this.showView = false; }
      });
  }
 
  closeView(): void { this.showView = false; this.viewExam = null; }
 
  // ── Delete ────────────────────────────────────────────────────────────────
  openDelete(exam: any): void {
    this.deleteTarget       = exam;
    this.showDeleteConfirm  = true;
  }
 
  closeDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteTarget      = null;
  }
 
  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.commonApi.fetchData(
      { tenantId: this.tenantId, examLogId: this.deleteTarget.examLogId, userId: localStorage.getItem('userId') },
      this.moduleName, 'exam/delete'
    )
    .pipe(takeUntil(this.destroy$), finalize(() => { this.deleting = false; this.closeDelete(); }))
    .subscribe({
      next: () => { this.alert.success('Exam deleted'); this.loadExams(); },
      error: (err: any) => this.alert.error(err?.error?.message || 'Delete failed')
    });
  }
 
  // ── Upload modal ──────────────────────────────────────────────────────────
  openUpload(): void {
    this.showUpload = true;
    this._resetUpload();
  }
 
  closeUpload(): void {
    this.showUpload = false;
    this._resetUpload();
  }
 
  private _resetUpload(): void {
    this.uploadExamName     = '';
    this.uploadExamDateStr  = '';
    this.uploadBatchCode    = '';
    this.uploadAcademicYear = '';
    this.parsedRows         = [];
    this.parsedSubjects     = [];
    this.parsedPayload      = [];
    this.parsedStats        = { total: 0, matched: 0, absent: 0 };
    this.parseError         = '';
    this.parsing            = false;
    this.previewTruncated   = false;
  }
 
  onFileChange(e: any): void {
    const f = e.target.files?.[0];
    if (!f) return;
    this.parseError   = '';
    this.parsedRows   = [];
    this.parsedPayload= [];
    const name = f.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      this.parseError = 'Please upload a .xlsx, .xls or .csv file';
      return;
    }
    this.parsing = true;
    const reader = new FileReader();
    reader.onload = (evt: any) => {
      try {
        const wb    = XLSX.read(new Uint8Array(evt.target.result as ArrayBuffer), { type: 'array', cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) { this.parseError = 'Excel has no sheets'; return; }
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
        if (!rows.length) { this.parseError = 'Excel file is empty'; return; }
        this._processRows(rows);
      } catch {
        this.parseError = 'Failed to parse file. Please check the format.';
      } finally {
        this.parsing = false;
      }
    };
    reader.onerror = () => { this.parsing = false; this.parseError = 'Failed to read file.'; };
    reader.readAsArrayBuffer(f);
  }
 
  private _processRows(rawRows: any[]): void {
    const headers = Object.keys(rawRows[0]);
 
    // Find meta columns
    const colExamName    = headers.find(h => ['exam name','examname'].includes(safeTrim(h).toLowerCase()));
    const colExamDate    = headers.find(h => ['exam date','examdate'].includes(safeTrim(h).toLowerCase()));
    const colStudentEno  = headers.find(h => ['student eno','studenteno','enrollment no','admissionno'].includes(safeTrim(h).toLowerCase()));
    const colStudentId   = headers.find(h => ['student id','studentid'].includes(safeTrim(h).toLowerCase()));
    const colStudentName = headers.find(h => ['student name','studentname','name'].includes(safeTrim(h).toLowerCase()));
    const colClass       = headers.find(h => ['class','classno'].includes(safeTrim(h).toLowerCase()));
    const colTotal       = headers.find(h => ['total marks','totalmarks','total'].includes(safeTrim(h).toLowerCase()));
 
    // Subject columns
    const subjectCols = headers.filter(h => !isMetaCol(h));
    if (!subjectCols.length) { this.parseError = 'No subject columns found. Check column headers.'; return; }
 
    this.parsedSubjects = subjectCols.map(c => safeTrim(c));
 
    // Auto-fill exam name / date from Excel if not already set
    if (!this.uploadExamName && colExamName) {
      this.uploadExamName = safeTrim(rawRows[0][colExamName]);
    }
    if (!this.uploadExamDateStr && colExamDate) {
      const ms = parseExcelDate(rawRows[0][colExamDate]);
      if (ms) this.uploadExamDateStr = epochToDateStr(ms);
    }
 
    // Build payload
    let absentCount = 0;
    this.parsedPayload = rawRows.map(row => {
      const admissionNo = colStudentEno  ? safeTrim(row[colStudentEno])  : '';
      const schoolId    = colStudentId   ? safeTrim(row[colStudentId])   : '';
      const studentName = colStudentName ? safeTrim(row[colStudentName]) : '';
      const classNo     = colClass       ? (Number(row[colClass]) || null) : null;
      const excelTotal  = colTotal       ? (Number(row[colTotal])  || null) : null;
 
      const subjects = subjectCols.map(col => {
        const { marks, isAbsent } = parseMarks(row[col]);
        if (isAbsent) absentCount++;
        return { subjectName: safeTrim(col), marks, isAbsent };
      });
 
      const autoTotal  = subjects.reduce((s, x) => s + (x.marks ?? 0), 0);
      const totalMarks = excelTotal !== null ? excelTotal : autoTotal;
 
      return { admissionNo, studentSchoolId: schoolId, studentName, classNo, subjects, totalMarks };
    });
 
    this.parsedStats = {
      total:   this.parsedPayload.length,
      matched: 0,
      absent:  absentCount
    };
 
    // Preview
    this.previewTruncated = this.parsedPayload.length > this.PREVIEW_LIMIT;
    this.parsedRows       = this.parsedPayload.slice(0, this.PREVIEW_LIMIT);
  }
 
  // Validate before submit
  get canSubmit(): boolean {
    return !!this.uploadExamName && !!this.uploadExamDateStr &&
           this.parsedPayload.length > 0 && !this.parseError;
  }
 
  submitUpload(): void {
    if (!this.canSubmit) {
      this.alert.warning('Please fill Exam Name, Exam Date and upload a valid file.');
      return;
    }
    const examDate = dateStrToEpoch(this.uploadExamDateStr);
    if (!examDate) { this.alert.error('Invalid exam date'); return; }
 
    const payload: any = {
      tenantId:     this.tenantId,
      examName:     this.uploadExamName,
      examDate,
      batchCode:    this.uploadBatchCode    || null,
      academicYear: this.uploadAcademicYear || null,
      data:         this.parsedPayload,
      userId:       localStorage.getItem('userId')
    };
 
    this.uploading = true;
    this.commonApi.fetchData(payload, this.moduleName, 'exam/import')
      .pipe(takeUntil(this.destroy$), finalize(() => this.uploading = false))
      .subscribe({
        next: (r: any) => {
          this.closeUpload();
          this.importResult   = r;
          this.showImportResult = true;
          this.loadExams();
        },
        error: (err: any) => this.alert.error(err?.error?.message || 'Import failed')
      });
  }
 
  closeImportResult(): void {
    this.showImportResult = false;
    this.importResult     = null;
  }
 
  // ── Helpers ───────────────────────────────────────────────────────────────
  formatDate(ms: number): string {
    if (!ms) return '-';
    return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
 
  getMatchPct(exam: any): number {
    if (!exam?.totalStudents) return 0;
    return Math.round((exam.matchedCount / exam.totalStudents) * 100);
  }
 
  getSubjectMark(result: any, subjectName: string): string {
    const s = (result.subjects || []).find((x: any) => x.subjectName === subjectName);
    if (!s) return '-';
    return s.isAbsent ? 'AB' : (s.marks !== null ? String(s.marks) : '-');
  }
 
  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }
 
  get pages(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (this.currentPage <= 4) return [1,2,3,4,5,0,total];
    if (this.currentPage >= total - 3) return [1,0,total-4,total-3,total-2,total-1,total];
    return [1,0,this.currentPage-1,this.currentPage,this.currentPage+1,0,total];
  }
}
 