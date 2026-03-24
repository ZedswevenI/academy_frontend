import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-feedbackcreate',
  standalone: false,
  templateUrl: './feedbackcreate.component.html',
  styleUrl: './feedbackcreate.component.scss',
})

// export class FeedbackcreateComponent implements OnInit {
//   feedbackForm!: FormGroup;
//   tenantId: any;
//   isEditMode = false;
//   formId: string | null = null;
//   saving = false;
//   template_options: any[] = [];
//   batch_options: any[] = [];
//   staff_options: any[] = [];
//   selectedTemplate: any = null;
//   templateLoading = false;
//   minDate = new Date().toISOString().split('T')[0];

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
//       this.loadStaff(),
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
//   }

//   private buildForm(): void {
//     this.feedbackForm = this.fb.group({
//       title: ['', Validators.required],
//       description: [''],
//       templateId: ['', Validators.required],
//       staffId: [''],
//       assignedBatches: [[], Validators.required],
//       startDate: ['', Validators.required],
//       endDate: ['', Validators.required],
//     });
//   }

//   get isStaffTemplate(): boolean {
//     return this.selectedTemplate?.category === 'STAFF';
//   }

//   onTemplateSelect(templateId: string): void {
//     this.templateLoading = true;
//     this.selectedTemplate = null;
//     const tmpl = this.template_options.find((t) => t.value === templateId);
//     if (tmpl?._raw) {
//       this.selectedTemplate = tmpl._raw;
//       this.templateLoading = false;
//     } else {
//       this.commonApi
//         .fetchData(
//           { tenantId: this.tenantId, templateId },
//           'feedback/template',
//           'view',
//         )
//         .subscribe({
//           next: (res: any) => {
//             this.selectedTemplate = res?.data || null;
//             this.templateLoading = false;
//           },
//           error: () => {
//             this.templateLoading = false;
//           },
//         });
//     }
//   }

//   private loadActiveTemplates(): Promise<void> {
//     return new Promise((resolve) => {
//       this.commonApi
//         .fetchData(
//           { tenantId: this.tenantId },
//           'feedback/template',
//           'active',
//         )
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
//             this.batch_options = (res?.data || []).map((b: any) => ({
//               label: b.batchName,
//               value: b.batchCode,
//             }));
//             resolve();
//           },
//           error: () => resolve(),
//         });
//     });
//   }

