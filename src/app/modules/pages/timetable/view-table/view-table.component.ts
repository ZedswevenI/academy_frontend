import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, catchError, of, finalize } from 'rxjs';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

const toInt = (v: any, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
};

const timeStrToMin = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const minToLabel = (min: number): string => {
  const h24 = Math.floor(min / 60);
  const mm = min % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
};

const minToTimeStr = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

@Component({
  selector: 'app-view',
  standalone: false,
  templateUrl: './view-table.component.html',
  styleUrl: './view-table.component.scss',
})
export class ViewTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loading = false;
  tenantId: any;
  timetableId = '';
  private moduleName = 'timetable';

  timetable: any = null;

  get isPublished(): boolean {
    return this.timetable?.status === 'Active';
  }
  get isDraft(): boolean {
    return this.timetable?.status === 'DRAFT';
  }

  centersFull: any[] = [];
  staffFull: any[] = [];
  subjectsFull: any[] = [];
  phasesFull: any[] = [];

  private staffByCode: Record<string, any> = {};
  private staffById: Record<string, any> = {};
  private subjectByCode: Record<string, any> = {};
  private centerByCode: Record<string, any> = {};

  daysOrder = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  sortedSchedule: any[] = [];
  maxPeriods = 0;
  periodHeaders: number[] = [];
  weekDateMap: any = {};

  // ── active selections ────────────────────────────────────────────────
  activeDay: any = null;
  activePeriodNo = 0;

  // ── Cancel Day ───────────────────────────────────────────────────────
  showCancelDay = false;
  cancelDayReason = 'Holiday';

  // ── Edit Whole Day ───────────────────────────────────────────────────
  showEditDay = false;
  editDayPeriods: any[] = [];
  editDayOriginalPeriods: any[] = [];
  editDayConflicts: any[] = [];
  editDayValidating = false;
  editDayDragIndex: number | null = null;
  editDaySubmitAttempted = false;

  // ── Cancel Period ────────────────────────────────────────────────────
  showCancelPeriod = false;
  cancelPeriodReason = 'Cancelled';

  // ── Rearrange Staff ──────────────────────────────────────────────────
  showRearrangeStaff = false;
  newFacultyId = '';
  newFacultyName = '';
  activeSubjectId = '';

  // ── Move Period ──────────────────────────────────────────────────────
  showMovePeriod = false;
  moveToPeriodNo: number | null = null;
  availablePeriodSlots: number[] = [];

  // ── Replace Period ───────────────────────────────────────────────────
  showReplacePeriod = false;
  rp: any = {
    facultyId: '',
    facultyName: '',
    subjectCode: '',
    subjectName: '',
    subjectId: '',
    venue: '',
    topic: '',
    periodType: '',
    mode: '',
    zoomUrl: '',
    phaseId: '',
    phaseName: '',
  };

  // ── Set Zoom ─────────────────────────────────────────────────────────
  showSetZoom = false;
  zoomUrlInput = '';

  // ── Convert to Exam ──────────────────────────────────────────────────
  showConvertToExam = false;
  examForm: any = {
    examId: '',
    examDescription: '',
    facultyId: '',
    facultyName: '',
    venue: '',
    topic: '',
  };

  // ── Publish confirm ───────────────────────────────────────────────────
  showPublishConfirm = false;

  // ── Date range view ──────────────────────────────────────────────────
  viewMode: 'week' | 'range' = 'week';
  fromDateStr = '';
  toDateStr = '';
  rangeMetaLabel = '';
  private lastWeeklyTimetable: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alert: AlertService,
    private commonApi: CommonapiService,
  ) {
    this.tenantId =
      localStorage.getItem('tenantId') || localStorage.getItem('entiId');
  }

  ngOnInit(): void {
    this.timetableId = safeTrim(this.route.snapshot.paramMap.get('id'));
    if (!this.timetableId) {
      this.alert.error('Timetable ID missing');
      this.router.navigate(['/app/timetable']);
      return;
    }
    this.loadLookupsAndTimetable();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Date helpers ─────────────────────────────────────────────────────
  get fromDateMs(): number {
    return this.toStartOfDayMs(this.fromDateStr) || 0;
  }
  get toDateMs(): number {
    return this.toStartOfDayMs(this.toDateStr) || this.fromDateMs || 0;
  }

  private toStartOfDayMs(dateStr: string): number {
    if (!dateStr) return 0;
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    if (!yyyy || !mm || !dd) return 0;
    return Date.UTC(yyyy, mm - 1, dd);
  }

  private toISODateInput(ms: number): string {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private fmtDateLabel(ms: number): string {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${dd} ${mon} ${d.getUTCFullYear()}`;
  }

  // FIX H1/H2/H5/V9: explicit UTC-safe date display — replaces | date pipe on epoch values
  epochToDisplayDate(epoch: any): string {
    if (!epoch) return '-';
    const ms = Number(epoch);
    if (!Number.isFinite(ms) || ms <= 0) return '-';
    return new Date(ms).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  // FIX H5: for range display — uses fromDateMs/toDateMs (already UTC epoch)
  msToDisplayDate(ms: number): string {
    if (!ms) return '-';
    return new Date(ms).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  // ─── Boot: load lookups then timetable ───────────────────────────────
  private loadLookupsAndTimetable() {
    this.loading = true;
    const tenantId = this.tenantId;

    // FIX V2: all calls use consistent entiId key
    forkJoin({
      center: this.commonApi
        .fetchData({ entiId: tenantId }, 'ims', 'center/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      staff: this.commonApi
        .fetchData({ entiId: tenantId }, 'ims', 'staff/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      subject: this.commonApi
        .fetchData({ entiId: tenantId }, 'ims', 'subject/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)), // FIX V1: finalize always clears loading
      )
      .subscribe({
        next: ({ center, staff, subject }: any) => {
          this.centersFull = center?.data || [];
          this.staffFull = staff?.data || [];
          this.subjectsFull = subject?.data || [];

          this.centerByCode = {};
          this.centersFull.forEach((c: any) => {
            const code = safeTrim(c?.centerCode);
            if (code) this.centerByCode[code] = c;
          });

          this.staffByCode = {};
          this.staffById = {};
          this.staffFull.forEach((s: any) => {
            const code = safeTrim(s?.staffCode);
            if (code) this.staffByCode[code] = s;
            [safeTrim(s?.staffId), safeTrim(s?._id), safeTrim(s?.employeeId)]
              .filter(Boolean)
              .forEach((k) => {
                this.staffById[k] = s;
              });
          });

          this.subjectByCode = {};
          this.subjectsFull.forEach((sub: any) => {
            const code = safeTrim(sub?.subjectCode);
            if (code) this.subjectByCode[code] = sub;
          });

          this.loadTimetable();
        },
        error: () => {
          this.loadTimetable();
        },
      });
  }

  // FIX V3: phases use 'institue' module (matching list screen + controller)
  private loadPhases(batchCode: string) {
    if (!batchCode) return;
    this.commonApi
      .fetchData(
        { entiId: this.tenantId, batchCode },
        'institue',
        'phase/list?list=full',
      )
      .pipe(
        catchError(() => of({ data: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe((res: any) => {
        this.phasesFull = res?.data || [];
      });
  }

  getCenterName(centerCode: string) {
    const c = this.centerByCode?.[safeTrim(centerCode)];
    return c?.centerName || centerCode || '-';
  }

  resolveFacultyLabel(p: any) {
    const name = safeTrim(p?.facultyName);
    if (name) return name;
    const idOrCode = safeTrim(p?.facultyId);
    if (!idOrCode) return '';
    const s =
      this.staffByCode?.[idOrCode] || this.staffById?.[idOrCode] || null;
    if (s?.staffName) return `${safeTrim(s.staffName)} (${idOrCode})`;
    return idOrCode;
  }

  resolveSubjectLabel(p: any) {
    const code = safeTrim(p?.subjectCode);
    const name = safeTrim(p?.subjectName);
    if (name && code) return `${name} - ${code}`;
    if (name) return name;
    if (code) return code;
    return '';
  }

  // ─── Load timetable ──────────────────────────────────────────────────
  loadTimetable() {
    this.loading = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, timetableId: this.timetableId },
        this.moduleName,
        'view',
      )
      .pipe(
        takeUntil(this.destroy$), // FIX V1
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: (res: any) => {
          this.timetable = res?.data || null;
          this.lastWeeklyTimetable = this.timetable;
          const wkStart = toInt(this.timetable?.wkStartOn, 0);
          if (wkStart && !this.fromDateStr) {
            this.fromDateStr = this.toISODateInput(wkStart);
            this.toDateStr = this.toISODateInput(
              wkStart + 6 * 24 * 60 * 60 * 1000,
            );
          }
          this.processSchedule();
          if (this.timetable?.batchCode)
            this.loadPhases(this.timetable.batchCode);
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed to load timetable');
        },
      });
  }

  // ─── Schedule processing ─────────────────────────────────────────────
  private buildWeekDateMap() {
    this.weekDateMap = {};
    const wkStartOn = toInt(this.timetable?.wkStartOn, 0);
    if (!wkStartOn) return;
    for (let i = 0; i < this.daysOrder.length; i++) {
      const dateMs = wkStartOn + i * 24 * 60 * 60 * 1000;
      this.weekDateMap[this.daysOrder[i]] = {
        dateMs,
        label: this.fmtDateLabel(dateMs),
      };
    }
  }

  processSchedule() {
    if (!this.timetable?.week) return;
    this.buildWeekDateMap();
    const weekMap = new Map<string, any>(
      (this.timetable.week || []).map((d: any) => [
        String(d.day || '').toUpperCase(),
        d,
      ]),
    );
    this.sortedSchedule = this.daysOrder.map((day) => {
      const periods = (weekMap.get(day)?.periods || [])
        .slice()
        .sort((a: any, b: any) => toInt(a.periodNo) - toInt(b.periodNo));
      const dateMs = this.weekDateMap?.[day]?.dateMs || 0;
      return {
        day,
        dateMs,
        dateLabel: this.weekDateMap?.[day]?.label || '-',
        periods,
        // FIX V4: __isHoliday computed from live overrides at build time
        // getRenderedPeriod also checks isDayCancelled() live — both stay in sync after loadTimetable()
        __isHoliday: this.isDayCancelled(dateMs, day),
      };
    });
    this.maxPeriods = this.computeMaxPeriods();
    if (this.maxPeriods <= 0) this.maxPeriods = 1;
    this.periodHeaders = Array.from(
      { length: this.maxPeriods },
      (_, i) => i + 1,
    );
  }

  // ─── Override finders ────────────────────────────────────────────────
  private findDayOverride(dateMs: number, day: string, action?: string) {
    const ovs = Array.isArray(this.timetable?.dayOverrides)
      ? this.timetable.dayOverrides
      : [];
    const dayU = String(day || '').toUpperCase();
    return ovs.find((o: any) => {
      if (toInt(o?.date) !== toInt(dateMs)) return false;
      if (String(o?.day || '').toUpperCase() !== dayU) return false;
      if (action) return safeTrim(o?.action) === action;
      return true;
    });
  }

  private findPeriodOverride(
    dateMs: number,
    day: string,
    periodNo: number,
    action?: string,
  ) {
    const ovs = Array.isArray(this.timetable?.periodOverrides)
      ? this.timetable.periodOverrides
      : [];
    const dayU = String(day || '').toUpperCase();
    return ovs.find((o: any) => {
      if (toInt(o?.date) !== toInt(dateMs)) return false;
      if (String(o?.day || '').toUpperCase() !== dayU) return false;
      if (toInt(o?.periodNo) !== toInt(periodNo)) return false;
      if (action) return safeTrim(o?.action) === action;
      return true;
    });
  }

  isDayCancelled(dateMs: number, day: string): boolean {
    return !!this.findDayOverride(dateMs, day, 'CANCEL_DAY');
  }

  private getDayReplacementPeriods(dateMs: number, day: string): any[] | null {
    const ov = this.findDayOverride(dateMs, day, 'REPLACE_DAY');
    if (!ov) return null;
    const periods = ov?.periods;
    return Array.isArray(periods)
      ? periods
          .slice()
          .sort((a: any, b: any) => toInt(a.periodNo) - toInt(b.periodNo))
      : null;
  }

  /**
   * Atomically applies all MOVE_PERIOD overrides for a date/day.
   * Snapshots first so swap order never matters.
   */
  private applyMoveOverrides(
    dateMs: number,
    day: string,
    baseMap: Map<number, any>,
  ) {
    const ovs = Array.isArray(this.timetable?.periodOverrides)
      ? this.timetable.periodOverrides
      : [];
    const dayU = String(day || '').toUpperCase();
    const moves = ovs.filter(
      (o: any) =>
        safeTrim(o?.action) === 'MOVE_PERIOD' &&
        toInt(o?.date) === toInt(dateMs) &&
        String(o?.day || '').toUpperCase() === dayU,
    );
    if (!moves.length) return;
    const snapshot = new Map(baseMap);
    for (const ov of moves) {
      const fromP = toInt(ov?.periodNo);
      const toP = toInt(ov?.toPeriodNo);
      if (!fromP || !toP) continue;
      const srcPeriod = snapshot.get(fromP);
      const destPeriod = snapshot.get(toP);
      if (srcPeriod) baseMap.set(toP, { ...srcPeriod, periodNo: toP });
      if (destPeriod) baseMap.set(fromP, { ...destPeriod, periodNo: fromP });
      else baseMap.delete(fromP);
    }
  }

  /**
   * FIX V5: Correct layer order:
   *   1. CANCEL_DAY
   *   2. REPLACE_DAY (whole-day replacement) OR template week[]
   *   3. MOVE_PERIOD overrides (applied atomically on top of step 2 base)
   *   4. CANCEL_PERIOD
   *   5. REPLACE_PERIOD
   */
  getRenderedPeriod(dayRow: any, pNum: number) {
    const dateMs = toInt(dayRow?.dateMs);
    const day = String(dayRow?.day || '').toUpperCase();
    if (!dateMs || !day) return null;

    // Range view: periods pre-built by API
    if (this.viewMode === 'range') {
      if (dayRow?.__isHoliday)
        return { __dayCancelled: true, isCancelled: true, time: {} };
      const list = Array.isArray(dayRow?.periods) ? dayRow.periods : [];
      return list.find((p: any) => toInt(p?.periodNo) === toInt(pNum)) || null;
    }

    // Layer 1: day cancelled
    if (this.isDayCancelled(dateMs, day))
      return { __dayCancelled: true, isCancelled: true, time: {} };

    // Layer 2: whole day replaced OR template
    const replacedPeriods = this.getDayReplacementPeriods(dateMs, day);
    const basePeriods =
      replacedPeriods ?? (Array.isArray(dayRow?.periods) ? dayRow.periods : []);

    const baseMap = new Map<number, any>();
    basePeriods.forEach((p: any) => {
      const pn = toInt(p?.periodNo);
      if (pn > 0) baseMap.set(pn, p);
    });

    // Layer 3: move overrides (atomic snapshot)
    this.applyMoveOverrides(dateMs, day, baseMap);

    const base = baseMap.get(toInt(pNum)) || null;
    if (!base) return null;

    // Layer 4: cancel period
    const cancelOv = this.findPeriodOverride(
      dateMs,
      day,
      toInt(pNum),
      'CANCEL_PERIOD',
    );
    if (cancelOv)
      return {
        ...base,
        isCancelled: true,
        cancelReason: cancelOv.reason || null,
      };

    // Layer 5: replace period
    const replaceOv = this.findPeriodOverride(
      dateMs,
      day,
      toInt(pNum),
      'REPLACE_PERIOD',
    );
    if (replaceOv?.period) return { ...replaceOv.period, __staffChanged: true };

    return base;
  }

  private computeMaxPeriods(): number {
    let maxP = 0;
    (this.sortedSchedule || []).forEach((d: any) => {
      (d?.periods || []).forEach((p: any) => {
        maxP = Math.max(maxP, toInt(p?.periodNo));
      });
    });
    const dayOvs = Array.isArray(this.timetable?.dayOverrides)
      ? this.timetable.dayOverrides
      : [];
    dayOvs.forEach((o: any) => {
      (o?.periods || []).forEach((pp: any) => {
        maxP = Math.max(maxP, toInt(pp?.periodNo));
      });
    });
    const periodOvs = Array.isArray(this.timetable?.periodOverrides)
      ? this.timetable.periodOverrides
      : [];
    periodOvs.forEach((o: any) => {
      maxP = Math.max(maxP, toInt(o?.periodNo), toInt(o?.toPeriodNo));
      if (o?.period) maxP = Math.max(maxP, toInt(o.period?.periodNo));
    });
    return maxP;
  }

  back() {
    this.router.navigate(['/app/timetable']);
  }

  // FIX V6: filter both isCancelled AND __dayCancelled
  private getAllRenderedPeriodsForDay(row: any): any[] {
    const result: any[] = [];
    for (const pNum of this.periodHeaders) {
      const p = this.getRenderedPeriod(row, pNum);
      if (p && !p.__dayCancelled && !p.isCancelled)
        result.push({ ...p, __slotNo: pNum });
    }
    return result;
  }

  // ─── PUBLISH / UNPUBLISH ─────────────────────────────────────────────
  confirmPublish() {
    this.showPublishConfirm = true;
  }
  cancelPublish() {
    this.showPublishConfirm = false;
  }

  submitPublish() {
    this.showPublishConfirm = false;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'publish',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1/V8
      .subscribe({
        next: () => {
          this.alert.success('Timetable published successfully');
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Publish failed');
        },
      });
  }

  submitUnpublish() {
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'unpublish',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1/V8
      .subscribe({
        next: () => {
          this.alert.success('Timetable reverted to Draft');
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Unpublish failed');
        },
      });
  }

  // ─── CANCEL DAY ──────────────────────────────────────────────────────
  openCancelDay(row: any) {
    this.activeDay = row;
    this.cancelDayReason = 'Holiday';
    this.showCancelDay = true;
  }
  closeCancelDay() {
    this.showCancelDay = false;
    this.activeDay = null;
  }

  submitCancelDay() {
    if (!this.activeDay?.dateMs) return;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          date: toInt(this.activeDay.dateMs),
          day: String(this.activeDay.day || '').toUpperCase(),
          reason: safeTrim(this.cancelDayReason) || 'Holiday',
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'day/cancel',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Holiday declared');
          this.closeCancelDay();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed');
        },
      });
  }

  // ─── EDIT WHOLE DAY ──────────────────────────────────────────────────
  openEditDay(row: any) {
    this.activeDay = row;
    const templateDay = (this.timetable?.week || []).find(
      (d: any) =>
        String(d?.day || '').toUpperCase() ===
        String(row?.day || '').toUpperCase(),
    );
    const templatePeriods: any[] = Array.isArray(templateDay?.periods)
      ? [...templateDay.periods]
      : [];

    let periodsToEdit: any[];
    if (this.isPublished) {
      // FIX V6: getAllRenderedPeriodsForDay already filters both isCancelled AND __dayCancelled
      periodsToEdit = this.getAllRenderedPeriodsForDay(row).sort(
        (a: any, b: any) => toInt(a.__slotNo) - toInt(b.__slotNo),
      );
    } else {
      periodsToEdit = templatePeriods.sort(
        (a: any, b: any) => toInt(a.periodNo) - toInt(b.periodNo),
      );
    }

    const mapped = periodsToEdit.map((p: any) => {
      const rawId = safeTrim(p.facultyId) || '';
      const staff = this.staffByCode[rawId] || this.staffById[rawId] || null;
      return {
        periodNo: toInt(p.periodNo || p.__slotNo || 0),
        startTime: minToTimeStr(toInt(p?.time?.startMin)),
        endTime: minToTimeStr(toInt(p?.time?.endMin)),
        periodType: p.periodType || 'LECTURE',
        mode: p.mode || 'OFFLINE',
        facultyId: staff ? safeTrim(staff.staffCode) : rawId,
        facultyName: staff
          ? safeTrim(staff.staffName)
          : safeTrim(p.facultyName) || '',
        subjectCode: safeTrim(p.subjectCode) || '',
        subjectName: safeTrim(p.subjectName) || '',
        subjectId: safeTrim(p.subjectId) || '',
        phaseId: safeTrim(p.phaseId) || '',
        phaseName: safeTrim(p.phaseName) || '',
        topic: safeTrim(p.topic) || '',
        venue: safeTrim(p.venue) || '',
        zoomUrl: safeTrim(p.zoomUrl) || '',
        isCancelled: false,
      };
    });

    this.editDayPeriods = mapped;
    this.editDayOriginalPeriods = mapped.map((ep: any) => ({ ...ep }));
    this.editDayConflicts = [];
    this.editDayDragIndex = null;
    this.editDaySubmitAttempted = false;
    if (!this.editDayPeriods.length) this.addEditDayPeriod();
    this.showEditDay = true;
  }

  closeEditDay() {
    this.showEditDay = false;
    this.activeDay = null;
    this.editDayPeriods = [];
    this.editDayOriginalPeriods = [];
    this.editDayConflicts = [];
    this.editDayValidating = false;
    this.editDaySubmitAttempted = false;
    this.editDayDragIndex = null;
  }

  onDragStart(index: number) {
    this.editDayDragIndex = index;
  }
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  onDragEnd() {
    this.editDayDragIndex = null;
  }

  onDrop(targetIndex: number) {
    const fromIndex = this.editDayDragIndex;
    if (fromIndex === null || fromIndex === targetIndex) {
      this.editDayDragIndex = null;
      return;
    }
    const arr = this.editDayPeriods;
    const moved = arr.splice(fromIndex, 1)[0];
    arr.splice(targetIndex, 0, moved);
    arr.forEach((ep: any, idx: number) => {
      ep.periodNo = idx + 1;
    });
    this.editDayDragIndex = null;
    this.editDayConflicts = [];
  }

  resetEditDayPeriods() {
    this.editDayPeriods = this.editDayOriginalPeriods.map((ep: any) => ({
      ...ep,
    }));
    this.editDayConflicts = [];
    this.editDaySubmitAttempted = false;
  }

  addEditDayPeriod() {
    const lastPeriod = this.editDayPeriods[this.editDayPeriods.length - 1];
    const defaultStart = lastPeriod?.endTime || '';
    this.editDayPeriods.push({
      periodNo: this.editDayPeriods.length + 1,
      startTime: defaultStart,
      endTime: '',
      periodType: 'LECTURE',
      mode: 'OFFLINE',
      facultyId: '',
      facultyName: '',
      subjectCode: '',
      subjectName: '',
      subjectId: '',
      phaseId: '',
      phaseName: '',
      topic: '',
      venue: '',
      zoomUrl: '',
      isCancelled: false,
    });
    this.editDayConflicts = [];
  }

  removeEditDayPeriod(i: number) {
    this.editDayPeriods.splice(i, 1);
    this.editDayPeriods.forEach((ep: any, idx: number) => {
      ep.periodNo = idx + 1;
    });
    this.editDayConflicts = [];
  }

  onEditDayFacultyChange(ep: any) {
    const s = this.staffByCode[safeTrim(ep.facultyId)];
    ep.facultyName = s?.staffName || '';
    this.editDayConflicts = [];
  }

  onEditDaySubjectChange(ep: any) {
    const sub = this.subjectByCode[safeTrim(ep.subjectCode)];
    ep.subjectName = sub?.subjectName || '';
    ep.subjectId = sub?._id || '';
    ep.facultyId = '';
    ep.facultyName = '';
    this.editDayConflicts = [];
  }

  onEditDayPhaseChange(ep: any) {
    const ph = this.phasesFull.find(
      (p: any) => safeTrim(p?.phaseId) === safeTrim(ep.phaseId),
    );
    ep.phaseName = ph?.phaseName || '';
    this.editDayConflicts = [];
  }

  onEditDayModeChange(ep: any) {
    if (ep.mode === 'OFFLINE') ep.zoomUrl = '';
    this.editDayConflicts = [];
  }

  getStaffForSubject(subjectId: string): any[] {
    const id = safeTrim(subjectId);
    if (!id) return this.staffFull;
    const filtered = this.staffFull.filter(
      (s: any) => safeTrim(s?.subject) === id || safeTrim(s?.subjectId) === id,
    );
    return filtered.length ? filtered : this.staffFull;
  }

  private buildEditDayPayloadPeriods(): any[] | null {
    this.editDaySubmitAttempted = true;
    for (let i = 0; i < this.editDayPeriods.length; i++) {
      const ep = this.editDayPeriods[i];
      if (!ep.startTime || !ep.endTime) {
        this.alert.error(`Period ${i + 1}: start and end time are required`);
        return null;
      }
      const startMin = timeStrToMin(ep.startTime);
      const endMin = timeStrToMin(ep.endTime);
      if (endMin <= startMin) {
        this.alert.error(`Period ${i + 1}: end time must be after start time`);
        return null;
      }
      if (!safeTrim(ep.facultyId)) {
        this.alert.error(`Period ${i + 1}: faculty is required`);
        return null;
      }
    }
    return this.editDayPeriods.map((ep: any, idx: number) => {
      const startMin = timeStrToMin(ep.startTime);
      const endMin = timeStrToMin(ep.endTime);
      return {
        periodNo: idx + 1,
        time: {
          startMin,
          endMin,
          startLabel: minToLabel(startMin),
          endLabel: minToLabel(endMin),
        },
        periodType: ep.periodType || 'LECTURE',
        mode: ep.mode || 'OFFLINE',
        zoomUrl: ep.mode === 'ONLINE' ? safeTrim(ep.zoomUrl) || null : null,
        facultyId: safeTrim(ep.facultyId),
        facultyName: safeTrim(ep.facultyName) || null,
        subjectCode: safeTrim(ep.subjectCode) || null,
        subjectName: safeTrim(ep.subjectName) || null,
        subjectId: safeTrim(ep.subjectId) || null,
        phaseId: safeTrim(ep.phaseId) || null,
        phaseName: safeTrim(ep.phaseName) || null,
        topic: safeTrim(ep.topic) || null,
        venue: safeTrim(ep.venue) || null,
        isCancelled: false,
      };
    });
  }

  validateAndSubmitEditDay() {
    if (!this.activeDay?.dateMs || !this.editDayPeriods.length) return;
    const periods = this.buildEditDayPayloadPeriods();
    if (!periods) return;

    // FIX V7: include full week context in validate payload so conflict check sees other days
    const allDays: any[] = this.sortedSchedule.map((row: any) => {
      const isActiveDay =
        String(row.day || '').toUpperCase() ===
        String(this.activeDay.day || '').toUpperCase();
      if (isActiveDay)
        return { day: String(this.activeDay.day || '').toUpperCase(), periods };
      // Other days: use their rendered template periods
      const dayPeriods: any[] = [];
      for (const pNum of this.periodHeaders) {
        const p = this.getRenderedPeriod(row, pNum);
        if (p && !p.__dayCancelled && !p.isCancelled) dayPeriods.push(p);
      }
      return { day: String(row.day || '').toUpperCase(), periods: dayPeriods };
    });

    const validatePayload = {
      tenantId: this.tenantId,
      data: [
        {
          batchCode: safeTrim(this.timetable?.batchCode),
          timetableId: this.timetableId,
          wkStartOn: toInt(this.timetable?.wkStartOn),
          week: allDays,
        },
      ],
    };

    this.editDayValidating = true;
    this.editDayConflicts = [];
    this.commonApi
      .fetchData(validatePayload, this.moduleName, 'validate')
      .pipe(takeUntil(this.destroy$)) // FIX V1
      .subscribe({
        next: () => {
          this.editDayValidating = false;
          this.doSubmitEditDay(periods);
        },
        error: (err: any) => {
          this.editDayValidating = false;
          const conflicts = err?.error?.conflicts;
          if (Array.isArray(conflicts) && conflicts.length)
            this.editDayConflicts = conflicts;
          else this.alert.error(err?.error?.message || 'Validation failed');
        },
      });
  }

  private doSubmitEditDay(periods: any[]) {
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          date: toInt(this.activeDay.dateMs),
          day: String(this.activeDay.day || '').toUpperCase(),
          periods,
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'day/edit',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Day schedule updated');
          this.closeEditDay();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed to update day');
        },
      });
  }

  // ─── CANCEL PERIOD ───────────────────────────────────────────────────
  openCancelPeriod(row: any, pNum: number) {
    this.activeDay = row;
    this.activePeriodNo = toInt(pNum);
    this.cancelPeriodReason = 'Cancelled';
    this.showCancelPeriod = true;
  }
  closeCancelPeriod() {
    this.showCancelPeriod = false;
    this.activeDay = null;
    this.activePeriodNo = 0;
  }

  submitCancelPeriod() {
    if (!this.activeDay?.dateMs || !this.activePeriodNo) return;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          date: toInt(this.activeDay.dateMs),
          day: String(this.activeDay.day || '').toUpperCase(),
          periodNo: toInt(this.activePeriodNo),
          reason: safeTrim(this.cancelPeriodReason) || 'Cancelled',
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'period/cancel',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Period cancelled');
          this.closeCancelPeriod();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Cancel failed');
        },
      });
  }

  // ─── REARRANGE STAFF ─────────────────────────────────────────────────
  openRearrangeStaff(row: any, pNum: number) {
    this.activeDay = row;
    this.activePeriodNo = toInt(pNum);
    this.newFacultyId = '';
    this.newFacultyName = '';
    const p = this.getRenderedPeriod(row, pNum);
    this.activeSubjectId = safeTrim(p?.subjectId) || '';
    this.showRearrangeStaff = true;
  }
  closeRearrangeStaff() {
    this.showRearrangeStaff = false;
    this.activeDay = null;
    this.activePeriodNo = 0;
    this.newFacultyId = '';
    this.newFacultyName = '';
    this.activeSubjectId = '';
  }

  onNewFacultySelected() {
    const s = this.staffByCode[safeTrim(this.newFacultyId)];
    this.newFacultyName = s?.staffName || '';
  }

  submitRearrangeStaff() {
    if (
      !this.activeDay?.dateMs ||
      !this.activePeriodNo ||
      !safeTrim(this.newFacultyId)
    )
      return;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          date: toInt(this.activeDay.dateMs),
          day: String(this.activeDay.day || '').toUpperCase(),
          periodNo: toInt(this.activePeriodNo),
          newFacultyId: safeTrim(this.newFacultyId),
          newFacultyName: safeTrim(this.newFacultyName),
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'period/rearrange-staff',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Staff updated');
          this.closeRearrangeStaff();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Staff change failed');
        },
      });
  }

  // ─── MOVE PERIOD ─────────────────────────────────────────────────────
  openMovePeriod(row: any, pNum: number) {
    this.activeDay = row;
    this.activePeriodNo = toInt(pNum);
    this.moveToPeriodNo = null;
    this.availablePeriodSlots = this.periodHeaders.filter(
      (n) => n !== toInt(pNum),
    );
    this.showMovePeriod = true;
  }
  closeMovePeriod() {
    this.showMovePeriod = false;
    this.activeDay = null;
    this.activePeriodNo = 0;
    this.moveToPeriodNo = null;
  }

  submitMovePeriod() {
    if (!this.activeDay?.dateMs || !this.activePeriodNo || !this.moveToPeriodNo)
      return;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          date: toInt(this.activeDay.dateMs),
          day: String(this.activeDay.day || '').toUpperCase(),
          fromPeriodNo: toInt(this.activePeriodNo),
          toPeriodNo: toInt(this.moveToPeriodNo),
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'period/move',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Period moved');
          this.closeMovePeriod();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Move failed');
        },
      });
  }

  // ─── REPLACE PERIOD ──────────────────────────────────────────────────
  openReplacePeriod(row: any, pNum: number) {
    this.activeDay = row;
    this.activePeriodNo = toInt(pNum);
    const p = this.getRenderedPeriod(row, pNum) || {};
    const rawId = safeTrim(p.facultyId) || '';
    const staff = this.staffByCode[rawId] || this.staffById[rawId] || null;
    this.rp = {
      facultyId: staff ? safeTrim(staff.staffCode) : rawId,
      facultyName: staff
        ? safeTrim(staff.staffName)
        : safeTrim(p.facultyName) || '',
      subjectCode: safeTrim(p.subjectCode) || '',
      subjectName: safeTrim(p.subjectName) || '',
      subjectId: safeTrim(p.subjectId) || '',
      venue: safeTrim(p.venue) || '',
      topic: safeTrim(p.topic) || '',
      periodType: safeTrim(p.periodType) || '',
      mode: safeTrim(p.mode) || '',
      zoomUrl: safeTrim(p.zoomUrl) || '',
      phaseId: safeTrim(p.phaseId) || '',
      phaseName: safeTrim(p.phaseName) || '',
    };
    this.showReplacePeriod = true;
  }
  closeReplacePeriod() {
    this.showReplacePeriod = false;
    this.activeDay = null;
    this.activePeriodNo = 0;
    this.rp = {
      facultyId: '',
      facultyName: '',
      subjectCode: '',
      subjectName: '',
      subjectId: '',
      venue: '',
      topic: '',
      periodType: '',
      mode: '',
      zoomUrl: '',
      phaseId: '',
      phaseName: '',
    };
  }

  onReplaceFacultySelected() {
    const s = this.staffByCode[safeTrim(this.rp?.facultyId)];
    this.rp.facultyName = s?.staffName || '';
  }
  onReplaceSubjectSelected() {
    const sub = this.subjectByCode[safeTrim(this.rp?.subjectCode)];
    this.rp.subjectName = sub?.subjectName || '';
    this.rp.subjectId = sub?._id || '';
    this.rp.facultyId = '';
    this.rp.facultyName = '';
  }
  onReplacePhaseSelected() {
    const ph = this.phasesFull.find(
      (p: any) => safeTrim(p?.phaseId) === safeTrim(this.rp.phaseId),
    );
    this.rp.phaseName = ph?.phaseName || '';
  }

  submitReplacePeriod() {
    if (!this.activeDay?.dateMs || !this.activePeriodNo) return;
    const period: any = {};
    if (safeTrim(this.rp.periodType))
      period.periodType = safeTrim(this.rp.periodType);
    if (safeTrim(this.rp.mode)) period.mode = safeTrim(this.rp.mode);
    if (safeTrim(this.rp.facultyId)) {
      period.facultyId = safeTrim(this.rp.facultyId);
      period.facultyName = safeTrim(this.rp.facultyName) || null;
    }
    if (safeTrim(this.rp.subjectCode)) {
      period.subjectCode = safeTrim(this.rp.subjectCode);
      period.subjectName = safeTrim(this.rp.subjectName) || null;
      period.subjectId = safeTrim(this.rp.subjectId) || null;
    }
    if (safeTrim(this.rp.venue)) period.venue = safeTrim(this.rp.venue);
    if (safeTrim(this.rp.topic)) period.topic = safeTrim(this.rp.topic);
    if (safeTrim(this.rp.zoomUrl)) period.zoomUrl = safeTrim(this.rp.zoomUrl);
    if (safeTrim(this.rp.phaseId)) {
      period.phaseId = safeTrim(this.rp.phaseId);
      period.phaseName = safeTrim(this.rp.phaseName) || null;
    }
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          date: toInt(this.activeDay.dateMs),
          day: String(this.activeDay.day || '').toUpperCase(),
          periodNo: toInt(this.activePeriodNo),
          period,
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'period/replace',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Period replaced');
          this.closeReplacePeriod();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Replace failed');
        },
      });
  }

  // ─── SET ZOOM ────────────────────────────────────────────────────────
  openSetZoom(row: any, pNum: number, period: any) {
    this.activeDay = row;
    this.activePeriodNo = toInt(pNum);
    this.zoomUrlInput = safeTrim(period?.zoomUrl) || '';
    this.showSetZoom = true;
  }
  closeSetZoom() {
    this.showSetZoom = false;
    this.activeDay = null;
    this.activePeriodNo = 0;
    this.zoomUrlInput = '';
  }

  submitSetZoom() {
    if (!this.activeDay?.dateMs || !this.activePeriodNo) return;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          timetableId: this.timetableId,
          date: toInt(this.activeDay.dateMs),
          day: String(this.activeDay.day || '').toUpperCase(),
          periodNo: toInt(this.activePeriodNo),
          zoomUrl: safeTrim(this.zoomUrlInput) || '',
          userId: localStorage.getItem('userId'),
        },
        this.moduleName,
        'update/zoomlink',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Zoom link saved');
          this.closeSetZoom();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Zoom update failed');
        },
      });
  }

  // ─── CONVERT TO EXAM ─────────────────────────────────────────────────
  openConvertToExam(row: any, pNum: number, period: any) {
    this.activeDay = row;
    this.activePeriodNo = toInt(pNum);
    this.examForm = {
      examId: '',
      examDescription: '',
      facultyId: safeTrim(period?.facultyId) || '',
      facultyName: safeTrim(period?.facultyName) || '',
      venue: safeTrim(period?.venue) || '',
      topic: safeTrim(period?.topic) || '',
    };
    this.showConvertToExam = true;
  }
  closeConvertToExam() {
    this.showConvertToExam = false;
    this.activeDay = null;
    this.activePeriodNo = 0;
    this.examForm = {
      examId: '',
      examDescription: '',
      facultyId: '',
      facultyName: '',
      venue: '',
      topic: '',
    };
  }

  onExamFacultySelected() {
    const s = this.staffByCode[safeTrim(this.examForm.facultyId)];
    this.examForm.facultyName = s?.staffName || '';
  }

  submitConvertToExam() {
    if (!this.activeDay?.dateMs || !this.activePeriodNo) return;
    const payload: any = {
      tenantId: this.tenantId,
      timetableId: this.timetableId,
      date: toInt(this.activeDay.dateMs),
      day: String(this.activeDay.day || '').toUpperCase(),
      periodNo: toInt(this.activePeriodNo),
      userId: localStorage.getItem('userId'),
    };
    if (safeTrim(this.examForm.examId))
      payload.examId = safeTrim(this.examForm.examId);
    if (safeTrim(this.examForm.examDescription))
      payload.examDescription = safeTrim(this.examForm.examDescription);
    if (safeTrim(this.examForm.facultyId)) {
      payload.facultyId = safeTrim(this.examForm.facultyId);
      payload.facultyName = safeTrim(this.examForm.facultyName) || null;
    }
    if (safeTrim(this.examForm.venue))
      payload.venue = safeTrim(this.examForm.venue);
    if (safeTrim(this.examForm.topic))
      payload.topic = safeTrim(this.examForm.topic);
    this.loading = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'convertToExam')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: () => {
          this.alert.success('Period converted to Exam');
          this.closeConvertToExam();
          this.loadTimetable();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Convert failed');
        },
      });
  }

  // ─── DATE RANGE VIEW ─────────────────────────────────────────────────
  toggleRangeView() {
    if (this.viewMode === 'range') this.resetToWeekly();
    else {
      this.viewMode = 'range';
      this.rangeMetaLabel = '';
    }
  }

  resetToWeekly() {
    this.viewMode = 'week';
    this.rangeMetaLabel = '';
    if (this.lastWeeklyTimetable) {
      this.timetable = this.lastWeeklyTimetable;
      this.processSchedule();
    } else this.loadTimetable();
  }

  loadByRange() {
    const fromMs = this.toStartOfDayMs(this.fromDateStr);
    const toMs = this.toStartOfDayMs(this.toDateStr) || fromMs;
    const batchCode = safeTrim(
      this.lastWeeklyTimetable?.batchCode || this.timetable?.batchCode,
    );
    if (!fromMs || !batchCode) {
      this.alert.warning('Please select From Date');
      return;
    }
    this.loading = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, batchCode, fromDate: fromMs, toDate: toMs },
        this.moduleName,
        'viewbybatch',
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      ) // FIX V1
      .subscribe({
        next: (res: any) => {
          const schedule = Array.isArray(res?.data) ? res.data : [];
          if (!schedule.length)
            this.alert.warning('No schedule found for selected range');
          this.sortedSchedule = schedule.map((d: any) => ({
            day: String(d?.day || '').toUpperCase(),
            dateMs: toInt(d?.date),
            dateLabel: this.fmtDateLabel(toInt(d?.date)),
            periods: Array.isArray(d?.periods) ? d.periods.slice() : [],
            __isHoliday: d?.isHoliday === true,
            __holidayReason: safeTrim(d?.holidayReason),
          }));
          let maxP = 0;
          this.sortedSchedule.forEach((r: any) => {
            (r?.periods || []).forEach((p: any) => {
              maxP = Math.max(maxP, toInt(p?.periodNo));
            });
          });
          this.maxPeriods = maxP <= 0 ? 1 : maxP;
          this.periodHeaders = Array.from(
            { length: this.maxPeriods },
            (_, i) => i + 1,
          );
          this.rangeMetaLabel = `${batchCode} • ${this.fromDateStr}${this.toDateStr ? ' → ' + this.toDateStr : ''}`;
        },
        error: (err: any) => {
          this.alert.error(
            err?.error?.message || 'Failed to load range schedule',
          );
        },
      });
  }
}
