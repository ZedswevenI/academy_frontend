import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-create-ptm',
  standalone: false,
  templateUrl: './create-ptm.component.html',
  styleUrls: ['./create-ptm.component.scss']
})
export class CreatePTMComponent implements OnInit {

  createPtm!: FormGroup;

  tenantId: any;
  isEditMode = false;
  ptmId: string | null = null;
  editPtm: any = null;

  // Dropdown options
  scope_options = [
    { label: 'Batch',   value: 'BATCH'   },
    { label: 'Program', value: 'PROGRAM' },
    { label: 'Center', value: 'CENTER' }
  ];

  mode_options = [
    { label: 'Offline', value: 'OFFLINE' },
    { label: 'Online',  value: 'ONLINE'  }
  ];

  // Dynamic target multi-select options based on scope
  target_options: any[] = [];
  target_label = 'Target';

  // Center options
  center_options: any[] = [];

  // Raw data
  batches:  any[] = [];
  programs: any[] = [];

  constructor(
    private breadcrumb: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');

    const nav = this.router.getCurrentNavigation();
    const statePtm = nav?.extras?.state?.['ptm'];

    if (statePtm) {
      this.isEditMode = true;
      this.ptmId      = statePtm.ptmId;
      this.editPtm    = statePtm;
      this.breadcrumb.set([
        { label: 'PTM', link: '/app/ptm' },
        { label: 'Edit' }
      ]);
    } else {
      this.breadcrumb.set([
        { label: 'PTM', link: '/app/ptm' },
        { label: 'Create' }
      ]);
    }

    this.buildForm();
  }

  // ====================================================
  // INIT
  // ====================================================

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadBatches(),
      this.loadPrograms(),
      this.loadCenters()
    ]);

    this.registerValueChanges();

    if (this.isEditMode && this.editPtm) {
      this.patchEditData(this.editPtm);
    }
  }

  private buildForm(): void {
    this.createPtm = this.fb.group({
      scope:        ['',  Validators.required],
      targetIds:    [[], Validators.required],   // multiselect array
      centerId:     ['',  Validators.required],
      ptmDate:      ['',  Validators.required],
      startTime:    ['',  Validators.required],
      endTime:      ['',  Validators.required],
      durationMins: [15, [Validators.required, Validators.min(1)]],
      content:      ['',  Validators.required],
      venue:        ['',  Validators.required],
      meetingMode:  ['',  Validators.required]
    });
  }

  // ====================================================
  // VALUE CHANGE LISTENERS
  // ====================================================

  private registerValueChanges(): void {
    this.createPtm.get('scope')?.valueChanges.subscribe(val => {
      this.onScopeChange(val);
    });
  }

  // ====================================================
  // SCOPE → TARGET OPTIONS
  // ====================================================

  onScopeChange(scope: string, resetTarget = true): void {
    if (resetTarget) {
      this.createPtm.patchValue({ targetIds: [] }, { emitEvent: false });
    }

    this.target_options = [];

    if (scope === 'BATCH') {
      this.target_label   = 'Batch';
      this.target_options = this.batches.map(b => ({
        label: b.batchName,
        value: b.batchCode     // batchCode is the targetId per API
      }));
    }

    if (scope === 'PROGRAM') {
      this.target_label   = 'Program';
      this.target_options = this.programs.map(p => ({
        label: p.programName,
        value: p.programCodes  // programCodes is the targetId per API
      }));
    }

    if (scope === 'CENTER') {
      this.target_label   = 'Center';
      this.target_options =  this.center_options;
    }
  }

  // ====================================================
  // DROPDOWN LOADERS
  // ====================================================

  private loadBatches(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'batch',           // ✅ fixed — was 'crm/batch'
        'list?list=full'
      ).subscribe({
        next: (res: any) => {
          this.batches = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private loadPrograms(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'ims/program',
        'list?list=full'
      ).subscribe({
        next: (res: any) => {
          this.programs = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private loadCenters(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData(
        { entiId: this.tenantId },
        'ims/center',
        'list?list=full'
      ).subscribe({
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
    // Step 1 — build target_options for the saved scope without resetting targetIds
    this.onScopeChange(d.scope, false);

    // Step 2 — patch all fields
    this.createPtm.patchValue({
      scope:        d.scope,
      targetIds:    d.targetIds || [],
      centerId:     d.centerId  || '',
      ptmDate:      this.timestampToDateInput(d.ptmDate),
      startTime:    this.timestampToDatetimeLocal(d.startTime),
      endTime:      this.timestampToDatetimeLocal(d.endTime),
      durationMins: d.durationMins,
      content:      d.content,
      venue:        d.venue,
      meetingMode:  d.meetingMode
    }, { emitEvent: false });
  }

  // ====================================================
  // HELPERS
  // ====================================================

  private timestampToDateInput(ts: number): string {
    if (!ts) return '';
    return new Date(ts).toISOString().split('T')[0];
  }

  private timestampToDatetimeLocal(ts: number): string {
    if (!ts) return '';
    const d   = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toTimestamp(val: string): number {
    return val ? new Date(val).getTime() : 0;
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  addPTM(): void {
    console.log("Invdvdfdf ",this.createPtm);
    
    // if (this.createPtm.invalid) {
    //   this.createPtm.markAllAsTouched();
    //   this.alert.error('Please fill all required fields');
    //   return;
    // }

    const f = this.createPtm.value;

    // Normalize targetIds — multiselect may return objects or plain strings
    const targetIds: string[] = (f.targetIds || []).map(
      (t: any) => (typeof t === 'object' ? t.value : t)
    );

    const payload: any = {
      tenantId:     this.tenantId,
      scope:        f.scope,
      targetIds:    targetIds,
      centerId:     f.centerId,
      ptmDate:      this.toTimestamp(f.ptmDate),
      startTime:    this.toTimestamp(f.startTime),
      endTime:      this.toTimestamp(f.endTime),
      durationMins: Number(f.durationMins),
      content:      f.content,
      venue:        f.venue,
      meetingMode:  f.meetingMode
    };

    if (this.isEditMode) {
      payload.ptmId = this.ptmId;
    }

    const endpoint = this.isEditMode ? 'edit' : 'schedule';

    this.commonApi.fetchData(payload, 'ims/ptm', endpoint)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success(
              this.isEditMode ? 'PTM updated successfully' : 'PTM scheduled successfully'
            );
            this.router.navigate(['/app/ptm']);
          }
        },
        error: () => this.alert.error(
          this.isEditMode ? 'Error updating PTM' : 'Error scheduling PTM'
        )
      });
  }

  cancel(): void {
    this.router.navigate(['/app/ptm']);
  }
}