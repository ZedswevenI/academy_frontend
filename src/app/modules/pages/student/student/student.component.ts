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
}
