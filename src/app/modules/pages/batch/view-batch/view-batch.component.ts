import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

@Component({
  selector: 'app-view-batch',
  standalone: false,
  templateUrl: './view-batch.component.html',
  styleUrl: './view-batch.component.scss',
})
export class ViewBatchComponent implements OnInit {
  loading = false;
  entiId: any;
  batchId = '';
  batch: any = null;
  students: any[] = [];
  staffMap: any[] = [];
  activeTab: 'students' | 'faculty' = 'students';
  showOffcanvas = false;
  offcanvasMode: 'edit' | 'staff' | 'assign' | 'shuffle' | 'classTeacher' =
    'edit';
  programsFull: any[] = [];
  centersFull: any[] = [];
  staffListFull: any[] = [];
  editForm!: FormGroup;
  programOptionsForEditor: any[] = [{ label: 'Select', value: '' }];
  centerOptionsForEditor: any[] = [{ label: 'Select', value: '' }];
  statusEditorOptions = [
    { label: 'DRAFT', value: 'DRAFT' },
    { label: 'ACTIVE', value: 'ACTIVE' },
    { label: 'CLOSED', value: 'CLOSED' },
    { label: 'INACTIVE', value: 'INACTIVE' },
  ];
  staffOptionsAll: any[] = [{ label: 'Select', value: '' }];
  staffOptionsFiltered: any[] = [{ label: 'Select', value: '' }];
  batchSubjectOptions: any[] = [{ label: 'Select', value: '' }];
  staffDraft = { subjectId: '', staffId: '' };
  staffMapRows: any[] = [];
  eligibleStudents: any[] = [];
  eligibleStudentsFiltered: any[] = [];
  eligibleSearch = '';
  selectedStudentIds = new Set<string>();
  shuffleForm!: FormGroup;
  shuffleTargetBatchId = '';
  batchesForShuffle: any[] = [];
  classTeacherId: string = '';
  get shuffleBatchOptions(): any[] {
    return [
      { label: 'Select', value: '' },
      ...this.batchesForShuffle.map((b: any) => ({
        label: `${b.batchName} (${b.batchCode})`,
        value: b.batchId,
      })),
    ];
  }
  studentsForShuffle: any[] = [];
  showPromoteModal = false;
  showLateModal = false;
  lateForm!: FormGroup;
  lateTypeOptions = [
    { label: 'Staff', value: 'STAFF' },
    { label: 'Student', value: 'STUDENT' },
  ];
  batchStudentsLoading = false;
  lateTimetableId = '';
  showSpecialClassModal = false;
  specialClassForm!: FormGroup;
  specialClassSubjectOptions: any[] = [{ label: 'Select', value: '' }];
  specialClassStaffOptions: any[] = [{ label: 'Select', value: '' }];
  periodTypeOptions = [
    { label: 'Lecture', value: 'LECTURE' },
    { label: 'Lab', value: 'LAB' },
    { label: 'Tutorial', value: 'TUTORIAL' },
    { label: 'Test', value: 'TEST' },
    { label: 'Revision', value: 'REVISION' },
    { label: 'Exam', value: 'EXAM' },
  ];
  modeOptions = [
    { label: 'Offline', value: 'OFFLINE' },
    { label: 'Online', value: 'ONLINE' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
  }

  ngOnInit(): void {
    this.batchId = safeTrim(this.route.snapshot.paramMap.get('batchId'));
    this.breadcrumb.set([
      { label: 'Control Panel' },
      { label: 'Masters' },
      { label: 'Batches', link: '/app/batch' },
      { label: 'View' },
    ]);
    this.initForms();
    this.loadReferenceData();
    this.loadBatch();
  }

  private initForms() {
    this.editForm = this.fb.group({
      batchName: ['', [Validators.required]],
      batchCode: ['', [Validators.required]],
      status: ['ACTIVE', [Validators.required]],
      programId: ['', [Validators.required]],
      programName: [''],
      programCode: [''],
      centerId: ['', [Validators.required]],
      centerName: [''],
      centerCode: [''],
      startDate: ['', [Validators.required]],
      endDate: [''],
      remarks: [''],
    });

    this.shuffleForm = this.fb.group({
      targetBatchId: ['', [Validators.required]],
    });

    this.lateForm = this.fb.group({
      type: ['STAFF', [Validators.required]],
      personId: ['', [Validators.required]],
      timetableId: ['', [Validators.required]],
      date: ['', [Validators.required]],
      periodNo: [1, [Validators.required, Validators.min(1)]],
      scheduledStartMin: [0, [Validators.required, Validators.min(0)]],
      delayMinutes: [0, [Validators.required, Validators.min(1)]],
      reason: [''],
    });

    this.specialClassForm = this.fb.group({
      date: ['', [Validators.required]],
      periodNo: [1, [Validators.required, Validators.min(1)]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      subjectId: ['', [Validators.required]],
      staffId: ['', [Validators.required]],
      periodType: ['LECTURE', [Validators.required]],
      mode: ['OFFLINE', [Validators.required]],
      topic: [''],
      venue: [''],
      zoomUrl: [''],
    });
  }

  private loadReferenceData() {
    forkJoin({
      programs: this.commonApi
        .fetchData({ entiId: this.entiId }, 'ims', 'program/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      centers: this.commonApi
        .fetchData({ entiId: this.entiId }, 'ims', 'center/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      staff: this.commonApi
        .fetchData({ entiId: this.entiId }, 'ims', 'staff/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe(({ programs, centers, staff }: any) => {
      this.programsFull = programs?.data || [];
      this.programOptionsForEditor = [
        { label: 'Select', value: '' },
        ...this.programsFull.map((p: any) => ({
          label: `${p?.programCode || p?.code || '-'} - ${p?.programName || p?.name || '-'}`,
          value: safeTrim(p?.programId || p?._id),
        })),
      ];
      this.centersFull = centers?.data || [];
      this.centerOptionsForEditor = [
        { label: 'Select', value: '' },
        ...this.centersFull.map((c: any) => ({
          label: `${c?.centerName || c?.name || '-'} (${c?.centerCode || c?.code || '-'})`,
          value: safeTrim(c?.centerId || c?._id),
        })),
      ];
      this.staffListFull = (staff?.data || []).filter(
        (s: any) => safeTrim(s?.facultyType).toUpperCase() === 'TEACHING',
      );
      const staffOpts = [
        { label: 'Select', value: '' },
        ...this.staffListFull.map((s: any) => ({
          label: `${s?.staffName || '-'} (${s?.staffCode || '-'})`,
          value: safeTrim(s?.staffId || s?._id),
        })),
      ];
      this.staffOptionsAll = [...staffOpts];
      this.staffOptionsFiltered = [...staffOpts];
      this.specialClassStaffOptions = [...staffOpts];
    });
  }

  loadBatch() {
    if (!this.batchId) {
      this.alert.error('No batch ID');
      this.goBack();
      return;
    }
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId: this.batchId, includeStudents: true },
        'batch',
        'view',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          const doc = res?.data || {};
          this.batch = doc;
          this.students = doc?.students || [];
          this.staffMap = Array.isArray(doc?.staffMap) ? doc.staffMap : [];
          this.loadBatchSubjects();
          this.loadBatchesForShuffle();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Failed to load batch');
        },
      });
  }

  private loadBatchSubjects() {
    const batchId = safeTrim(this.batch?.batchId);
    if (!batchId) return;
    this.commonApi
      .fetchData({ entiId: this.entiId, batchId }, 'batch', 'subjects')
      .subscribe({
        next: (res: any) => {
          const arr = res?.data || [];
          const opts = [
            { label: 'Select', value: '' },
            ...arr.map((s: any) => ({
              label: `${s?.subjectName || '-'} (${s?.subjectCode || '-'})`,
              value: safeTrim(s?.subjectId || s?._id),
            })),
          ];
          this.batchSubjectOptions = opts;
          this.specialClassSubjectOptions = [...opts];
        },
        error: () => {
          this.batchSubjectOptions = [{ label: 'Select', value: '' }];
        },
      });
  }

  private loadBatchesForShuffle() {
    const b = this.batch;
    if (!b?.programId || !b?.academicYear) return;
    this.commonApi
      .fetchData(
        {
          entiId: this.entiId,
          programId: b.programId,
          academicYear: b.academicYear,
          status: 'ACTIVE',
        },
        'batch',
        'list',
      )
      .subscribe({
        next: (res: any) => {
          this.batchesForShuffle = (res?.data || []).filter(
            (x: any) => safeTrim(x?.batchId) !== safeTrim(b?.batchId),
          );
        },
        error: () => {
          this.batchesForShuffle = [];
        },
      });
  }

  goBack() {
    this.router.navigate(['/app/batch']);
  }

  get batchDuration(): string {
    const s = Number(this.batch?.startDate),
      e = Number(this.batch?.endDate);
    if (!s || !e || s >= e) return '-';
    const days = Math.round((e - s) / 86400000);
    const months = Math.round(days / 30);
    return months >= 1 ? `${months} months` : `${days} days`;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'badge bg-success-subtle text-success',
      DRAFT: 'badge bg-secondary-subtle text-secondary',
      CLOSED: 'badge bg-danger-subtle text-danger',
      INACTIVE: 'badge bg-dark-subtle text-dark',
    };
    return (
      map[safeTrim(status).toUpperCase()] ||
      'badge bg-secondary-subtle text-secondary'
    );
  }

