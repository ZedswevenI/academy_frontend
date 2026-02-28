import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-pack-create',
  standalone: false,
  templateUrl: './pack-create.component.html',
  styleUrl: './pack-create.component.scss'
})
export class PackCreateComponent implements OnInit {

  packageForm!: FormGroup;

  tenantId: any;
  isEditMode  = false;
  packageId: string | null = null;
  editPackage: any = null;
  loading     = false;
  uploading   = false;
  attachmentUrl = '';

  class_options = [
    { label: '9th',      value: 9  },
    { label: '10th',     value: 10 },
    { label: '11th',     value: 11 },
    { label: '12th',     value: 12 },
    { label: '12th Pass',value: 13 }
  ];

  subject_options: any[] = [];

  constructor(
    private breadcrumb: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');

    const nav          = this.router.getCurrentNavigation();
    const statePkg     = nav?.extras?.state?.['package'];

    if (statePkg) {
      this.isEditMode  = true;
      this.packageId   = statePkg.packageId;
      this.editPackage = statePkg;
      this.breadcrumb.set([
        { label: 'Packages', link: '/app/package' },
        { label: 'Edit' }
      ]);
    } else {
      this.breadcrumb.set([
        { label: 'Packages', link: '/app/package' },
        { label: 'Create' }
      ]);
    }

    this.buildForm();
  }

  // ====================================================
  // INIT
  // ====================================================

  async ngOnInit(): Promise<void> {
    await this.loadSubjects();

    if (this.isEditMode && this.editPackage) {
      this.patchEditData(this.editPackage);
    }
  }

  private buildForm(): void {
    if (this.isEditMode) {
      // Edit — only title is editable per API
      this.packageForm = this.fb.group({
        classNo:     [''],
        subjectId:   [''],
        packageCode: [''],
        title:       ['', Validators.required],
        description: [''],
        attachmentUrl: ['']
      });
    } else {
      this.packageForm = this.fb.group({
        classNo:      [null, Validators.required],
        subjectId:    ['',   Validators.required],
        packageCode:  ['',   Validators.required],
        title:        ['',   Validators.required],
        description:  [''],
        attachmentUrl: ['']
      });
    }
  }

  // ====================================================
  // SUBJECTS
  // ====================================================

  private loadSubjects(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.subject_options = (res?.data || []).map((s: any) => ({
              label: s.subjectName,
              value: s._id,
              name:  s.subjectName
            }));
            resolve();
          },
          error: () => resolve()
        });
    });
  }

  // ====================================================
  // PATCH EDIT
  // ====================================================

  private patchEditData(d: any): void {
    this.attachmentUrl = d.attachmentUrl || '';

    this.packageForm.patchValue({
      classNo:      d.classNo,
      subjectId:    d.subjectId,
      packageCode:  d.packageCode,
      title:        d.title,
      description:  d.description,
      attachmentUrl: d.attachmentUrl
    }, { emitEvent: false });

    // Disable non-editable fields in edit mode
    ['classNo', 'subjectId', 'packageCode', 'description'].forEach(f => {
      this.packageForm.get(f)?.disable();
    });
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

    this.commonApi.uploadImage(formData, 'ims/package', 'upload')
      .subscribe({
        next: (res: any) => {
          this.uploading = false;
          if (res?.status) {
            this.attachmentUrl = res.data.attachmentUrl;
            this.packageForm.patchValue({ attachmentUrl: res.data.attachmentUrl });
            this.alert.success('File uploaded successfully');
          }
        },
        error: () => {
          this.uploading = false;
          this.alert.error('Error uploading file');
        }
      });
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  submit(): void {
    if (this.packageForm.invalid) {
      this.packageForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const f = this.packageForm.getRawValue();

    if (this.isEditMode) {
      this.updatePackage(f);
    } else {
      this.createPackage(f);
    }
  }

  private createPackage(f: any): void {
    // Find subject name from selected subjectId
    const selectedSubject = this.subject_options.find(s => s.value === f.subjectId);

    const payload = {
      tenantId:      this.tenantId,
      packageCode:   f.packageCode,
      classNo:       Number(f.classNo),
      subjectId:     f.subjectId,
      subjectName:   selectedSubject?.name || '',
      title:         f.title,
      description:   f.description || '',
      attachmentUrl: f.attachmentUrl || ''
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'ims/package', 'create')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success('Package created successfully');
            this.router.navigate(['/app/package']);
          }
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error creating package');
        }
      });
  }

  private updatePackage(f: any): void {
    const payload: any = {
      tenantId:  this.tenantId,
      packageId: this.packageId,
      title:     f.title
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'ims/package', 'update')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success('Package updated successfully');
            this.router.navigate(['/app/package']);
          }
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error updating package');
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/app/package']);
  }
}