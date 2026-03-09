import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-activity-create',
  standalone: false,
  templateUrl: './create-activity.component.html',
  styleUrls: ['./create-activity.component.scss']
})
export class createActivityComponent implements OnInit {

  activityForm!: FormGroup;

  tenantId: any;
  isEditMode   = false;
  activityId: string | null = null;
  editActivity: any = null;

  loading = false;

  batch_options:  any[] = [];
  center_options: any[] = [];
  status_options = [
    { label: 'Planned',     value: 'PLANNED'     },
    { label: 'In Progress', value: 'IN_PROGRESS'  },
    { label: 'Completed',   value: 'COMPLETED'   },
    { label: 'Cancelled',   value: 'CANCELLED'   }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');

    const nav           = this.router.getCurrentNavigation();
    const stateActivity = nav?.extras?.state?.['activity'];

    if (stateActivity) {
      this.isEditMode   = true;
      this.activityId   = stateActivity.activityId;
      this.editActivity = stateActivity;
      this.breadcrumb.set([
        { label: 'Activity', link: '/app/activity' },
        { label: 'Edit' }
      ]);
    } else {
      this.breadcrumb.set([
        { label: 'Activity', link: '/app/activity' },
        { label: 'Create' }
      ]);
    }

    this.buildForm();
  }

  // ====================================================
  // INIT
  // ====================================================

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadBatches(), this.loadCenters()]);

    if (this.isEditMode && this.editActivity) {
      this.patchEditData(this.editActivity);
    }
  }

  private buildForm(): void {
    this.activityForm = this.fb.group({
      batchCode:       ['', Validators.required],
      centerCode:      ['', Validators.required],
      activityName:    ['', Validators.required],
      startDate:       ['', Validators.required],
      endDate:         ['', Validators.required],
      actualStartDate: [''],
      actualEndDate:   [''],
      remarks:         [''],
      status:          ['']   // only in edit
    });
  }

  // ====================================================
  // DROPDOWNS
  // ====================================================

  private loadBatches(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.batch_options = (res?.data || []).map((b: any) => ({
              label: b.batchName,
              value: b.batchCode
            }));
            resolve();
          },
          error: () => resolve()
        });
    });
  }

  private loadCenters(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/center', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            this.center_options = (res?.data || []).map((c: any) => ({
              label: c.centerName,
              value: c.centerCode
            }));
            resolve();
          },
          error: () => resolve()
        });
    });
  }

  // ====================================================
  // PATCH EDIT DATA
  // ====================================================

  private patchEditData(d: any): void {
    this.activityForm.patchValue({
      batchCode:       d.batchCode,
      centerCode:      d.centerCode,
      activityName:    d.activityName,
      startDate:       this.tsToDateInput(d.startDate),
      endDate:         this.tsToDateInput(d.endDate),
      actualStartDate: d.actualStartDate ? this.tsToDateInput(d.actualStartDate) : '',
      actualEndDate:   d.actualEndDate   ? this.tsToDateInput(d.actualEndDate)   : '',
      remarks:         d.remarks,
      status:          d.status
    }, { emitEvent: false });

    // Disable fields that shouldn't change in edit
    this.activityForm.get('batchCode')?.disable();
    this.activityForm.get('centerCode')?.disable();
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  submit(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const f = this.activityForm.getRawValue();

    if (this.isEditMode) {
      this.updateActivity(f);
    } else {
      this.createActivity(f);
    }
  }

  private createActivity(f: any): void {
    const payload = {
      tenantId:     this.tenantId,
      batchCode:    f.batchCode,
      centerCode:   f.centerCode,
      activityName: f.activityName,
      startDate:    this.toTimestamp(f.startDate),
      endDate:      this.toTimestamp(f.endDate),
      remarks:      f.remarks || ''
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'institue/activity', 'create')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success('Activity created successfully');
            this.router.navigate(['/app/activity']);
          }
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error creating activity');
        }
      });
  }

  private updateActivity(f: any): void {
    const payload: any = {
      tenantId:     this.tenantId,
      activityId:   this.activityId,
      activityName: f.activityName,
      startDate:    this.toTimestamp(f.startDate),
      endDate:      this.toTimestamp(f.endDate),
      remarks:      f.remarks || '',
      status:       f.status
    };

    if (f.actualStartDate) {
      payload.actualStartDate = this.toTimestamp(f.actualStartDate);
    }
    if (f.actualEndDate) {
      payload.actualEndDate = this.toTimestamp(f.actualEndDate);
    }

    this.loading = true;
    this.commonApi.fetchData(payload, 'institue/activity', 'update')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success('Activity updated successfully');
            this.router.navigate(['/app/activity']);
          }
        },
        error: ( err: any) => {
          this.loading = false;
           this.alert.error(err?.error?.message)
        }
      });
  }

  // ====================================================
  // HELPERS
  // ====================================================

  private tsToDateInput(ts: number): string {
    if (!ts) return '';
    const d   = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private toTimestamp(val: string): number {
    return val ? new Date(val).getTime() : 0;
  }

  cancel(): void {
    this.router.navigate(['/app/activity']);
  }
}