  epochToDate(ms: any): string {
    const n = Number(ms);
    if (!n) return '-';
    return new Date(n).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private epochMsToDateInput(ms: any): string {
    const n = Number(ms);
    if (!n) return '';
    const d = new Date(n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateToEpochMs(s: any): number {
    const v = safeTrim(s);
    if (!v) return 0;
    const t = new Date(`${v}T00:00:00`).getTime();
    return isFinite(t) ? t : 0;
  }

  private timeStrToMin(t: string): number {
    const [h, m] = safeTrim(t).split(':').map(Number);
    return isFinite(h) && isFinite(m) ? h * 60 + m : 0;
  }

  private getDayName(epochMs: number): string {
    return [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ][new Date(epochMs).getDay()];
  }

  private getPreviousMonday(epochMs: number): number {
    const d = new Date(epochMs);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }

  openOffcanvas(mode: 'edit' | 'staff' | 'assign' | 'shuffle' | 'classTeacher') {
    this.offcanvasMode = mode;
    if (mode === 'edit') {
      const b = this.batch;
      this.editForm.patchValue({
        batchName: b?.batchName,
        batchCode: b?.batchCode,
        status: b?.status,
        programId: b?.programId,
        programName: b?.programName || '',
        programCode: b?.programCode || '',
        centerId: b?.centerId,
        centerName: b?.centerName || '',
        centerCode: b?.centerCode || '',
        remarks: b?.remarks || '',
        startDate: this.epochMsToDateInput(b?.startDate),
        endDate: this.epochMsToDateInput(b?.endDate),
      });
    }
    if (mode === 'staff') {
      this.staffMapRows = this.staffMap.map((x: any) => ({ ...x }));
      this.staffDraft = { subjectId: '', staffId: '' };
      this.staffOptionsFiltered = [...this.staffOptionsAll];
    }
    if (mode === 'assign') {
      this.selectedStudentIds.clear();
      this.eligibleSearch = '';
      this.loadEligibleStudents();
    }
    if (mode === 'shuffle') {
      this.shuffleTargetBatchId = '';
      this.shuffleForm.reset({ targetBatchId: '' });
      this.studentsForShuffle = this.students.map((s: any) => ({
        ...s,
        _selected: false,
      }));
    }
    if (mode === 'classTeacher') {
      this.classTeacherId = safeTrim(this.batch?.classTeacherId) || '';
    }
    this.showOffcanvas = true;
  }

  closeOffcanvas() {
    this.showOffcanvas = false;
  }

  onEditProgramChanged(programId: any) {
    const p = this.programsFull.find(
      (x: any) => safeTrim(x?.programId || x?._id) === safeTrim(programId),
    );
    this.editForm.patchValue(
      {
        programName: safeTrim(p?.programName || p?.name || ''),
        programCode: safeTrim(p?.programCode || p?.code || ''),
      },
      { emitEvent: false },
    );
  }

  onEditCenterChanged(centerId: any) {
    const c = this.centersFull.find(
      (x: any) => safeTrim(x?.centerId || x?._id) === safeTrim(centerId),
    );
    this.editForm.patchValue(
      {
        centerName: safeTrim(c?.centerName || c?.name || ''),
        centerCode: safeTrim(c?.centerCode || c?.code || ''),
      },
      { emitEvent: false },
    );
  }

  saveEdit() {
    if (this.loading) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }
    const v = this.editForm.getRawValue();
    const startMs = this.dateToEpochMs(v.startDate);
    const endMs = this.dateToEpochMs(v.endDate);
    if (!startMs) {
      this.alert.error('Start Date is required');
      return;
    }
    if (endMs && startMs >= endMs) {
      this.alert.error('End Date must be after Start Date');
      return;
    }
    const payload = {
      entiId: this.entiId,
      batchId: this.batchId,
      batchName: safeTrim(v.batchName),
      batchCode: safeTrim(v.batchCode),
      programId: safeTrim(v.programId),
      programName: safeTrim(v.programName) || null,
      programCode: safeTrim(v.programCode) || null,
      centerId: safeTrim(v.centerId),
      centerName: safeTrim(v.centerName) || null,
      centerCode: safeTrim(v.centerCode) || null,
      startDate: startMs,
      endDate: endMs || null,
      status: safeTrim(v.status) || 'ACTIVE',
      remarks: safeTrim(v.remarks) || null,
    };
    this.loading = true;
    this.commonApi.fetchData(payload, 'batch', 'update').subscribe({
      next: () => {
        this.loading = false;
        this.alert.success('Batch updated');
        this.closeOffcanvas();
        this.loadBatch();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Update failed');
      },
    });
  }

  onStaffDraftSubjectChanged(subjectId: any) {
    const sid = safeTrim(subjectId);
    const filtered = sid
      ? this.staffListFull.filter(
          (st: any) => safeTrim(String(st?.subject)) === sid,
        )
      : this.staffListFull;
    this.staffOptionsFiltered = [
      { label: 'Select', value: '' },
      ...filtered.map((s: any) => ({
        label: `${s?.staffName || '-'} (${s?.staffCode || '-'})`,
        value: safeTrim(s?.staffId || s?._id),
      })),
    ];
    const ok = this.staffOptionsFiltered.some(
      (o: any) => o.value === this.staffDraft.staffId,
    );
    if (!ok) this.staffDraft.staffId = '';
  }

  addStaffMapRow() {
    const subjId = safeTrim(this.staffDraft.subjectId);
    const staffId = safeTrim(this.staffDraft.staffId);
    if (!subjId || !staffId) {
      this.alert.error('Select subject and staff');
      return;
    }
    if (this.staffMapRows.some((r: any) => safeTrim(r?.subjectId) === subjId)) {
      this.alert.error('Subject already mapped. Remove and re-add.');
      return;
    }
    const subjOpt = this.batchSubjectOptions.find(
      (x: any) => safeTrim(x?.value) === subjId,
    );
    const staffOpt = this.staffOptionsAll.find(
      (x: any) => safeTrim(x?.value) === staffId,
    );
    this.staffMapRows.push({
      subjectId: subjId,
      subjectName: subjOpt?.label || null,
      staffId: staffId,
      staffName: staffOpt?.label || null,
    });
    this.staffDraft = { subjectId: '', staffId: '' };
  }

  removeStaffMapRow(i: number) {
    if (i >= 0 && i < this.staffMapRows.length) this.staffMapRows.splice(i, 1);
  }

  saveStaffMap() {
    if (this.loading) return;
    const payload = {
      entiId: this.entiId,
      batchId: this.batchId,
      staffMap: this.staffMapRows.map((x: any) => ({
        subjectId: safeTrim(x?.subjectId),
        subjectName: safeTrim(x?.subjectName) || null,
        staffId: safeTrim(x?.staffId),
        staffName: safeTrim(x?.staffName) || null,
      })),
    };
    this.loading = true;
    this.commonApi.fetchData(payload, 'batch', 'staff/save').subscribe({
      next: () => {
        this.loading = false;
        this.alert.success('Staff mapping saved');
        this.closeOffcanvas();
        this.loadBatch();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Save failed');
      },
    });
  }

  private loadEligibleStudents() {
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId: this.batchId },
        'batch',
        'students/eligible',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.eligibleStudents = res?.data || [];
          this.applyEligibleFilter();
        },
        error: () => {
          this.loading = false;
          this.eligibleStudents = [];
          this.eligibleStudentsFiltered = [];
        },
      });
  }

  applyEligibleFilter() {
    const q = safeTrim(this.eligibleSearch).toLowerCase();
    this.eligibleStudentsFiltered = q
      ? this.eligibleStudents.filter(
          (s: any) =>
            safeTrim(s?.student?.name).toLowerCase().includes(q) ||
            safeTrim(s?.student?.phone).toLowerCase().includes(q) ||
            safeTrim(s?.admissionNo).toLowerCase().includes(q),
        )
      : [...this.eligibleStudents];
  }

  toggleStudent(id: any, checked: boolean) {
    const sid = safeTrim(id);
    checked
      ? this.selectedStudentIds.add(sid)
      : this.selectedStudentIds.delete(sid);
  }

  assignStudents() {
    if (!this.selectedStudentIds.size) {
      this.alert.error('Select at least one student');
      return;
    }
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.entiId,
          batchId: this.batchId,
          studentIds: Array.from(this.selectedStudentIds),
        },
        'batch',
        'students/assign',
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Students assigned');
          this.closeOffcanvas();
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Assign failed');
        },
      });
  }

  toggleShuffleStudent(studentId: any, checked: boolean) {
    const s = this.studentsForShuffle.find(
      (x: any) => safeTrim(x?.studentId) === safeTrim(studentId),
    );
    if (s) s._selected = checked;
  }

  get shuffleSelectedCount(): number {
    return this.studentsForShuffle.filter((s: any) => s._selected).length;
  }

  onShuffleTargetChanged(val: string) {
    this.shuffleForm.patchValue({ targetBatchId: val });
  }

  saveShuffleBatch() {
    if (this.loading) return;
    const selectedIds = this.studentsForShuffle
      .filter((s: any) => s._selected)
      .map((s: any) => safeTrim(s.studentId));
    const targetBatchId = safeTrim(
      this.shuffleForm.get('targetBatchId')?.value,
    );
    if (!selectedIds.length) {
      this.alert.error('Select at least one student to shuffle');
      return;
    }
    if (!targetBatchId) {
      this.alert.error('Select a target batch');
      return;
    }
    const payload = {
      entiId: this.entiId,
      sourceBatchId: this.batchId,
      targetBatchId,
      studentIds: selectedIds,
    };
    this.loading = true;
    this.commonApi.fetchData(payload, 'batch', 'students/shuffle').subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alert.success(res?.message || 'Students shuffled');
        this.closeOffcanvas();
        this.loadBatch();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Shuffle failed');
      },
    });
  }

  openPromoteModal() {
    if (safeTrim(this.batch?.status) !== 'ACTIVE') {
      this.alert.error('Only ACTIVE batches can be promoted');
      return;
    }
    this.showPromoteModal = true;
  }

  closePromoteModal() {
    this.showPromoteModal = false;
  }

  confirmPromote() {
    if (this.loading) return;
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId: this.batchId },
        'batch',
        'promote',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.alert.success(res?.message || 'Batch promoted');
          this.closePromoteModal();
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Promote failed');
        },
      });
  }

  openLateEntry() {
    this.lateForm.reset({
      type: 'STUDENT',
      personId: '',
      timetableId: '',
      date: this.epochMsToDateInput(Date.now()),
      periodNo: 1,
      scheduledStartMin: 0,
      delayMinutes: 0,
      reason: '',
    });
    this.showLateModal = true;
    this.loadLatestTimetable();
    this.lateForm
      .get('type')
      ?.valueChanges.subscribe(() => this.onLateTypeChanged());
  }

  closeLateModal() {
    this.showLateModal = false;
  }

  private loadLatestTimetable() {
    const batchCode = safeTrim(this.batch?.batchCode);
    if (!batchCode) return;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchCode, status: 'Active' },
        'timetable',
        'list-by-batch',
      )
      .subscribe({
        next: (res: any) => {
          const rows = res?.data || [];
          if (rows.length) {
            this.lateTimetableId = safeTrim(rows[0]?._id);
            this.lateForm.patchValue(
              { timetableId: this.lateTimetableId },
              { emitEvent: false },
            );
          }
        },
        error: () => {},
      });
  }

  onLateTypeChanged() {
    const type = safeTrim(this.lateForm.get('type')?.value).toUpperCase();
    this.lateForm.patchValue({ personId: '' }, { emitEvent: false });
    if (type === 'STUDENT' && !this.students.length) {
      this.batchStudentsLoading = true;
      this.commonApi
        .fetchData(
          { entiId: this.entiId, batchId: this.batchId, includeStudents: true },
          'batch',
          'view',
        )
        .subscribe({
          next: (res: any) => {
            this.batchStudentsLoading = false;
            this.students = res?.data?.students || [];
          },
          error: () => {
            this.batchStudentsLoading = false;
          },
        });
    }
  }

  get latePersonOptions(): any[] {
    const type = safeTrim(this.lateForm.get('type')?.value).toUpperCase();
    if (type === 'STUDENT') {
      return [
        { label: 'Select Student', value: '' },
        ...this.students.map((s: any) => ({
          label: `${safeTrim(s?.student?.name || '-')} (${safeTrim(s?.admissionNo || '-')})`,
          value: safeTrim(s?.studentId),
        })),
      ];
    }
    return this.staffOptionsAll;
  }

  submitLateEntry() {
    if (this.loading) return;
    if (this.lateForm.invalid) {
      this.lateForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }
    const v = this.lateForm.value;
    const type = safeTrim(v.type).toUpperCase();
    const personId = safeTrim(v.personId);

    let personName = '';
    if (type === 'STAFF') {
      personName = safeTrim(
        this.staffListFull.find(
          (x: any) => safeTrim(x?.staffId || x?._id) === personId,
        )?.staffName || '',
      );
    } else {
      personName = safeTrim(
        this.students.find((x: any) => safeTrim(x?.studentId) === personId)
          ?.student?.name || '',
      );
    }

    const dateMs = this.dateToEpochMs(v.date);
    if (!dateMs) {
      this.alert.error('Date is required');
      return;
    }

    const payload = {
      entiId: this.entiId,
      type,
      personId,
      personName,
      timetableId: safeTrim(v.timetableId),
      batchCode: safeTrim(this.batch?.batchCode),
      date: dateMs,
      periodNo: Number(v.periodNo),
      scheduledStartMin: Number(v.scheduledStartMin),
      delayMinutes: Number(v.delayMinutes),
      reason: safeTrim(v.reason) || null,
    };
    this.loading = true;
    this.commonApi.fetchData(payload, 'timetable', 'late-entry/log').subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alert.success(res?.message || 'Late entry logged');
        this.closeLateModal();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Failed to log late entry');
      },
    });
  }

  openSpecialClass() {
    this.specialClassForm.reset({
      date: '',
      periodNo: 1,
      startTime: '',
      endTime: '',
      subjectId: '',
      staffId: '',
      periodType: 'LECTURE',
      mode: 'OFFLINE',
      topic: '',
      venue: '',
      zoomUrl: '',
    });
    this.specialClassStaffOptions = [...this.staffOptionsAll];
    this.showSpecialClassModal = true;
  }

  closeSpecialClassModal() {
    this.showSpecialClassModal = false;
  }

  submitSpecialClass() {
    if (this.loading) return;
    if (this.specialClassForm.invalid) {
      this.specialClassForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }
    const v = this.specialClassForm.value;
    const dateMs = this.dateToEpochMs(v.date);
    const startMin = this.timeStrToMin(v.startTime);
    const endMin = this.timeStrToMin(v.endTime);
    if (!dateMs) {
      this.alert.error('Date is required');
      return;
    }
    if (endMin <= startMin) {
      this.alert.error('End time must be after start time');
      return;
    }
    const subjectOpt = this.specialClassSubjectOptions.find(
      (x: any) => safeTrim(x?.value) === safeTrim(v.subjectId),
    );
    const staffOpt = this.specialClassStaffOptions.find(
      (x: any) => safeTrim(x?.value) === safeTrim(v.staffId),
    );
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchCode: this.batch?.batchCode },
        'timetable',
        'list-by-batch',
      )
      .subscribe({
        next: (res: any) => {
          const wkDate = this.getPreviousMonday(dateMs);
          const tt = (res?.data || []).find(
            (t: any) =>
              Number(t?.wkStartOn) === wkDate && t?.status === 'Active',
          );
          if (!tt) {
            this.loading = false;
            this.alert.error(
              'No active timetable found for this batch on the selected date. Publish a timetable first.',
            );
            return;
          }
          const payload = {
            entiId: this.entiId,
            timetableId: safeTrim(tt._id),
            batchCode: safeTrim(this.batch?.batchCode),
            date: dateMs,
            day: this.getDayName(dateMs),
            period: {
              periodNo: Number(v.periodNo),
              periodType: safeTrim(v.periodType),
              mode: safeTrim(v.mode),
              time: {
                startMin,
                endMin,
                startLabel: v.startTime,
                endLabel: v.endTime,
              },
              facultyId: safeTrim(v.staffId),
              facultyName: staffOpt?.label || null,
              subjectId: safeTrim(v.subjectId),
              subjectName: subjectOpt?.label || null,
              topic: safeTrim(v.topic) || null,
              venue: safeTrim(v.venue) || null,
              zoomUrl: safeTrim(v.zoomUrl) || null,
            },
          };
          this.commonApi
            .fetchData(payload, 'timetable', 'period/add')
            .subscribe({
              next: (r: any) => {
                this.loading = false;
                this.alert.success(r?.message || 'Special class added');
                this.closeSpecialClassModal();
              },
              error: (err: any) => {
                this.loading = false;
                this.alert.error(
                  err?.error?.message || 'Failed to add special class',
                );
              },
            });
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Failed to load timetable');
        },
      });
  }

  // ── remove student ─────────────────────────────────────────────────────────
  removeStudent(studentId: string) {
    if (!confirm('Remove this student from the batch?')) return;
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, batchId: this.batchId, studentIds: [studentId] },
        'batch',
        'students/remove',
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Student removed');
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Remove failed');
        },
      });
  }

  // ── assign class teacher ───────────────────────────────────────────────────
  assignClassTeacher() {
    if (this.loading) return;
    const staffOpt = this.staffOptionsAll.find(
      (s: any) => s.value === this.classTeacherId,
    );
    const staffName =
      staffOpt && this.classTeacherId ? staffOpt.label.split(' (')[0] : '';
    const payload = {
      entiId: this.entiId,
      batchId: this.batchId,
      staffId: this.classTeacherId,
      staffName: staffName,
    };
    this.loading = true;
    this.commonApi
      .fetchData(payload, 'batch', 'class-teacher/assign')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.alert.success(res?.message || 'Class teacher updated');
          this.closeOffcanvas();
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(
            err?.error?.message || 'Failed to update class teacher',
          );
        },
      });
  }

  // ====================================================
  // EXPORT BATCH DATA
  // ====================================================
  exportBatch(): void {
    if (!this.batch) return;
    const b = this.batch;
    const formatDate = (ts: number | null) => {
      if (!ts) return '';
      return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const wb = XLSX.utils.book_new();

    // Sheet 1: Batch Info
    const infoRows = [
      { Field: 'Batch Name', Value: b.batchName || '' },
      { Field: 'Batch Code', Value: b.batchCode || '' },
      { Field: 'Program', Value: b.programName || '' },
      { Field: 'Center', Value: b.centerName || '' },
      { Field: 'Center Code', Value: b.centerCode || '' },
      { Field: 'Academic Year', Value: b.academicYear || '' },
      { Field: 'Class', Value: b.classNo || '' },
      { Field: 'Year No', Value: b.yearNo || '' },
      { Field: 'Start Date', Value: formatDate(b.startDate) },
      { Field: 'End Date', Value: formatDate(b.endDate) },
      { Field: 'Status', Value: b.status || '' },
      { Field: 'Student Count', Value: b.studentCount || this.students.length },
      { Field: 'Remarks', Value: b.remarks || '' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(infoRows), 'Batch Info');

    // Sheet 2: Faculty
    const staffRows = (this.staffMap || []).map((s: any) => ({
      'Subject': s.subjectName || '',
      'Staff Name': s.staffName || '',
    }));
    if (staffRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRows), 'Faculty');
    }

    // Sheet 3: Students
    const studentRows = (this.students || []).map((s: any) => ({
      'Admission No': s.admissionNo || '',
      'Registration No': s.registrationNumber || '',
      'Student Name': s.student?.name || '',
      'Phone': s.student?.phone || '',
      'Email': s.student?.email || '',
      'Parent Phone': s.student?.parentPhone || '',
      'Address': s.student?.address || '',
      'City': s.student?.city || '',
      'State': s.student?.state || '',
      'Pincode': s.student?.pincode || '',
    }));
    if (studentRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentRows), 'Students');
    }

    XLSX.writeFile(wb, `Batch_${b.batchCode || b.batchName}.xlsx`);
  }
}
