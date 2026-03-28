import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-student',
  standalone: false,
  templateUrl: './student.component.html',
  styleUrl: './student.component.scss',
})
export class StudentComponent {
  activeTab: 'list' | 'grid' = 'list';
  tenantId = localStorage.getItem('tenantId') || '';
  userId = localStorage.getItem('userId') || '';

  // Bulk Excel Upload
  showBulkUpload = false;
  bulkFileName = '';
  bulkPreviewRows: any[] = [];
  bulkHasInvalidRows = false;
  bulkInvalidCount = 0;
  bulkUploading = false;

  // Bulk Image Upload
  showImageUpload = false;
  imageFiles: File[] = [];
  imagePreviewList: { name: string; admissionNo: string; preview: string }[] =
    [];
  imageUploading = false;

  hasSearched = false;
  listLoading = false;
  programOptions: any[] = [];
  centerOptions: any[] = [];
  batchOptions: any[] = [];
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

  setTab(tab: 'list' | 'grid') {
    this.activeTab = tab;
  }

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  loadFilterOptions() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims', 'program/list?list=full')
      .subscribe({
        next: (r: any) => {
          this.programOptions = (r?.data || []).map((p: any) => ({
            label: `${p.programCode || p.code} - ${p.programName || p.name}`,
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
    // filters object is passed by reference so child picks up changes via ngOnChanges
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

  // ===================== BULK EXCEL UPLOAD =====================

  openBulkUpload() {
    this.showBulkUpload = true;
    this.resetBulkUpload();
  }

  closeBulkUpload() {
    if (this.bulkUploading) return;
    this.showBulkUpload = false;
  }

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
      },
      {
        'Enrolment Number': 'ADM002',
        'Full Name': 'Alice Smith',
        Mobile: '9876543220',
        Email: 'alice@example.com',
        'Parent Name': 'Bob Smith',
        'Parent Mobile': '9876543221',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
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
        const data = e.target.result;
        const wb = XLSX.read(data, { type: 'binary' });
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

    const payload = {
      tenantId: this.tenantId,
      userId: this.userId,
      students,
    };

    this.bulkUploading = true;
    this.commonApi.fetchData(payload, 'student', 'bulk-update').subscribe({
      next: (res: any) => {
        this.bulkUploading = false;
        if (res?.status) {
          const data = res.data || {};
          this.alert.success(
            `Bulk update: ${data.successCount || 0} success, ${data.failedCount || 0} failed`,
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

  // ===================== BULK IMAGE UPLOAD =====================

  openImageUpload() {
    this.showImageUpload = true;
    this.resetImageUpload();
  }

  closeImageUpload() {
    if (this.imageUploading) return;
    this.showImageUpload = false;
  }

  resetImageUpload() {
    this.imageFiles = [];
    this.imagePreviewList = [];
  }

  downloadImageSample() {
    // Create a simple text file with instructions
    const content = `Bulk Image Upload Instructions
================================

1. Name each image file with the student's Admission/Enrolment Number.
   Example: ADM001.jpg, ADM002.png, 90202590001.jpg

2. Supported formats: JPG, JPEG, PNG

3. Maximum 100 images per upload.

4. The system will match the filename to the student record automatically.
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Image_Upload_Instructions.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  onImagesSelected(ev: any) {
    if (this.imageUploading) return;
    const files: FileList = ev?.target?.files;
    if (!files || files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    this.imageFiles = [];
    this.imagePreviewList = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!validTypes.includes(f.type)) continue;

      const admissionNo = f.name.replace(/\.[^/.]+$/, '').trim();
      this.imageFiles.push(f);
      this.imagePreviewList.push({
        name: f.name,
        admissionNo,
        preview: URL.createObjectURL(f),
      });
    }

    if (this.imageFiles.length === 0) {
      this.alert.error('No valid image files selected (JPG/PNG only)');
    }
  }

  removeImage(index: number) {
    if (this.imageUploading) return;
    URL.revokeObjectURL(this.imagePreviewList[index].preview);
    this.imageFiles.splice(index, 1);
    this.imagePreviewList.splice(index, 1);
  }

  confirmImageUpload() {
    if (this.imageUploading || this.imageFiles.length === 0) return;

    const formData = new FormData();
    formData.append('tenantId', this.tenantId);
    formData.append('userId', this.userId);

    for (const file of this.imageFiles) {
      formData.append('images', file, file.name);
    }

    this.imageUploading = true;
    this.commonApi
      .uploadImage(formData, 'student', 'bulk-image-upload')
      .subscribe({
        next: (res: any) => {
          this.imageUploading = false;
          if (res?.status) {
            const data = res.data || {};
            this.alert.success(
              `Image upload: ${data.successCount || 0} success, ${data.failedCount || 0} failed`,
            );
            this.showImageUpload = false;
            this.resetImageUpload();
          } else {
            this.alert.error(res?.message || 'Image upload failed');
          }
        },
        error: (err: any) => {
          this.imageUploading = false;
          this.alert.error(err?.error?.message || 'Image upload failed');
        },
      });
  }
}
