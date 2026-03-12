import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-create-circular',
  standalone: false,
  templateUrl: './create-circular.component.html',
  styleUrl: './create-circular.component.scss'
})
export class CreateCircularComponent implements OnInit {

  circularForm!: FormGroup;

  tenantId: any;
  isEditMode = false;
  circularId: string | null = null;
  editData: any = null;
  loading = false;
  uploading = false;

  // Uploaded files list
  uploadedFiles: { url: string; name: string }[] = [];

  scope_options = [
    { label: 'Institute', value: 'INSTITUTE' },
    { label: 'Center', value: 'CENTER' },
    { label: 'Batch', value: 'BATCH' }
  ];

  category_options = [
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Exam', value: 'EXAM' },
    { label: 'Event', value: 'EVENT' },
    { label: 'Fee', value: 'FEE' },
    { label: 'General', value: 'GENERAL' },
    { label: 'Announcement', value: 'ANNOUNCEMENT' }
  ];

  status_options = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' }
  ];

  // Center multi-select
  centers: any[] = [];
  selectedCenterCodes: string[] = [];
  selectAllCenters = false;

  // Batch multi-select
  batches: any[] = [];
  selectedBatchCodes: string[] = [];
  selectAllBatches = false;

  constructor(
    private breadcrumb: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');

    const nav = this.router.getCurrentNavigation();
    const stateData = nav?.extras?.state?.['circular'];

    if (stateData) {
      this.isEditMode = true;
      this.circularId = stateData.circularId;
      this.editData = stateData;
      this.breadcrumb.set([
        { label: 'Circular', link: '/app/circular' },
        { label: 'Edit' }
      ]);
    } else {
      this.breadcrumb.set([
        { label: 'Circular', link: '/app/circular' },
        { label: 'Create' }
      ]);
    }

    this.buildForm();
  }

  // ====================================================
  // INIT
  // ====================================================

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadCenters(), this.loadBatches()]);

    // Watch scope changes
    this.circularForm.get('scope')?.valueChanges.subscribe(() => {
      this.selectedCenterCodes = [];
      this.selectedBatchCodes = [];
      this.selectAllCenters = false;
      this.selectAllBatches = false;
    });

    if (this.isEditMode && this.editData) {
      this.patchEditData(this.editData);
    }
  }

  private buildForm(): void {
    this.circularForm = this.fb.group({
      scope: ['INSTITUTE', Validators.required],
      category: ['', Validators.required],
      subject: ['', Validators.required],
      details: ['', Validators.required],
      status: ['DRAFT', Validators.required]
    });
  }

  // ====================================================
  // DROPDOWNS
  // ====================================================

  private loadCenters(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/center', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.centers = res?.data || [];
            resolve();
          },
          error: () => resolve()
        });
    });
  }

  private loadBatches(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.batches = res?.data || [];
            resolve();
          },
          error: () => resolve()
        });
    });
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
      error: () => this.alert.error('Error downloading file')
    });
  }

  // ====================================================
  // PATCH EDIT
  // ====================================================

  private patchEditData(d: any): void {
    this.circularForm.patchValue({
      scope: d.scope,
      category: d.category,
      subject: d.subject,
      details: d.details,
      status: d.status
    }, { emitEvent: false });

    // Restore uploaded files
    this.uploadedFiles = (d.files || []).map((f: any, i: number) => ({
      url: f.url,
      name: `Attachment ${i + 1}`
    }));

    // ✅ centerCode is a comma-separated string e.g. "64,65"
    if (d.scope === 'CENTER' && d.centerCode) {
      this.selectedCenterCodes = typeof d.centerCode === 'string'
        ? d.centerCode.split(',').map((c: string) => c.trim()).filter(Boolean)
        : Array.isArray(d.centerCode)
          ? d.centerCode
          : [d.centerCode];

      this.selectAllCenters = this.selectedCenterCodes.length === this.centers.length;
    }

    // ✅ batchCode is also a comma-separated string
    if (d.scope === 'BATCH' && d.batchCode) {
      this.selectedBatchCodes = typeof d.batchCode === 'string'
        ? d.batchCode.split(',').map((b: string) => b.trim()).filter(Boolean)
        : Array.isArray(d.batchCode)
          ? d.batchCode
          : [d.batchCode];

      this.selectAllBatches = this.selectedBatchCodes.length === this.batches.length;
    }
  }

  // ====================================================
  // CENTER MULTI-SELECT
  // ====================================================

  isCenterSelected(code: string): boolean {
    return this.selectedCenterCodes.includes(code);
  }

  toggleCenter(code: string, checked: boolean): void {
    if (checked) {
      this.selectedCenterCodes = [...this.selectedCenterCodes, code];
    } else {
      this.selectedCenterCodes = this.selectedCenterCodes.filter(c => c !== code);
      this.selectAllCenters = false;
    }
    this.selectAllCenters = this.selectedCenterCodes.length === this.centers.length;
  }

  toggleAllCenters(checked: boolean): void {
    this.selectAllCenters = checked;
    this.selectedCenterCodes = checked ? this.centers.map(c => c.centerCode) : [];
  }

  // ====================================================
  // BATCH MULTI-SELECT
  // ====================================================

  isBatchSelected(code: string): boolean {
    return this.selectedBatchCodes.includes(code);
  }

  toggleBatch(code: string, checked: boolean): void {
    if (checked) {
      this.selectedBatchCodes = [...this.selectedBatchCodes, code];
    } else {
      this.selectedBatchCodes = this.selectedBatchCodes.filter(c => c !== code);
      this.selectAllBatches = false;
    }
    this.selectAllBatches = this.selectedBatchCodes.length === this.batches.length;
  }

  toggleAllBatches(checked: boolean): void {
    this.selectAllBatches = checked;
    this.selectedBatchCodes = checked ? this.batches.map(b => b.batchCode) : [];
  }

  // ====================================================
  // FILE UPLOAD
  // ====================================================

  onFileSelected(files: File[]): void {
    const file = files?.[0];
    if (!file) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenantId', this.tenantId);

    this.commonApi.uploadImage(formData, 'institue/circular', 'upload')
      .subscribe({
        next: (res: any) => {
          this.uploading = false;
          if (res?.status) {
            this.uploadedFiles.push({
              url: res.data.attachmentUrl || res.data.url,
              name: file.name
            });
            this.alert.success('File uploaded');
          }
        },
        error: () => {
          this.uploading = false;
          this.alert.error('Error uploading file');
        }
      });
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  submit(): void {
    const scope = this.circularForm.get('scope')?.value;

    if (this.circularForm.invalid) {
      this.circularForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    if (scope === 'CENTER' && this.selectedCenterCodes.length === 0) {
      this.alert.error('Please select at least one center');
      return;
    }

    if (scope === 'BATCH' && this.selectedBatchCodes.length === 0) {
      this.alert.error('Please select at least one batch');
      return;
    }

    const f = this.circularForm.value;

    const payload: any = {
      tenantId: this.tenantId,
      category: f.category,
      scope: f.scope,
      subject: f.subject,
      details: f.details,
      status: f.status,
      files: this.uploadedFiles.map(f => ({ url: f.url }))
    };

    if (scope === 'CENTER') {
      payload.centerCode = this.selectedCenterCodes.join(',');
    }

    if (scope === 'BATCH') {
      payload.batchCode = this.selectedBatchCodes.join(',');
      // Use first center from batch if available
    }

    if (this.isEditMode) {
      payload.circularId = this.circularId;
      this.callApi(payload, 'update');
    } else {
      this.callApi(payload, 'create');
    }
  }

  private callApi(payload: any, action: string): void {
    this.loading = true;
    this.commonApi.fetchData(payload, 'institue/circular', action)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success(`Circular ${action === 'create' ? 'created' : 'updated'} successfully`);
            this.router.navigate(['/app/circular']);
          }
        },
        error: () => {
          this.loading = false;
          this.alert.error(`Error ${action === 'create' ? 'creating' : 'updating'} circular`);
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/app/circular']);
  }

  get currentScope(): string {
    return this.circularForm.get('scope')?.value || '';
  }
}