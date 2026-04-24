// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { Router, ActivatedRoute } from '@angular/router';
// import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
// import { AlertService } from '../../../../service/alert/alert.service';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

// @Component({
//   selector: 'app-feedbackcreate',
//   standalone: false,
//   templateUrl: './feedbackcreate.component.html',
//   styleUrl: './feedbackcreate.component.scss',
// })

// export class FeedbackcreateComponent implements OnInit {
//   feedbackForm!: FormGroup;
//   tenantId: any;
//   isEditMode = false;
//   formId: string | null = null;
//   saving = false;
//   template_options: any[] = [];
//   batch_options: any[] = [];
//   staff_options: any[] = [];
//   staffLoading = false;
//   allStaffMaps: any[] = [];
//   selectedTemplate: any = null;
//   templateLoading = false;
//   minDate = new Date().toISOString().split('T')[0];
//   allBatches: any[] = [];

//   constructor(
//     private fb: FormBuilder,
//     private router: Router,
//     private route: ActivatedRoute,
//     private commonApi: CommonapiService,
//     private alert: AlertService,
//     private breadcrump: BredcrumpService,
//   ) {
//     this.tenantId = localStorage.getItem('tenantId');
//   }

//   async ngOnInit(): Promise<void> {
//     this.buildForm();
//     await Promise.all([
//       this.loadActiveTemplates(),
//       this.loadBatches(),
//     ]);
//     this.formId = this.route.snapshot.paramMap.get('id');
//     if (this.formId) {
//       this.isEditMode = true;
//       this.breadcrump.set([
//         { label: 'Feedback', link: '/app/feedback' },
//         { label: 'Edit Form' },
//       ]);
//       this.loadFormForEdit();
//     } else {
//       this.breadcrump.set([
//         { label: 'Feedback', link: '/app/feedback' },
//         { label: 'Create Form' },
//       ]);
//     }
//     this.feedbackForm.get('templateId')?.valueChanges.subscribe((val) => {
//       if (val) this.onTemplateSelect(val);
//       else this.selectedTemplate = null;
//     });
//     this.feedbackForm.get('assignedBatches')?.valueChanges.subscribe((val) => {
//       const batches = (val || []).map((b: any) =>
//         typeof b === 'object' ? b.value : b,
//       );
//       this.filterStaffByBatches(batches);
//       this.feedbackForm.patchValue({ staffIds: [] }, { emitEvent: false });
//     });
//   }

//   private buildForm(): void {
//     this.feedbackForm = this.fb.group({
//       title: ['', Validators.required],
//       description: [''],
//       templateId: ['', Validators.required],
//       staffIds: [[]],
//       assignedBatches: [[], Validators.required],
//       startDate: ['', Validators.required],
//       endDate: ['', Validators.required],
//     });
//   }

//   get isStaffTemplate(): boolean {
//     return this.selectedTemplate?.category === 'STAFF';
//   }

//   get selectedBatches(): string[] {
//     const val = this.feedbackForm.get('assignedBatches')?.value || [];
//     return val.map((b: any) => (typeof b === 'object' ? b.value : b));
//   }

//   onTemplateSelect(templateId: string): void {
//     this.templateLoading = true;
//     this.selectedTemplate = null;
//     const tmpl = this.template_options.find((t) => t.value === templateId);
//     if (tmpl?._raw) {
//       this.selectedTemplate = tmpl._raw;
//       this.templateLoading = false;
//       return;
//     }
//     this.commonApi
//       .fetchData(
//         { tenantId: this.tenantId, templateId },
//         'feedback/template',
//         'view',
//       )
//       .subscribe({
//         next: (res: any) => {
//           this.selectedTemplate = res?.data || null;
//           this.templateLoading = false;
//         },
//         error: () => {
//           this.templateLoading = false;
//         },
//       });
//   }

//   private loadAllStaffMaps(): Promise<void> {
//     return new Promise((resolve) => {
//       this.commonApi
//         .fetchData(
//           { tenantId: this.tenantId },
//           'teacher',
//           'getstaffmaps?list=full',
//         )
//         .subscribe({
//           next: (res: any) => {
//             this.allStaffMaps = res?.data || [];
//             resolve();
//           },
//           error: () => resolve(),
//         });
//     });
//   }