//   private loadStaff(): Promise<void> {
//     return new Promise((resolve) => {
//       this.commonApi
//         .fetchData({ tenantId: this.tenantId }, 'ims/staff', 'list?list=full')
//         .subscribe({
//           next: (res: any) => {
//             this.staff_options = (res?.data || []).map((s: any) => ({
//               label: s.staffName,
//               value: s.staffId,
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
//               title: d.title,
//               description: d.description || '',
//               templateId: d.templateId,
//               staffId: d.staffId || '',
//               assignedBatches: d.assignedBatches || [],
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
//     if (this.isStaffTemplate && !f.staffId) {
//       this.alert.error('Please select the staff member for this feedback');
//       return;
//     }
//     const batches = (f.assignedBatches || []).map((b: any) =>
//       typeof b === 'object' ? b.value : b,
//     );
//     const staffObj = this.staff_options.find((s) => s.value === f.staffId);
//     const payload: any = {
//       tenantId: this.tenantId,
//       userId: localStorage.getItem('userId'),
//       title: f.title,
//       description: f.description || null,
//       templateId: f.templateId,
//       staffId: f.staffId || null,
//       staffName: staffObj?.label || null,
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
export class FeedbackcreateComponent implements OnInit {
  feedbackForm!: FormGroup;
  tenantId: any;
  isEditMode = false;
  formId: string | null = null;
  saving = false;
  template_options: any[] = [];
  batch_options: any[] = [];
  staff_options: any[] = [];
  staffLoading = false;
  allStaffMaps: any[] = [];
  selectedTemplate: any = null;
  templateLoading = false;
  minDate = new Date().toISOString().split('T')[0];
  allBatches: any[] = [];

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
    this.feedbackForm.get('assignedBatches')?.valueChanges.subscribe((val) => {
      const batches = (val || []).map((b: any) =>
        typeof b === 'object' ? b.value : b,
      );
      this.filterStaffByBatches(batches);
      this.feedbackForm.patchValue({ staffIds: [] }, { emitEvent: false });
    });
  }

  private buildForm(): void {
    this.feedbackForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      templateId: ['', Validators.required],
      staffIds: [[]],
      assignedBatches: [[], Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });
  }

  get isStaffTemplate(): boolean {
    return this.selectedTemplate?.category === 'STAFF';
  }

  get selectedBatches(): string[] {
    const val = this.feedbackForm.get('assignedBatches')?.value || [];
    return val.map((b: any) => (typeof b === 'object' ? b.value : b));
  }

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

  private loadAllStaffMaps(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          { tenantId: this.tenantId },
          'teacher',
          'getstaffmaps?list=full',
        )
        .subscribe({
          next: (res: any) => {
            this.allStaffMaps = res?.data || [];
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  // filterStaffByBatches(batchCodes: string[]): void {
  //   if (!batchCodes.length) {
  //     this.staff_options = [];
  //     return;
  //   }
  //   const batchSet = new Set(batchCodes);
  //   const filtered = this.allStaffMaps.filter((staff) =>
  //     (staff.batches || []).some((b: any) => batchSet.has(b.batchCode)),
  //   );
  //   this.staff_options = filtered.map((s) => ({
  //     label: s.staffName,
  //     value: s.staffId,
  //   }));
  //   if (!this.staff_options.length && this.isStaffTemplate) {
  //     this.alert.error('No staff mapped to the selected batch(es)');
  //   }
  // }

  filterStaffByBatches(batchCodes: string[]): void {
    if (!batchCodes.length) {
      this.staff_options = [];
      return;
    }
    const selectedBatchData = this.allBatches.filter((b) =>
      batchCodes.includes(b.batchCode),
    );
    const staffMap = new Map<string, string>();
    selectedBatchData.forEach((batch) => {
      (batch.staffMap || []).forEach((s: any) => {
        if (s.staffId && !staffMap.has(s.staffId)) {
          staffMap.set(s.staffId, s.staffName);
        }
      });
    });
    this.staff_options = Array.from(staffMap.entries()).map(([id, name]) => ({
      label: name,
      value: id,
    }));
    if (!this.staff_options.length && this.isStaffTemplate) {
      this.alert.error('No staff mapped to the selected batch(es)');
    }
  }

  private loadActiveTemplates(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ tenantId: this.tenantId }, 'feedback/template', 'active')
        .subscribe({
          next: (res: any) => {
            this.template_options = (res?.data || []).map((t: any) => ({
              label: `${t.title} (${t.category})`,
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
              label: b.batchName,
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
          if (res?.data) {
            const d = res.data;
            this.feedbackForm.patchValue({
              assignedBatches: d.assignedBatches || [],
            });
            this.filterStaffByBatches(d.assignedBatches || []);
            this.feedbackForm.patchValue({
              title: d.title,
              description: d.description || '',
              templateId: d.templateId,
              staffIds: d.staffIds || [],
              startDate: this.tsToDate(d.startDate),
              endDate: this.tsToDate(d.endDate),
            });
          }
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
    const f = this.feedbackForm.value;
    if (new Date(f.endDate).getTime() <= new Date(f.startDate).getTime()) {
      this.alert.error('End date must be after start date');
      return;
    }
    const staffIds = (f.staffIds || []).map((s: any) =>
      typeof s === 'object' ? s.value : s,
    );
    if (this.isStaffTemplate && !staffIds.length) {
      this.alert.error('Please select at least one staff member');
      return;
    }
    const staffNames = staffIds.map((id: string) => {
      return this.staff_options.find((s) => s.value === id)?.label || id;
    });
    const batches = (f.assignedBatches || []).map((b: any) =>
      typeof b === 'object' ? b.value : b,
    );
    const payload: any = {
      tenantId: this.tenantId,
      userId: localStorage.getItem('userId'),
      title: f.title,
      description: f.description || null,
      templateId: f.templateId,
      staffIds,
      staffNames,
      assignedBatches: batches,
      startDate: new Date(f.startDate).getTime(),
      endDate: new Date(f.endDate).getTime(),
    };
    if (this.isEditMode) payload.formId = this.formId;
    this.saving = true;
    const endpoint = this.isEditMode ? 'update' : 'create';
    this.commonApi.fetchData(payload, 'feedback', endpoint).subscribe({
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

  private tsToDate(ts: number): string {
    if (!ts) return '';
    return new Date(ts).toISOString().split('T')[0];
  }
}
