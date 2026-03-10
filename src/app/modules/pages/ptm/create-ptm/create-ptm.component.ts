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

  scope_options = [
    { label: 'Batch', value: 'BATCH' },
    { label: 'Program', value: 'PROGRAM' },
    { label: 'Center', value: 'CENTER' }
  ];

  mode_options = [
    { label: 'Offline', value: 'OFFLINE' },
    { label: 'Online', value: 'ONLINE' }
  ];

  minDateTime = this.getTodayDateTimeLocal();


  target_options: any[] = [];
  target_label = 'Target';
  center_options: any[] = [];
  batches: any[] = [];
  programs: any[] = [];

  // ── Student sub-selection (BATCH scope, single batch only) ──
  studentOptions: any[] = [];
  studentsLoading = false;
  selectedStudentIds: string[] = [];
  selectAllStudents = false;
  singleBatchCode = '';

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
      this.ptmId = statePtm.ptmId;
      this.editPtm = statePtm;
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
      scope: ['', Validators.required],
      targetIds: [[], Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      durationMins: [{ value: 0, disabled: true }],
      content: ['', Validators.required],
      venue: ['', Validators.required],
      meetingMode: ['', Validators.required]
    });
  }

  // ====================================================
  // VALUE CHANGES
  // ====================================================

  private registerValueChanges(): void {

    // Scope change
    this.createPtm.get('scope')?.valueChanges.subscribe(val => {
      this.onScopeChange(val);
    });

    // targetIds — single batch selected → load students
    this.createPtm.get('targetIds')?.valueChanges.subscribe(val => {
      if (this.currentScope !== 'BATCH') return;

      const ids: string[] = (val || []).map((v: any) =>
        typeof v === 'object' ? v.value : v
      );

      if (ids.length === 1) {
        this.loadStudentsForBatch(ids[0]);
      } else {
        this.clearStudents();
      }
    });

    // Auto-calculate duration on start/end change
    this.createPtm.get('startTime')?.valueChanges.subscribe(() => this.calculateDuration());
    this.createPtm.get('endTime')?.valueChanges.subscribe(() => this.calculateDuration());
  }

  private getTodayDateTimeLocal(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // ====================================================
  // DURATION AUTO-CALC + END TIME VALIDATION
  // ====================================================

  private calculateDuration(): void {
    const start = this.createPtm.get('startTime')?.value;
    const end = this.createPtm.get('endTime')?.value;

    if (!start || !end) return;

    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();

    if (endMs <= startMs) {
      this.createPtm.get('endTime')?.setErrors({ endBeforeStart: true });
      this.createPtm.get('durationMins')?.setValue(0, { emitEvent: false });
      return;
    }

    this.createPtm.get('endTime')?.setErrors(null);
    const diffMins = Math.round((endMs - startMs) / 60000);
    this.createPtm.get('durationMins')?.setValue(diffMins, { emitEvent: false });
  }

  get endTimeError(): boolean {
    return !!this.createPtm.get('endTime')?.errors?.['endBeforeStart'];
  }

  get durationMins(): number {
    return this.createPtm.get('durationMins')?.value || 0;
  }

  // ====================================================
  // SCOPE CHANGE
  // ====================================================

  onScopeChange(scope: string, resetTarget = true): void {
    if (resetTarget) {
      this.createPtm.patchValue({ targetIds: [] }, { emitEvent: false });
    }
    this.clearStudents();
    this.target_options = [];

    if (scope === 'BATCH') {
      this.target_label = 'Batch';
      this.target_options = this.batches.map(b => ({
        label: b.batchName,
        value: b.batchCode
      }));
    }
    if (scope === 'PROGRAM') {
      this.target_label = 'Program';
      this.target_options = this.programs.map(p => ({
        label: p.programName,
        value: p.programCodes
      }));
    }
    if (scope === 'CENTER') {
      this.target_label = 'Center';
      this.target_options = this.center_options;
    }
  }

  get currentScope(): string {
    return this.createPtm.get('scope')?.value || '';
  }

  get isSingleBatch(): boolean {
    const ids = this.createPtm.get('targetIds')?.value || [];
    return this.currentScope === 'BATCH' && ids.length === 1;
  }

  // ====================================================
  // STUDENT LOAD
  // ====================================================

  loadStudentsForBatch(batchCode: string): void {
    if (this.singleBatchCode === batchCode) return;

    this.clearStudents();
    this.singleBatchCode = batchCode;
    this.studentsLoading = true;

    this.commonApi.fetchData(
      { tenantId: this.tenantId },
      'student',
      `list?page=1&limit=200&batchCode=${batchCode}`
    ).subscribe({
      next: (res: any) => {
        this.studentOptions = (res?.data || []).map((s: any) => ({
          label: `${s.student?.name} (${s.admissionNo})`,
          value: s.studentId
        }));
        this.studentsLoading = false;
      },
      error: () => {
        this.studentsLoading = false;
        this.alert.error('Error loading students');
      }
    });
  }

  private clearStudents(): void {
    this.studentOptions = [];
    this.selectedStudentIds = [];
    this.selectAllStudents = false;
    this.singleBatchCode = '';
  }

  isStudentSelected(id: string): boolean {
    return this.selectedStudentIds.includes(id);
  }

  toggleStudent(id: string, checked: boolean): void {
    this.selectedStudentIds = checked
      ? [...this.selectedStudentIds, id]
      : this.selectedStudentIds.filter(s => s !== id);
    this.selectAllStudents = this.selectedStudentIds.length === this.studentOptions.length;
  }

  toggleAllStudents(checked: boolean): void {
    this.selectAllStudents = checked;
    this.selectedStudentIds = checked ? this.studentOptions.map(s => s.value) : [];
  }

  // ====================================================
  // DROPDOWN LOADERS
  // ====================================================

  private loadBatches(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
        .subscribe({ next: (res: any) => { this.batches = res?.data || []; resolve(); }, error: () => resolve() });
    });
  }

  private loadPrograms(): Promise<void> {
    return new Promise(resolve => {
      this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/program', 'list?list=full')
        .subscribe({ next: (res: any) => { this.programs = res?.data || []; resolve(); }, error: () => resolve() });
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
  // PATCH EDIT
  // ====================================================

  private patchEditData(d: any): void {
    this.onScopeChange(d.scope, false);

    this.createPtm.patchValue({
      scope: d.scope,
      targetIds: d.targetIds || [],
      startTime: this.timestampToDatetimeLocal(d.startTime),
      endTime: this.timestampToDatetimeLocal(d.endTime),
      content: d.content,
      venue: d.venue,
      meetingMode: d.meetingMode
    }, { emitEvent: false });

    this.calculateDuration();
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  addPTM(): void {
    if (this.createPtm.invalid) {
      this.createPtm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    if (this.endTimeError) {
      this.alert.error('End time must be after start time');
      return;
    }

    const f = this.createPtm.getRawValue();
    const startMs = new Date(f.startTime).getTime();
    const endMs = new Date(f.endTime).getTime();

    // Derive ptmDate from startTime (midnight of that day)
    const ptmDateObj = new Date(f.startTime);
    ptmDateObj.setHours(0, 0, 0, 0);

    // Determine final scope + targetIds
    const batchIds: string[] = (f.targetIds || []).map((v: any) =>
      typeof v === 'object' ? v.value : v
    );

    let finalScope: string;
    let finalTargetIds: string[];

    if (this.currentScope === 'BATCH' && batchIds.length === 1 && this.selectedStudentIds.length > 0) {
      // Single batch + students selected → STUDENT scope
      finalScope = 'STUDENT';
      finalTargetIds = [...this.selectedStudentIds];
    } else {
      finalScope = f.scope;
      finalTargetIds = batchIds;
    }

    const payload: any = {
      tenantId: this.tenantId,
      scope: finalScope,
      targetIds: finalTargetIds,
      ptmDate: ptmDateObj.getTime(),
      startTime: startMs,
      endTime: endMs,
      durationMins: f.durationMins,
      content: f.content,
      venue: f.venue,
      meetingMode: f.meetingMode
    };

    if (this.isEditMode) payload.ptmId = this.ptmId;

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
        error: (err: any) => this.alert.error(err?.error?.message || 'Error saving PTM')
      });
  }

  cancel(): void {
    this.router.navigate(['/app/ptm']);
  }

  // ====================================================
  // HELPERS
  // ====================================================

  private timestampToDatetimeLocal(ts: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}