//   filterStaffByBatches(batchCodes: string[]): void {
//     if (!batchCodes.length) {
//       this.staff_options = [];
//       return;
//     }
//     const selectedBatchData = this.allBatches.filter((b) =>
//       batchCodes.includes(b.batchCode),
//     );
//     const staffMap = new Map<string, string>();
//     selectedBatchData.forEach((batch) => {
//       (batch.staffMap || []).forEach((s: any) => {
//         if (s.staffId && !staffMap.has(s.staffId)) {
//           staffMap.set(s.staffId, s.staffName);
//         }
//       });
//     });
//     this.staff_options = Array.from(staffMap.entries()).map(([id, name]) => ({
//       label: name,
//       value: id,
//     }));
//     if (!this.staff_options.length && this.isStaffTemplate) {
//       this.alert.error('No staff mapped to the selected batch(es)');
//     }
//   }

//   private loadActiveTemplates(): Promise<void> {
//     return new Promise((resolve) => {
//       this.commonApi
//         .fetchData({ tenantId: this.tenantId }, 'feedback/template', 'active')
//         .subscribe({
//           next: (res: any) => {
//             this.template_options = (res?.data || []).map((t: any) => ({
//               label: `${t.title} (${t.category})`,
//               value: t._id,
//               _raw: t,
//             }));
//             resolve();
//           },
//           error: () => resolve(),
//         });
//     });
//   }

//   private loadBatches(): Promise<void> {
//     return new Promise((resolve) => {
//       this.commonApi
//         .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
//         .subscribe({
//           next: (res: any) => {
//             this.allBatches = res?.data || [];
//             this.batch_options = this.allBatches.map((b: any) => ({
//               label: b.batchName,
//               value: b.batchCode,
//             }));
//             resolve();
//           },
//           error: () => resolve(),
//         });
//     });
//   }

//   private loadFormForEdit(): void {
//     this.commonApi
//       .fetchData(
//         { tenantId: this.tenantId, formId: this.formId },
//         'feedback',
//         'view',
//       )
//       .subscribe({
//         next: (res: any) => {
//           if (res?.data) {
//             const d = res.data;
//             this.feedbackForm.patchValue({
//               assignedBatches: d.assignedBatches || [],
//             });
//             this.filterStaffByBatches(d.assignedBatches || []);
//             this.feedbackForm.patchValue({
//               title: d.title,
//               description: d.description || '',
//               templateId: d.templateId,
//               staffIds: d.staffIds || [],
//               startDate: this.tsToDate(d.startDate),
//               endDate: this.tsToDate(d.endDate),
//             });
//           }
//         },
//         error: () => this.alert.error('Error loading form'),
//       });
//   }

//   submit(): void {
//     if (this.feedbackForm.invalid) {
//       this.feedbackForm.markAllAsTouched();
//       this.alert.error('Please fill all required fields');
//       return;
//     }
//     const f = this.feedbackForm.value;
//     if (new Date(f.endDate).getTime() <= new Date(f.startDate).getTime()) {
//       this.alert.error('End date must be after start date');
//       return;
//     }
//     const staffIds = (f.staffIds || []).map((s: any) =>
//       typeof s === 'object' ? s.value : s,
//     );
//     if (this.isStaffTemplate && !staffIds.length) {
//       this.alert.error('Please select at least one staff member');
//       return;
//     }
//     const staffNames = staffIds.map((id: string) => {
//       return this.staff_options.find((s) => s.value === id)?.label || id;
//     });
//     const batches = (f.assignedBatches || []).map((b: any) =>
//       typeof b === 'object' ? b.value : b,
//     );
//     const payload: any = {
//       tenantId: this.tenantId,
//       userId: localStorage.getItem('userId'),
//       title: f.title,
//       description: f.description || null,
//       templateId: f.templateId,
//       staffIds,
//       staffNames,
//       assignedBatches: batches,
//       startDate: new Date(f.startDate).getTime(),
//       endDate: new Date(f.endDate).getTime(),
//     };
//     if (this.isEditMode) payload.formId = this.formId;
//     this.saving = true;
//     const endpoint = this.isEditMode ? 'update' : 'create';
//     this.commonApi.fetchData(payload, 'feedback', endpoint).subscribe({
//       next: (res: any) => {
//         if (res?.status) {
//           this.alert.success(
//             this.isEditMode ? 'Form updated' : 'Feedback form created',
//           );
//           this.router.navigate(['/app/feedback']);
//         }
//         this.saving = false;
//       },
//       error: (err: any) => {
//         this.alert.error(err?.error?.message || 'Error saving form');
//         this.saving = false;
//       },
//     });
//   }

//   cancel(): void {
//     this.router.navigate(['/app/feedback']);
//   }

//   private tsToDate(ts: number): string {
//     if (!ts) return '';
//     return new Date(ts).toISOString().split('T')[0];
//   }
// }

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

