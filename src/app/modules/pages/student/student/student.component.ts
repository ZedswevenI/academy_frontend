import { Component, ViewChild } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';
// ── Import child modal components so we can call open() on them ──────────────
import { RpaimportComponent } from '../rpaimport/rpaimport.component';
import { BoardexamimportComponent } from '../boardexamimport/boardexamimport.component';
import { AlumniimportComponent } from '../alumniimport/alumniimport.component';

declare const bootstrap: any; // Bootstrap global (already loaded in your app)

@Component({
  selector: 'app-student',
  standalone: false,
  templateUrl: './student.component.html',
  styleUrl: './student.component.scss',
})
export class StudentComponent {
  // ── ViewChild refs to child modal components ──────────────────────────────
  @ViewChild('rpaImportRef') rpaImportRef!: RpaimportComponent;
  @ViewChild('boardExamImportRef')
  boardExamImportRef!: BoardexamimportComponent;
  @ViewChild('alumniImportRef') alumniImportRef!: AlumniimportComponent;

  activeTab: 'list' | 'grid' = 'list';
  tenantId = localStorage.getItem('tenantId') || '';
  userId = localStorage.getItem('userId') || '';

  // ── Bulk Excel upload state ───────────────────────────────────────────────
  showBulkUpload = false;
  bulkFileName = '';
  bulkPreviewRows: any[] = [];
  bulkHasInvalidRows = false;
  bulkInvalidCount = 0;
  bulkUploading = false;

  // ── ZIP photo upload state ────────────────────────────────────────────────
  showImageUpload = false;
  zipFile: File | null = null;
  imageUploading = false;
  zipUploadResult: any = null;

  // ── Filters / search ─────────────────────────────────────────────────────
  hasSearched = false;
  programOptions: any[] = [];
  centerOptions: any[] = [];
  filters = {
    search: '',
    programId: '',
    centerId: '',
    batchCode: '',
    status: 'ALL',
  };
  statusOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Dropout', value: 'DROPOUT' },
  ];

  // ── Student Details Export state ─────────────────────────────────────────
  showExport = false;
  exporting = false;
  exportFieldGroups: {
    label: string;
    fields: { key: string; path: string; label: string }[];
  }[] = [
    {
      label: 'Basic Info',
      fields: [
        { key: 'admissionNo', path: 'admissionNo', label: 'Enrolment No' },
        {
          key: 'registrationNumber',
          path: 'registrationNumber',
          label: 'Registration Number',
        },
        {
          key: 'portalStudentId',
          path: 'portalStudentId',
          label: 'Scholarship Test No',
        },
        {
          key: 'studentSchoolId',
          path: 'studentSchoolId',
          label: 'School ID',
        },
        { key: 'status', path: 'status', label: 'Status' },
        { key: 'photoUrl', path: 'photoUrl', label: 'Photo URL' },
        {
          key: 'isTabletBlocked',
          path: 'isTabletBlocked',
          label: 'Tablet Blocked',
        },
      ],
    },
    {
      label: 'Academic',
      fields: [
        { key: 'academicYear', path: 'academicYear', label: 'Academic Year' },
        {
          key: 'currentAcademicYear',
          path: 'currentAcademicYear',
          label: 'Current Academic Year',
        },
        { key: 'programCode', path: 'programCode', label: 'Program Code' },
        { key: 'programName', path: 'programName', label: 'Program Name' },
        { key: 'centerCode', path: 'centerCode', label: 'Center Code' },
        { key: 'centerName', path: 'centerName', label: 'Center Name' },
        { key: 'batchCode', path: 'batchCode', label: 'Batch Code' },
        {
          key: 'courseStartYear',
          path: 'courseStartYear',
          label: 'Course Start Year',
        },
        { key: 'yearNo', path: 'yearNo', label: 'Year No' },
        { key: 'classNo', path: 'classNo', label: 'Class No' },
        {
          key: 'batchRemovalRemarks',
          path: 'batchRemovalRemarks',
          label: 'Batch Removal Remarks',
        },
        { key: 'createdAt', path: 'createdAt', label: 'Created At' },
        { key: 'updatedAt', path: 'updatedAt', label: 'Updated At' },
      ],
    },
    {
      label: 'Contact',
      fields: [
        { key: 'student.name', path: 'student.name', label: 'Name' },
        { key: 'student.phone', path: 'student.phone', label: 'Mobile' },
        { key: 'student.phone1', path: 'student.phone1', label: 'Mobile 2' },
        { key: 'student.phone2', path: 'student.phone2', label: 'Mobile 3' },
        { key: 'student.email', path: 'student.email', label: 'Email' },
        { key: 'student.email1', path: 'student.email1', label: 'Email 2' },
        { key: 'student.email2', path: 'student.email2', label: 'Email 3' },
        {
          key: 'student.parentName',
          path: 'student.parentName',
          label: 'Parent Name',
        },
        {
          key: 'student.parentPhone',
          path: 'student.parentPhone',
          label: 'Parent Mobile',
        },
        { key: 'student.address', path: 'student.address', label: 'Address' },
        { key: 'student.city', path: 'student.city', label: 'City' },
        { key: 'student.state', path: 'student.state', label: 'State' },
        { key: 'student.pincode', path: 'student.pincode', label: 'Pincode' },
      ],
    },
    {
      label: 'Advanced',
      fields: [
        { key: 'ayHistory', path: 'ayHistory', label: 'AY History' },
        { key: 'boardExams', path: 'boardExams', label: 'Board Exams' },
      ],
    },
  ];
  readonly EXPORT_DEFAULT_FIELDS = [
    'admissionNo',
    'student.name',
    'batchCode',
    'programName',
    'centerName',
    'status',
  ];
  selectedExportFields = new Set<string>(this.EXPORT_DEFAULT_FIELDS);

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {
    this.breadcrump.set([{ label: 'Student' }]);
  }

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  setTab(tab: 'list' | 'grid') {
    this.activeTab = tab;
  }

  loadFilterOptions() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims', 'program/list?list=full')
      .subscribe({
        next: (r: any) => {
          this.programOptions = (r?.data || []).map((p: any) => ({
            label: `${p.programCodes} - ${p.programName || p.name}`,
            value: p.programId || p._id,
          }));
        },
        error: () => {},
      });
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims', 'center/list?list=full')
      .subscribe({
        next: (r: any) => {
          this.centerOptions = (r?.data || []).map((c: any) => ({
            label: `${c.centerName} (${c.centerCode})`,
            value: c.centerId || c._id,
          }));
        },
        error: () => {},
      });
  }

  triggerSearch() {
    this.hasSearched = true;
    this.filters = { ...this.filters };
  }

  clearFilters() {
    this.filters = {
      search: '',
      programId: '',
      centerId: '',
      batchCode: '',
      status: 'ALL',
    };
    this.hasSearched = false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPORT DROPDOWN  — open each modal
  // ══════════════════════════════════════════════════════════════════════════

  openBulkUpload() {
    this.showBulkUpload = true;
    this.resetBulkUpload();
  }
  closeBulkUpload() {
    if (this.bulkUploading) return;
    this.showBulkUpload = false;
  }

  openImageUpload() {
    this.showImageUpload = true;
    this.resetImageUpload();
  }
  closeImageUpload() {
    if (this.imageUploading) return;
    this.showImageUpload = false;
  }

  /** Opens the RPA bootstrap modal via the child component */
  openRpaImport() {
    this.rpaImportRef?.reset();
    const el = document.getElementById('rpaImportModal');
    if (el) new bootstrap.Modal(el).show();
  }

  /** Calls open() on the board exam import child component */
  openBoardExamImport() {
    this.boardExamImportRef?.open();
  }

  /** Calls open() on the alumni import child component */
  openAlumniImport() {
    this.alumniImportRef?.open();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BULK EXCEL UPLOAD (Student Details)
  // ══════════════════════════════════════════════════════════════════════════

  resetBulkUpload() {
    this.bulkFileName = '';
    this.bulkPreviewRows = [];
    this.bulkHasInvalidRows = false;
    this.bulkInvalidCount = 0;
  }

  downloadBulkSample() {
    const rows = [
      {
        'Enrolment Number': 'ADM001',
        'Full Name': 'John Doe',
        Mobile: '9876543210',
        Email: 'john@example.com',
        'Parent Name': 'Jane Doe',
        'Parent Mobile': '9876543211',
        'School ID': 'SCH001',
      },
      {
        'Enrolment Number': 'ADM002',
        'Full Name': 'Alice Smith',
        Mobile: '9876543220',
        Email: 'alice@example.com',
        'Parent Name': 'Bob Smith',
        'Parent Mobile': '9876543221',
        'School ID': 'SCH002',
      },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows),
      'Students',
    );
    XLSX.writeFile(wb, 'Student_Bulk_Update_Sample.xlsx');
  }

  onBulkExcelSelected(ev: any) {
    if (this.bulkUploading) return;
    const file: File = ev?.target?.files?.[0];
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.alert.error('Please upload a valid Excel file (.xlsx / .xls)');
      return;
    }
    this.bulkFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, {
          defval: '',
        }) as any[];
        this.bulkPreviewRows = rawRows.map((r: any, idx: number) => {
          const admissionNo = String(
            r['Enrolment Number'] || r['Admission No'] || '',
          ).trim();
          const fullName = String(r['Full Name'] || '').trim();
          const mobile = String(r['Mobile'] || r['Phone'] || '').trim();
          const email = String(r['Email'] || '').trim();
          const parentName = String(r['Parent Name'] || '').trim();
          const parentMobile = String(r['Parent Mobile'] || '').trim();
          // ── NEW: School ID ─────────────────────────────────────────────
          const studentSchoolId = String(
            r['School ID'] || r['studentSchoolId'] || '',
          ).trim();
          const errors: string[] = [];
          if (!admissionNo) errors.push('Missing Enrolment Number');
          return {
            _rowNo: idx + 2,
            _valid: errors.length === 0,
            _errors: errors,
            admissionNo,
            fullName,
            mobile,
            email,
            parentName,
            parentMobile,
            studentSchoolId,
            _raw: r,
          };
        });
        const invalid = this.bulkPreviewRows.filter((r) => !r._valid);
        this.bulkInvalidCount = invalid.length;
        this.bulkHasInvalidRows = invalid.length > 0;
      } catch {
        this.alert.error('Unable to read Excel file');
        this.bulkPreviewRows = [];
      }
    };
    reader.onerror = () => this.alert.error('Unable to read file');
    reader.readAsBinaryString(file);
  }

  confirmBulkUpload() {
    if (
      this.bulkUploading ||
      !this.bulkPreviewRows.length ||
      this.bulkHasInvalidRows
    )
      return;
    const students = this.bulkPreviewRows.map((r) => r._raw);
    this.bulkUploading = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, userId: this.userId, students },
        'student',
        'bulk-update',
      )
      .subscribe({
        next: (res: any) => {
          this.bulkUploading = false;
          if (res?.status) {
            const d = res.data || {};
            this.alert.success(
              `Bulk update: ${d.successCount || 0} success, ${d.failedCount || 0} failed`,
            );
            this.showBulkUpload = false;
            this.resetBulkUpload();
          } else {
            this.alert.error(res?.message || 'Bulk update failed');
          }
        },
        error: (err: any) => {
          this.bulkUploading = false;
          this.alert.error(err?.error?.message || 'Bulk update failed');
        },
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ZIP PHOTO UPLOAD  (replaces old multi-file upload)
  // ══════════════════════════════════════════════════════════════════════════

  resetImageUpload() {
    this.zipFile = null;
    this.zipUploadResult = null;
  }

  onZipSelected(ev: any) {
    if (this.imageUploading) return;
    const file: File = ev?.target?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.alert.error('Please upload a .zip file');
      (ev.target as HTMLInputElement).value = '';
      return;
    }
    this.zipFile = file;
    this.zipUploadResult = null;
  }

  confirmZipUpload() {
    if (this.imageUploading || !this.zipFile) return;
    const formData = new FormData();
    formData.append('entiId', this.tenantId);
    formData.append('userId', this.userId);
    formData.append('zip', this.zipFile, this.zipFile.name);
    this.imageUploading = true;
    this.commonApi
      .uploadImage(formData, 'student', 'zip-image-upload')
      .subscribe({
        next: (res: any) => {
          this.imageUploading = false;
          if (res?.status) {
            this.zipUploadResult = res.data || {};
            const d = this.zipUploadResult;
            this.alert.success(
              `ZIP upload: ${d.successCount || 0} uploaded, ${d.failedCount || 0} failed`,
            );
          } else {
            this.alert.error(res?.message || 'Upload failed');
          }
        },
        error: (err: any) => {
          this.imageUploading = false;
          this.alert.error(err?.error?.message || 'Upload failed');
        },
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPORT CALLBACKS
  // ══════════════════════════════════════════════════════════════════════════
  onRpaImported(): void {
    /* optionally refresh list */
  }
  onBoardExamImported(): void {
    /* optionally refresh list */
  }
  onAlumniImported(): void {
    /* optionally refresh list */
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STUDENT DETAILS EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  openExport() {
    this.showExport = true;
  }

  closeExport() {
    if (this.exporting) return;
    this.showExport = false;
  }

  isFieldSelected(key: string): boolean {
    return this.selectedExportFields.has(key);
  }

  toggleExportField(key: string) {
    if (key === 'admissionNo') return; // always included
    if (this.selectedExportFields.has(key)) {
      this.selectedExportFields.delete(key);
    } else {
      this.selectedExportFields.add(key);
    }
  }

  selectAllExportFields() {
    this.exportFieldGroups.forEach((g) =>
      g.fields.forEach((f) => this.selectedExportFields.add(f.key)),
    );
  }

  clearExportFields() {
    this.selectedExportFields = new Set<string>(['admissionNo']);
  }

  private getByPath(obj: any, path: string): any {
    return path
      .split('.')
      .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  confirmExport() {
    if (this.exporting) return;
    const fields = Array.from(this.selectedExportFields);
    if (!fields.length) {
      this.alert.error('Select at least one field to export');
      return;
    }

    const body: any = { tenantId: this.tenantId, fields };
    if (this.filters.search) body.search = this.filters.search;
    if (this.filters.programId) body.programId = this.filters.programId;
    if (this.filters.centerId) body.centerId = this.filters.centerId;
    if (this.filters.batchCode) body.batchCode = this.filters.batchCode;
    if (this.filters.status && this.filters.status !== 'ALL')
      body.status = this.filters.status;

    this.exporting = true;
    this.commonApi.fetchData(body, 'student', 'export').subscribe({
      next: (res: any) => {
        this.exporting = false;
        const rows = res?.data || [];
        if (!rows.length) {
          this.alert.warning('No students found to export.');
          return;
        }
        this.downloadExportExcel(rows, fields);
        this.showExport = false;
      },
      error: (err: any) => {
        this.exporting = false;
        this.alert.error(err?.error?.message || 'Failed to export students');
      },
    });
  }

  private downloadExportExcel(rows: any[], fields: string[]) {
    const labelByKey = new Map<string, string>();
    this.exportFieldGroups.forEach((g) =>
      g.fields.forEach((f) => labelByKey.set(f.key, f.label)),
    );

    const sheetRows = rows.map((row: any) => {
      const out: any = {};
      fields.forEach((path) => {
        const label = labelByKey.get(path) || path;
        let value = this.getByPath(row, path);
        if (Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        out[label] = value ?? '';
      });
      return out;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(sheetRows),
      'Students',
    );
    XLSX.writeFile(
      wb,
      `Students_Export_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }
}