interface StaffOption {
  value: string;
  label: string;
  staffCode: string | null;
  staffName: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectCode: string | null;
}

@Component({
  selector: 'app-feedbackcreate',
  standalone: false,
  templateUrl: './feedbackcreate.component.html',
  styleUrl: './feedbackcreate.component.scss',
})
export class FeedbackcreateComponent implements OnInit {
  feedbackForm!: FormGroup;
  tenantId: any;
  isEditMode = false;
  formId: string | null = null;
  saving = false;
  template_options: any[] = [];
  batch_options: any[] = [];
  selectedTemplate: any = null;
  templateLoading = false;
  minDate = new Date().toISOString().split('T')[0];
  allBatches: any[] = [];
  selectedBatchCode = '';
  selectedBatchData: any = null;
  allFacultiesInBatch: StaffOption[] = [];
  selectedFaculties: StaffOption[] = [];
  showAddDropdown = false;
  allStaff: StaffOption[] = [];
  searchStaff = ''

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
  }

  async ngOnInit(): Promise<void> {
    this.buildForm();
    await Promise.all([
      this.loadActiveTemplates(),
      this.loadBatches(),
      this.loadAllStaff(),
    ]);
    this.formId = this.route.snapshot.paramMap.get('id');
    if (this.formId) {
      this.isEditMode = true;
      this.breadcrump.set([
        { label: 'Feedback', link: '/app/feedback' },
        { label: 'Edit Form' },
      ]);
      this.loadFormForEdit();
    } else {
      this.breadcrump.set([
        { label: 'Feedback', link: '/app/feedback' },
        { label: 'Create Form' },
      ]);
    }
    this.feedbackForm.get('templateId')?.valueChanges.subscribe((val) => {
      if (val) this.onTemplateSelect(val);
      else this.selectedTemplate = null;
    });
    this.feedbackForm.get('batchCode')?.valueChanges.subscribe((val) => {
      if (val) this.onBatchSelect(val);
      else {
        this.selectedBatchCode = '';
        this.selectedBatchData = null;
        this.allFacultiesInBatch = [];
        this.selectedFaculties = [];
      }
    });
  }

  private loadAllStaff(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'ims/staff', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.allStaff = (res?.data || []).map(
              (s: any): StaffOption => ({
                value: s.staffId,
                label: this.buildLabel(s),
                staffCode: s.staffCode || null,
                staffName: s.staffName || s.staffId,
                subjectId: null,
                subjectName: null,
                subjectCode: null,
              }),
            );
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private buildForm(): void {
    this.feedbackForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      templateId: ['', Validators.required],
      batchCode: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });
  }

  get isStaffTemplate(): boolean {
    return this.selectedTemplate?.category === 'STAFF';
  }

  // Template selection
  onTemplateSelect(templateId: string): void {
    this.templateLoading = true;
    this.selectedTemplate = null;
    const tmpl = this.template_options.find((t) => t.value === templateId);
    if (tmpl?._raw) {
      this.selectedTemplate = tmpl._raw;
      this.templateLoading = false;
      return;
    }
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, templateId },
        'feedback/template',
        'view',
      )
      .subscribe({
        next: (res: any) => {
          this.selectedTemplate = res?.data || null;
          this.templateLoading = false;
        },
        error: () => {
          this.templateLoading = false;
        },
      });
  }

  onBatchSelect(batchCode: string): void {
    this.selectedBatchCode = batchCode;
    this.showAddDropdown = false;
    const batch = this.allBatches.find((b) => b.batchCode === batchCode);
    this.selectedBatchData = batch || null;
    if (!batch) {
      this.allFacultiesInBatch = [];
      this.selectedFaculties = [];
      return;
    }
    this.allFacultiesInBatch = (batch.staffMap || [])
      .filter((s: any) => s.staffId)
      .map(
        (s: any): StaffOption => ({
          value: s.staffId,
          label: this.buildLabel(s),
          staffCode: s.staffCode || null,
          staffName: s.staffName || s.staffId,
          subjectId: s.subjectId || null,
          subjectName: s.subjectName || null,
          subjectCode: s.subjectCode || null,
        }),
      );
    // this.selectedFaculties = this.isStaffTemplate
    //   ? [...this.allFacultiesInBatch]
    //   : [];
    this.selectedFaculties = [...this.allFacultiesInBatch];
  }

  // get availableFaculties(): StaffOption[] {
  //   const ids = new Set(this.selectedFaculties.map((f) => f.value));
  //   return this.allStaff.filter((f) => !ids.has(f.value));
  // }

  addFaculty(staff: StaffOption): void {
    if (!this.selectedFaculties.find((f) => f.value === staff.value)) {
      this.selectedFaculties = [...this.selectedFaculties, staff];
    }
    this.showAddDropdown = false;
  }

  removeFaculty(staffId: string): void {
    this.selectedFaculties = this.selectedFaculties.filter(
      (f) => f.value !== staffId,
    );
  }

  addAllFaculties(): void {
    this.selectedFaculties = [...this.allFacultiesInBatch];
    this.showAddDropdown = false;
  }

  get availableFaculties(): StaffOption[] {
    const ids = new Set(this.selectedFaculties.map((f) => f.value));
    const available = this.allStaff.filter((f) => !ids.has(f.value));
    if (!this.searchStaff.trim()) return available;
    const q = this.searchStaff.toLowerCase();
    return available.filter(
      (f) =>
        f.staffName.toLowerCase().includes(q) ||
        (f.staffCode || '').toLowerCase().includes(q),
    );
  }

  // Data loading
  private loadActiveTemplates(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ tenantId: this.tenantId }, 'feedback/template', 'active')
        .subscribe({
          next: (res: any) => {
            this.template_options = (res?.data || []).map((t: any) => ({
              label: t.title + ' (' + t.category + ')',
              value: t._id,
              _raw: t,
            }));
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private loadBatches(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.allBatches = res?.data || [];
            this.batch_options = this.allBatches.map((b: any) => ({
              label:
                b.batchName + (b.batchCode ? ' (' + b.batchCode + ')' : ''),
              value: b.batchCode,
            }));
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private loadFormForEdit(): void {
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, formId: this.formId },
        'feedback',
        'view',
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.data) return;
          const d = res.data;
          const batchCode = d.assignedBatches?.[0] || '';

          this.feedbackForm.patchValue({
            title: d.title,
            description: d.description || '',
            templateId: d.templateId,
            batchCode,
            startDate: this.tsToDate(d.startDate),
            endDate: this.tsToDate(d.endDate),
          });

          if (batchCode) {
            this.onBatchSelect(batchCode);
            // Restore saved staff assignments
            if (d.staffAssignments?.length) {
              this.selectedFaculties = d.staffAssignments.map(
                (s: any): StaffOption => ({
                  value: s.staffId,
                  label: this.buildLabel(s),
                  staffCode: s.staffCode || null,
                  staffName: s.staffName || s.staffId,
                  subjectId: s.subjectId || null,
                  subjectName: s.subjectName || null,
                  subjectCode: s.subjectCode || null,
                }),
              );
            }
          }

          if (d.templateId) this.onTemplateSelect(d.templateId);
        },
        error: () => this.alert.error('Error loading form'),
      });
  }

  submit(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }
    if (!this.selectedBatchCode) {
      this.alert.error('Please select a batch');
      return;
    }
    if (this.isStaffTemplate && !this.selectedFaculties.length) {
      this.alert.error('Please add at least one faculty member');
      return;
    }

    const f = this.feedbackForm.value;
    if (new Date(f.endDate).getTime() <= new Date(f.startDate).getTime()) {
      this.alert.error('End date must be after start date');
      return;
    }

    const staffAssignments = this.selectedFaculties.map((s) => ({
      staffId: s.value,
      staffCode: s.staffCode,
      staffName: s.staffName,
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
    }));

    const payload: any = {
      tenantId: this.tenantId,
      userId: localStorage.getItem('userId'),
      title: f.title,
      description: f.description || null,
      templateId: f.templateId,
      staffAssignments,
      assignedBatches: [this.selectedBatchCode],
      startDate: new Date(f.startDate).getTime(),
      endDate: new Date(f.endDate).getTime(),
    };
    if (this.isEditMode) payload.formId = this.formId;

    this.saving = true;
    this.commonApi
      .fetchData(payload, 'feedback', this.isEditMode ? 'update' : 'create')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success(
              this.isEditMode ? 'Form updated' : 'Feedback form created',
            );
            this.router.navigate(['/app/feedback']);
          }
          this.saving = false;
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Error saving form');
          this.saving = false;
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/app/feedback']);
  }

  getPartCount(part: string): number {
    return (this.selectedTemplate?.questions || []).filter(
      (q: any) => q.part === part,
    ).length;
  }

  private buildLabel(s: any): string {
    const code = s.staffCode ? ' (' + s.staffCode + ')' : '';
    const subject = s.subjectName ? ' · ' + s.subjectName : '';
    return (s.staffName || s.staffId) + code + subject;
  }

  private tsToDate(ts: number): string {
    if (!ts) return '';
    return new Date(ts).toISOString().split('T')[0];
  }
}
