import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, catchError, of, finalize } from 'rxjs';
import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

const timeToMin = (timeVal: any): number | null => {
  if (timeVal === null || timeVal === undefined || timeVal === '') return null;
  if (typeof timeVal === 'number' && Number.isFinite(timeVal)) {
    if (timeVal < 0) return null;
    if (timeVal > 0 && timeVal < 1) {
      const mins = Math.round(timeVal * 24 * 60);
      return mins >= 0 && mins <= 24 * 60 ? mins : null;
    }
    if (timeVal >= 1 && timeVal <= 24 * 60) return Math.trunc(timeVal);
    if (timeVal > 20000 && timeVal < 90000) {
      const dayFraction = timeVal - Math.floor(timeVal);
      const mins = Math.round(dayFraction * 24 * 60);
      return mins >= 0 && mins <= 24 * 60 ? mins : null;
    }
  }
  const s = String(timeVal).trim();
  if (!s) return null;
  const parts = s.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const minToLabel = (min: number): string => {
  const h24 = Math.floor(min / 60);
  const mm = min % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
};

const VALID_PERIOD_TYPES = [
  'LECTURE',
  'EXAM',
  'LAB',
  'TUTORIAL',
  'TEST',
  'REVISION',
];
const VALID_MODES = ['OFFLINE', 'ONLINE'];

@Component({
  selector: 'app-timetable',
  standalone: false,
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss',
})
export class TimetableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  showUpload = false;
  file: File | null = null;
  loading = false;
  tenantId: any;
  private moduleName = 'timetable';
  timetables: any[] = [];
  totalRecords = 0;
  pageSize = 5;
  selectedBatch = '';
  selectedCenter = '';
  batchesFull: any[] = [];
  centersFull: any[] = [];
  filteredBatches: any[] = [];
  hasSearched = false;

  // ── Lookup maps ──────────────────────────────────────────────────────
  private centerByCode = new Map<string, any>();
  private staffByKey = new Map<string, any>();
  private subjectById = new Map<string, any>();
  private subjectByCode = new Map<string, any>();
  /**
   * phases grouped by programId: Map<programId, Phase[]>
   * Each Phase has phaseId, phaseName, subjectId (ObjectId string), topics[]
   */
  private phasesByProgram = new Map<string, any[]>();
  /** Batch → programId lookup: Map<batchCode, programId> */
  private batchProgramMap = new Map<string, string>();

  // ── Upload / parse state ─────────────────────────────────────────────
  parsedPayload: any = null;
  parsedMeta: any = null;
  parseStats = { totalGroups: 0, totalDays: 0, totalPeriods: 0 };
  parsedGroupsPreview: any[] = [];
  parseError = '';
  parsing = false;
  parsedPreviewRows: any[] = [];
  parsedPreviewTruncated = false;
  private PREVIEW_LIMIT = 25;
  showConfirm = false;
  confirmMode: 'single' | 'bulk' = 'single';
  validateLoading = false;
  validateOk = false;
  validateConflicts: any[] = [];

  // ── Publish confirm (from list row) ──────────────────────────────────
  showPublishConfirmRow = false;
  publishTargetRow: any = null;

  // ── Table columns ────────────────────────────────────────────────────
  columns = [
    { key: 'batchCode', label: 'Batch', sortable: true },
    { key: 'centerCode', label: 'Center', sortable: true },
    { key: 'wkStartOn', label: 'Week Starting', sortable: true, date: true },
    { key: 'phase', label: 'Phase', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      type: 'badge',
      badgeColors: {
        Active: 'badge bg-success-subtle text-success',
        DRAFT: 'badge bg-warning-subtle text-warning',
        Inactive: 'badge bg-secondary-subtle text-secondary',
      },
    },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View Timetable',
      callback: (row: any) => this.openView(row),
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-paper-plane',
      tooltip: 'Publish Timetable',
      // show only for DRAFT rows — custom showIf used by custom-table if supported,
      // otherwise the callback guards it
      callback: (row: any) => this.openPublishConfirmRow(row),
    },
  ];

  constructor(
    private alert: AlertService,
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
  ) {
    this.tenantId =
      localStorage.getItem('tenantId') || localStorage.getItem('entiId');
    this.breadcrumb.set([{ label: 'Control Panel' }, { label: 'Timetable' }]);
  }

  ngOnInit(): void {
    this.loadAllLookupsAndInit();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Private date/time helpers ────────────────────────────────────────
  private previewTime(v: any): string {
    const mins = timeToMin(v);
    return mins === null ? safeTrim(v) : minToLabel(mins);
  }

  private previewDate(v: any): string {
    const ms = this.parseDDMMMYYYY(v);
    if (!ms) return safeTrim(v);
    const d = new Date(ms);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${dd}-${mon}-${d.getUTCFullYear()}`;
  }

  // ─── Table data ───────────────────────────────────────────────────────
  fetchTableData(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  }) {
    if (!this.selectedCenter || !this.selectedBatch) return;
    this.loading = true;
    const query: any = { page: params.page, limit: params.pageSize };
    if (params.search) query.search = params.search;
    if (this.selectedBatch) query.batchCode = this.selectedBatch;
    if (this.selectedCenter) query.centerCode = this.selectedCenter;
    const qs = Object.keys(query)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&');
    this.commonApi
      .fetchData({ tenantId: this.tenantId }, this.moduleName, `list?${qs}`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.hasSearched = true;
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.timetables = res?.data || [];
          this.totalRecords = res?.count || 0;
        },
        error: () => {
          this.alert.error('Error loading timetables');
        },
      });
  }

  applyFilters() {
    if (!this.selectedCenter || !this.selectedBatch) {
      this.alert.warning('Please select both a Center and a Batch to search.');
      return;
    }
    this.timetables = [];
    this.totalRecords = 0;
    this.fetchTableData({ page: 1, pageSize: this.pageSize });
  }

  resetFilters() {
    this.selectedCenter = '';
    this.selectedBatch = '';
    this.filteredBatches = this.batchesFull;
    this.hasSearched = false;
    this.timetables = [];
    this.totalRecords = 0;
  }

  onCenterFilterChange() {
    if (this.selectedCenter) {
      const cc = String(this.selectedCenter);
      this.filteredBatches = this.batchesFull.filter((b: any) => {
        const bcc =
          safeTrim(b?.centerCode) ||
          safeTrim(b?.center?.centerCode) ||
          safeTrim(b?.centerId?.centerCode);
        return bcc ? String(bcc) === cc : true;
      });
    } else {
      this.filteredBatches = this.batchesFull;
    }
    this.selectedBatch = '';
    this.hasSearched = false;
    this.timetables = [];
    this.totalRecords = 0;
  }

  // ─── Boot: load lookups ───────────────────────────────────────────────
  loadAllLookupsAndInit() {
    const tenantId = this.tenantId;
    this.loading = true;
    forkJoin({
      center: this.commonApi
        .fetchData({ tenantId }, 'ims', 'center/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      batch: this.commonApi
        .fetchData({ tenantId }, 'batch', 'list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      staff: this.commonApi
        .fetchData({ tenantId }, 'ims', 'staff/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      subject: this.commonApi
        .fetchData({ entiId: tenantId }, 'ims', 'subject/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
      phase: this.commonApi
        .fetchData({ entiId: tenantId }, 'institue', 'phase/list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ center, batch, staff, subject, phase }) => {
          // Centers
          this.centersFull = center?.data || [];
          this.centerByCode.clear();
          this.centersFull.forEach((c: any) => {
            const code = safeTrim(c?.centerCode);
            if (code) this.centerByCode.set(code, c);
          });

          // Batches
          this.batchesFull = batch?.data || [];
          this.filteredBatches = this.batchesFull;
          this.batchProgramMap.clear();
          this.batchesFull.forEach((b: any) => {
            const bCode = safeTrim(b?.batchCode);
            const progId = safeTrim(
              b?.programId || b?.program || b?.programCode,
            );
            if (bCode && progId) this.batchProgramMap.set(bCode, progId);
          });

          // Staff
          this.staffByKey.clear();
          (staff?.data || []).forEach((s: any) => {
            [
              safeTrim(s?.staffId),
              safeTrim(s?.staffCode),
              safeTrim(s?.employeeId),
              safeTrim(s?._id),
            ]
              .filter(Boolean)
              .map((x) => x.toLowerCase())
              .forEach((k) => this.staffByKey.set(k, s));
          });

          // Subjects
          this.subjectById.clear();
          this.subjectByCode.clear();
          (subject?.data || []).forEach((x: any) => {
            const id = safeTrim(x?._id);
            const code = safeTrim(x?.subjectCode).toLowerCase();
            if (id) this.subjectById.set(id, x);
            if (code) this.subjectByCode.set(code, x);
          });

          // Phases — group by programId
          // Phase schema: { phaseId, phaseName, programId, classNo, subjectId, topics[] }
          this.phasesByProgram.clear();
          (phase?.data || []).forEach((ph: any) => {
            const progId = safeTrim(ph?.programId);
            if (!progId) return;
            if (!this.phasesByProgram.has(progId))
              this.phasesByProgram.set(progId, []);
            this.phasesByProgram.get(progId)!.push(ph);
          });

          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.alert.error('Unable to load initial data!');
        },
      });
  }

  // ─── Phase resolution ─────────────────────────────────────────────────
  /**
   * Given a batchCode and a phaseName string from the upload file,
   * finds the matching Phase for that batch's program.
   * Returns { phaseId, phaseName } or null if not found (phase is optional).
   */
  private resolvePhaseForBatch(
    batchCode: string,
    phaseName: string,
  ): { phaseId: string; phaseName: string } | null {
    const name = safeTrim(phaseName);
    if (!name) return null;
    const programId = this.batchProgramMap.get(safeTrim(batchCode));
    if (!programId) return null;
    const phases = this.phasesByProgram.get(programId) || [];
    const match = phases.find(
      (ph: any) => safeTrim(ph?.phaseName).toLowerCase() === name.toLowerCase(),
    );
    if (!match) return null;
    return {
      phaseId: safeTrim(match.phaseId),
      phaseName: safeTrim(match.phaseName),
    };
  }

  // ─── PUBLISH from list row ────────────────────────────────────────────
  openPublishConfirmRow(row: any) {
    const item = row?._raw || row;
    if (item?.status !== 'DRAFT') {
      this.alert.warning('Only DRAFT timetables can be published.');
      return;
    }
    this.publishTargetRow = item;
    this.showPublishConfirmRow = true;
  }

  closePublishConfirmRow() {
    this.showPublishConfirmRow = false;
    this.publishTargetRow = null;
  }

  submitPublishRow() {
    if (!this.publishTargetRow?._id) return;
    const payload = {
      tenantId: this.tenantId,
      timetableId: this.publishTargetRow._id,
      userId: localStorage.getItem('userId'),
    };
    this.loading = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'publish')
      .pipe(
        finalize(() => {
          this.loading = false;
          this.closePublishConfirmRow();
        }),
      )
      .subscribe({
        next: () => {
          this.alert.success('Timetable published');
          this.applyFilters();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Publish failed');
        },
      });
  }

  // ─── Upload modal ─────────────────────────────────────────────────────
  openUpload() {
    this.showUpload = true;
    this._resetUploadState();
  }

  closeUpload() {
    this.showUpload = false;
    this._resetUploadState();
  }

  private _resetUploadState() {
    this.file = null;
    this.parsedPayload = null;
    this.parsedMeta = null;
    this.parseError = '';
    this.parsing = false;
    this.parseStats = { totalGroups: 0, totalDays: 0, totalPeriods: 0 };
    this.parsedGroupsPreview = [];
    this.parsedPreviewRows = [];
    this.parsedPreviewTruncated = false;
    this.validateLoading = false;
    this.validateOk = false;
    this.validateConflicts = [];
  }

  onFileChange(e: any): void {
    const f = e.target.files?.[0];
    if (!f) return;
    this.parseError = '';
    this.parsedPayload = null;
    this.parsedMeta = null;
    this.parseStats = { totalGroups: 0, totalDays: 0, totalPeriods: 0 };
    this.parsedGroupsPreview = [];
    this.parsedPreviewRows = [];
    this.parsedPreviewTruncated = false;
    this.validateLoading = false;
    this.validateOk = false;
    this.validateConflicts = [];
    const name = f.name.toLowerCase();
    if (name.endsWith('.csv') || f.type === 'text/csv') {
      this.file = f;
      this.parsing = true;
      this.parseCsv(f);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      this.file = f;
      this.parsing = true;
      this.parseExcel(f);
    } else {
      this.alert.warning('Please upload a .csv, .xlsx, or .xls file.');
    }
  }

  parseCsv(file: File) {
    const reader = new FileReader();
    reader.onload = (evt: any) => {
      try {
        this.processCsvData(evt.target.result);
      } finally {
        this.parsing = false;
      }
    };
    reader.onerror = () => {
      this.parsing = false;
      this.parseError = 'Failed to read file.';
    };
    reader.readAsText(file);
  }

  parseExcel(file: File) {
    const reader = new FileReader();
    reader.onload = (evt: any) => {
      try {
        const data = new Uint8Array(evt.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          this.parseError = 'Excel file has no sheets.';
          return;
        }
        const rows: any[] = XLSX.utils.sheet_to_json(
          workbook.Sheets[sheetName],
          { defval: '', raw: true },
        );
        this.processTabularRows(rows);
      } catch {
        this.parseError =
          'Failed to parse Excel file. Make sure it is a valid .xlsx/.xls file.';
      } finally {
        this.parsing = false;
      }
    };
    reader.onerror = () => {
      this.parsing = false;
      this.parseError = 'Failed to read Excel file.';
    };
    reader.readAsArrayBuffer(file);
  }

  // ─── Core parse: tabular rows (from Excel sheet_to_json) ─────────────
  private processTabularRows(data: any[]) {
    this.parseError = '';
    this.parsedPreviewRows = [];
    this.parsedPreviewTruncated = false;
    if (!Array.isArray(data) || !data.length) {
      this.parseError = 'No valid data found in file';
      return;
    }

    this.parsedPreviewRows = data
      .slice(0, this.PREVIEW_LIMIT)
      .map((r: any) => ({
        BatchCode: safeTrim(r['BatchCode']),
        CentCode: safeTrim(r['CentCode']),
        Phase: safeTrim(r['Phase']),
        PhaseName: safeTrim(r['PhaseName']),
        FacultyID: safeTrim(r['FacultyID']),
        PeriodType: safeTrim(r['PeriodType']),
        Mode: safeTrim(r['Mode']),
        ZoomUrl: safeTrim(r['ZoomUrl']),
        Descriptions: safeTrim(r['Descriptions']),
        Venue: safeTrim(r['Venue']),
        TimeStart: this.previewTime(r['TimeStart']),
        TimeEnd: this.previewTime(r['TimeEnd']),
        WkStartOn: this.previewDate(r['WkStartOn']),
        Dates: this.previewDate(r['Dates']),
      }));
    this.parsedPreviewTruncated = data.length > this.PREVIEW_LIMIT;

    const groupsMap = new Map<string, any[]>();
    const metaMap = new Map<string, any>();
    for (const r of data) {
      const batchCode = safeTrim(r['BatchCode']);
      const centerCode = safeTrim(r['CentCode']);
      const phase = safeTrim(r['Phase']);
      const wkStartOnRaw = r['WkStartOn'];
      if (!batchCode) continue;
      const wkStartOnMs = this.parseDDMMMYYYY(wkStartOnRaw);
      if (!wkStartOnMs) {
        this.parseError = `Invalid date format in "WkStartOn": "${safeTrim(wkStartOnRaw)}". Use dd-MMM-yyyy like 02-Feb-2026`;
        return;
      }
      if (centerCode && !this.centerByCode.get(centerCode)) {
        this.parseError = `Center not found for CentCode "${centerCode}". Please match with Center centerCode in DB.`;
        return;
      }
      const key = `${batchCode}||${centerCode}||${safeTrim(wkStartOnRaw)}||${phase}`;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(r);
      if (!metaMap.has(key))
        metaMap.set(key, {
          batchCode,
          centerCode,
          phase,
          wkStartOn: wkStartOnMs,
          wkStartOnLabel: safeTrim(wkStartOnRaw) || '(excel date)',
        });
    }

    this._buildPayloadFromGroups(groupsMap, metaMap);
  }

  // ─── Core parse: CSV text ─────────────────────────────────────────────
  processCsvData(csvText: string) {
    this.parseError = '';
    this.parsedPreviewRows = [];
    this.parsedPreviewTruncated = false;
    const lines = csvText.split(/\r\n|\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) {
      this.parseError = 'CSV is empty';
      return;
    }
    const headers = lines[0].split(',').map((h) => h.trim());
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length < headers.length) continue;
      const obj: any = {};
      headers.forEach((h, idx) => (obj[h] = safeTrim(row[idx])));
      data.push(obj);
    }
    if (!data.length) {
      this.parseError = 'No valid data found in CSV';
      return;
    }

    this.parsedPreviewRows = data
      .slice(0, this.PREVIEW_LIMIT)
      .map((r: any) => ({
        BatchCode: safeTrim(r['BatchCode']),
        CentCode: safeTrim(r['CentCode']),
        WkStartOn: this.previewDate(r['WkStartOn']),
        Phase: safeTrim(r['Phase']),
        PhaseName: safeTrim(r['PhaseName']),
        Dates: this.previewDate(r['Dates']),
        TimeStart: this.previewTime(r['TimeStart']),
        TimeEnd: this.previewTime(r['TimeEnd']),
        FacultyID: safeTrim(r['FacultyID']),
        PeriodType: safeTrim(r['PeriodType']),
        Mode: safeTrim(r['Mode']),
        ZoomUrl: safeTrim(r['ZoomUrl']),
        Descriptions: safeTrim(r['Descriptions']),
        Venue: safeTrim(r['Venue']),
      }));
    this.parsedPreviewTruncated = data.length > this.PREVIEW_LIMIT;

    const groupsMap = new Map<string, any[]>();
    const metaMap = new Map<string, any>();
    for (const r of data) {
      const batchCode = safeTrim(r['BatchCode']);
      const centerCode = safeTrim(r['CentCode']);
      const phase = safeTrim(r['Phase']);
      const wkStartOnStr = safeTrim(r['WkStartOn']);
      if (!batchCode) continue;
      const wkStartOnMs = this.parseDDMMMYYYY(wkStartOnStr);
      if (!wkStartOnMs) {
        this.parseError = `Invalid date format in "WkStartOn": "${wkStartOnStr}". Use dd-MMM-yyyy like 02-Feb-2026`;
        return;
      }
      if (centerCode && !this.centerByCode.get(centerCode)) {
        this.parseError = `Center not found for CentCode "${centerCode}". Please match with Center centerCode in DB.`;
        return;
      }
      const key = `${batchCode}||${centerCode}||${wkStartOnStr}||${phase}`;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(r);
      if (!metaMap.has(key))
        metaMap.set(key, {
          batchCode,
          centerCode,
          phase,
          wkStartOn: wkStartOnMs,
          wkStartOnLabel: wkStartOnStr,
        });
    }

    this._buildPayloadFromGroups(groupsMap, metaMap);
  }

  // ─── Shared: build parsedPayload from grouped rows ────────────────────
  private _buildPayloadFromGroups(
    groupsMap: Map<string, any[]>,
    metaMap: Map<string, any>,
  ) {
    const groupKeys = Array.from(groupsMap.keys());
    if (!groupKeys.length) {
      this.parseError = 'No valid timetable meta found (BatchCode/WkStartOn)';
      return;
    }

    const payloadGroups: any[] = [];
    let totalDays = 0;
    let totalPeriods = 0;

    for (const k of groupKeys) {
      const rows = groupsMap.get(k) || [];
      const meta = metaMap.get(k);
      const week = this.buildWeekPayloadFromRows(rows, meta.batchCode);
      if (!week) return; // parse error was set inside

      const daysCount = week.length;
      const periodsCount = week.reduce(
        (acc: number, d: any) => acc + (d.periods || []).length,
        0,
      );
      const allPeriods = week.flatMap((d: any) => d.periods || []);
      totalDays += daysCount;
      totalPeriods += periodsCount;

      payloadGroups.push({
        batchCode: meta.batchCode,
        centerCode: meta.centerCode || null,
        phase: meta.phase || null,
        wkStartOn: meta.wkStartOn,
        wkStartOnLabel: meta.wkStartOnLabel,
        week,
        daysCount,
        periodsCount,
        onlineCount: allPeriods.filter((p: any) => p.mode === 'ONLINE').length,
        offlineCount: allPeriods.filter((p: any) => p.mode !== 'ONLINE').length,
      });
    }

    this.parseStats = {
      totalGroups: payloadGroups.length,
      totalDays,
      totalPeriods,
    };

    if (payloadGroups.length === 1) {
      const one = payloadGroups[0];
      this.parsedMeta = {
        batchCode: one.batchCode,
        centerCode: one.centerCode,
        phase: one.phase,
        wkStartOn: one.wkStartOn,
        wkStartOnLabel: one.wkStartOnLabel,
      };
      this.parsedPayload = {
        batchCode: one.batchCode,
        centerCode: one.centerCode,
        phase: one.phase,
        wkStartOn: one.wkStartOn,
        week: one.week,
      };
      this.parsedGroupsPreview = [];
    } else {
      this.parsedMeta = null;
      this.parsedPayload = payloadGroups.map((g) => ({
        batchCode: g.batchCode,
        centerCode: g.centerCode,
        phase: g.phase,
        wkStartOn: g.wkStartOn,
        week: g.week,
      }));
      this.parsedGroupsPreview = payloadGroups.map((g) => ({
        batchCode: g.batchCode,
        centerCode: g.centerCode,
        phase: g.phase,
        wkStartOnLabel: g.wkStartOnLabel,
        daysCount: g.daysCount,
        periodsCount: g.periodsCount,
        onlineCount: g.onlineCount,
        offlineCount: g.offlineCount,
      }));
    }
  }

  // ─── Parse date ───────────────────────────────────────────────────────
  private parseDDMMMYYYY(dateStr: any): number | null {
    if (dateStr instanceof Date && !isNaN(dateStr.getTime()))
      return Date.UTC(
        dateStr.getFullYear(),
        dateStr.getMonth(),
        dateStr.getDate(),
      );
    if (
      typeof dateStr === 'number' &&
      Number.isFinite(dateStr) &&
      dateStr > 59 &&
      dateStr < 2958466
    ) {
      const ms = (Math.round(dateStr) - 25569) * 86400 * 1000;
      const d = new Date(ms);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    const raw =
      dateStr === undefined || dateStr === null ? '' : String(dateStr).trim();
    if (!raw) return null;
    if (/^\d{5,6}(\.\d+)?$/.test(raw)) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 59 && n < 2958466) {
        const ms = (Math.round(n) - 25569) * 86400 * 1000;
        const d = new Date(ms);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      }
    }
    const s = raw.split(/[\sT]/)[0].trim();
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const [, y, mo, dd] = iso.map(Number);
      if (mo < 1 || mo > 12 || dd < 1 || dd > 31) return null;
      return Date.UTC(y, mo - 1, dd);
    }
    const named = s.match(
      /^(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{2}|\d{4})$/,
    );
    if (named) {
      const months: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      const dd = Number(named[1]);
      const mo = months[named[2].slice(0, 3).toLowerCase()];
      let yyyy = Number(named[3]);
      if (yyyy < 100) yyyy += yyyy < 50 ? 2000 : 1900;
      if (mo === undefined || dd < 1 || dd > 31 || yyyy < 1900) return null;
      return Date.UTC(yyyy, mo, dd);
    }
    return null;
  }

  // ─── Staff/subject helpers ────────────────────────────────────────────
  private getStaffFromCsv(value: string) {
    return this.staffByKey.get(safeTrim(value).toLowerCase()) || null;
  }

  private getSubjectFromStaff(staff: any) {
    const subId = safeTrim(staff?.subject);
    return subId ? this.subjectById.get(subId) || null : null;
  }

  // ─── Build week payload from raw rows ────────────────────────────────
  /**
   * @param rows      Flat array of raw spreadsheet rows for ONE timetable group
   * @param batchCode Used for phase resolution
   */
  private buildWeekPayloadFromRows(rows: any[], batchCode: string) {
    const daysOrder = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ];
    const weekMap = new Map<string, any[]>();

    for (const row of rows) {
      const dateStr = safeTrim(row['Dates']);
      const epoch = this.parseDDMMMYYYY(dateStr);
      if (!epoch) {
        this.parseError = `Invalid date format in "Dates": "${dateStr}". Use dd-MMM-yyyy like 02-Feb-2026`;
        return null;
      }
      const dateObj = new Date(epoch);
      const dayName =
        daysOrder[dateObj.getUTCDay() === 0 ? 6 : dateObj.getUTCDay() - 1];

      const startMin = timeToMin(row['TimeStart']);
      const endMin = timeToMin(row['TimeEnd']);
      if (startMin === null || endMin === null) {
        this.parseError = `Invalid time on row FacultyID "${safeTrim(row['FacultyID'])}" date "${safeTrim(row['Dates'])}": TimeStart="${safeTrim(row['TimeStart'])}" TimeEnd="${safeTrim(row['TimeEnd'])}"`;
        return null;
      }
      if (endMin <= startMin) {
        this.parseError = `TimeEnd must be after TimeStart on row FacultyID "${safeTrim(row['FacultyID'])}" date "${safeTrim(row['Dates'])}"`;
        return null;
      }

      const facultyRaw = safeTrim(row['FacultyID']);
      const staff = this.getStaffFromCsv(facultyRaw);
      if (!staff) {
        this.parseError = `Staff not found for FacultyID "${facultyRaw}". Please match with staffId/staffCode/employeeId in DB.`;
        return null;
      }

      const subj = this.getSubjectFromStaff(staff);
      const periodType = (() => {
        const t = safeTrim(row['PeriodType']).toUpperCase() || 'LECTURE';
        return VALID_PERIOD_TYPES.includes(t) ? t : 'LECTURE';
      })();
      const mode = (() => {
        const m = safeTrim(row['Mode']).toUpperCase() || 'OFFLINE';
        return VALID_MODES.includes(m) ? m : 'OFFLINE';
      })();
      const zoomUrl =
        mode === 'ONLINE' ? safeTrim(row['ZoomUrl']) || null : null;

      // ── Phase resolution ──────────────────────────────────────────────
      // PhaseName column in the upload file links to the phase plan.
      // Validated against the batch's programId. Optional — no error if missing.
      const phaseNameRaw = safeTrim(row['PhaseName']) || safeTrim(row['Phase']);
      const resolvedPhase = phaseNameRaw
        ? this.resolvePhaseForBatch(batchCode, phaseNameRaw)
        : null;
      // If a PhaseName was provided but we couldn't resolve it, warn (don't block)
      if (phaseNameRaw && !resolvedPhase) {
        console.warn(
          `Phase "${phaseNameRaw}" not found for batch "${batchCode}" — period will have no phase link`,
        );
      }

      if (!weekMap.has(dayName)) weekMap.set(dayName, []);
      weekMap.get(dayName)!.push({
        startMin,
        endMin,
        startLabel: minToLabel(startMin),
        endLabel: minToLabel(endMin),
        periodType,
        mode,
        zoomUrl,
        facultyId:
          safeTrim(staff?.staffId) || safeTrim(staff?._id) || facultyRaw,
        facultyName: safeTrim(staff?.staffName) || null,
        subjectId: subj ? safeTrim(subj?._id) : null,
        subjectCode: subj ? safeTrim(subj?.subjectCode) : null,
        subjectName: subj ? safeTrim(subj?.subjectName) : null,
        // Phase plan fields — null if not resolved
        phaseId: resolvedPhase?.phaseId || null,
        phaseName: resolvedPhase?.phaseName || null,
        topic: safeTrim(row['Descriptions']) || null,
        venue: safeTrim(row['Venue']) || null,
      });
    }

    const weekPayload: any[] = [];
    weekMap.forEach((periods, day) => {
      periods.sort((a, b) => a.startMin - b.startMin);
      const periodsWithNo = periods.map((p, idx) => {
        const period: any = {
          periodNo: idx + 1,
          time: {
            startMin: p.startMin,
            endMin: p.endMin,
            startLabel: p.startLabel,
            endLabel: p.endLabel,
          },
          periodType: p.periodType,
          mode: p.mode,
          facultyId: p.facultyId,
          facultyName: p.facultyName,
          subjectId: p.subjectId,
          subjectCode: p.subjectCode,
          subjectName: p.subjectName,
          topic: p.topic,
          venue: p.venue,
        };
        // Only include phase fields if resolved
        if (p.phaseId) period.phaseId = p.phaseId;
        if (p.phaseName) period.phaseName = p.phaseName;
        if (p.mode === 'ONLINE' && p.zoomUrl) period.zoomUrl = p.zoomUrl;
        return period;
      });
      weekPayload.push({ day, periods: periodsWithNo });
    });
    return weekPayload;
  }

  // ─── Submit ───────────────────────────────────────────────────────────
  submitCreateFromCsv() {
    if (!this.parsedPayload || this.parseError || this.parsing) return;
    const payload = {
      tenantId: this.tenantId,
      batchCode: safeTrim(this.parsedPayload.batchCode),
      centerCode: safeTrim(this.parsedPayload.centerCode) || undefined,
      phase: safeTrim(this.parsedPayload.phase) || undefined,
      wkStartOn: this.parsedPayload.wkStartOn,
      week: this.parsedPayload.week,
      userId: localStorage.getItem('userId'),
    };
    if (!payload.batchCode || !payload.wkStartOn) {
      this.alert.error('BatchCode and WkStartOn missing');
      return;
    }
    if (!Array.isArray(payload.week) || !payload.week.length) {
      this.alert.error('No week data parsed');
      return;
    }
    this.loading = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'create')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          this.alert.success('Timetable saved successfully');
          this.closeUpload();
          res?.data?._id
            ? this.router.navigate(['/app/timetable/view', res.data._id])
            : this.applyFilters();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Create failed');
        },
      });
  }

  submitImportFromCsv() {
    if (
      !this.parsedPayload ||
      !Array.isArray(this.parsedPayload) ||
      this.parseError ||
      this.parsing
    )
      return;
    const payload = {
      tenantId: this.tenantId,
      data: this.parsedPayload,
      userId: localStorage.getItem('userId'),
    };
    if (!payload.data.length) {
      this.alert.error('No valid timetable groups to import');
      return;
    }
    this.loading = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'import')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.alert.success('Import completed');
          this.closeUpload();
          this.applyFilters();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Import failed');
        },
      });
  }

  openView(row: any) {
    const item = row?._raw || row;
    this.router.navigate(['/app/timetable/view', item._id]);
  }

  // ─── Sample Excel download ────────────────────────────────────────────
  downloadSample() {
    const headers = [
      'BatchCode',
      'TimeStart',
      'TimeEnd',
      'Dates',
      'FacultyID',
      'PeriodType',
      'Mode',
      'ZoomUrl',
      'Descriptions',
      'Venue',
      'PhaseName', // ← new: links period to phase plan
      'Phase',
      'CentCode',
      'WkStartOn',
    ];
    const rows = [
      [
        'JEE-2025-A',
        '09:00',
        '10:30',
        '09-Feb-2026',
        'STF0016',
        'LECTURE',
        'OFFLINE',
        '',
        'Physics - Kinematics',
        'Hall A',
        'Phase 1',
        'Phase 1',
        'CENTER-01',
        '09-Feb-2026',
      ],
      [
        'JEE-2025-A',
        '10:45',
        '12:15',
        '09-Feb-2026',
        'STF0016',
        'LECTURE',
        'ONLINE',
        'https://zoom.us/j/1234567890',
        'Maths - Calculus',
        '',
        'Phase 1',
        'Phase 1',
        'CENTER-01',
        '09-Feb-2026',
      ],
      [
        'JEE-2025-A',
        '09:00',
        '10:30',
        '10-Feb-2026',
        'STF0016',
        'LAB',
        'OFFLINE',
        '',
        'Chemistry - Atomic Structure',
        'Lab 1',
        'Phase 1',
        'Phase 1',
        'CENTER-01',
        '09-Feb-2026',
      ],
      [
        'JEE-2025-A',
        '11:00',
        '12:00',
        '10-Feb-2026',
        'STF0016',
        'TUTORIAL',
        'OFFLINE',
        '',
        'Maths - Revision',
        'Hall B',
        '',
        'Phase 1',
        'CENTER-01',
        '09-Feb-2026',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    headers.forEach((_, colIdx) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[ref]) ws[ref].s = { font: { bold: true } };
    });
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
    XLSX.writeFile(wb, 'Timetable_Upload_Format.xlsx');
  }

  // ─── Confirm / validate flow ──────────────────────────────────────────
  openConfirm(mode: 'single' | 'bulk') {
    if (!this.parsedPayload || this.parseError) return;
    this.confirmMode = mode;
    this.showConfirm = true;
    this.validateLoading = false;
    this.validateOk = false;
    this.validateConflicts = [];
  }

  closeConfirm() {
    if (this.validateLoading) return;
    this.showConfirm = false;
    this.validateLoading = false;
    this.validateOk = false;
    this.validateConflicts = [];
  }

  private buildValidationGroups(): any[] {
    if (!this.parsedPayload) return [];
    if (!Array.isArray(this.parsedPayload)) {
      return [
        {
          batchCode: safeTrim(this.parsedPayload.batchCode),
          centerCode: safeTrim(this.parsedPayload.centerCode) || null,
          phase: safeTrim(this.parsedPayload.phase) || null,
          wkStartOn: this.parsedPayload.wkStartOn,
          week: this.parsedPayload.week,
        },
      ];
    }
    return this.parsedPayload.map((g: any) => ({
      batchCode: safeTrim(g?.batchCode),
      centerCode: safeTrim(g?.centerCode) || null,
      phase: safeTrim(g?.phase) || null,
      wkStartOn: g?.wkStartOn,
      week: g?.week,
    }));
  }

  runValidateAndProceed() {
    if (this.validateLoading) return;
    const groups = this.buildValidationGroups();
    if (!groups.length) {
      this.alert.error('No valid data to validate');
      return;
    }
    this.validateLoading = true;
    this.validateOk = false;
    this.validateConflicts = [];
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, data: groups },
        this.moduleName,
        'validate',
      )
      .pipe(finalize(() => (this.validateLoading = false)))
      .subscribe({
        next: (res: any) => {
          const conflicts = Array.isArray(res?.conflicts) ? res.conflicts : [];
          this.validateConflicts = conflicts;
          if (res?.status === true && !conflicts.length) {
            this.validateOk = true;
            this.alert.success('Validation passed — no conflicts found');
          } else {
            this.validateOk = false;
            if (conflicts.length)
              this.alert.warning(
                `${conflicts.length} conflict(s) detected. Fix and re-upload.`,
              );
          }
        },
        error: (err: any) => {
          this.validateOk = false;
          const conflicts = Array.isArray(err?.error?.conflicts)
            ? err.error.conflicts
            : [];
          this.validateConflicts = conflicts;
          if (conflicts.length)
            this.alert.warning(
              `${conflicts.length} conflict(s) detected. Fix and re-upload.`,
            );
          else this.alert.error(err?.error?.message || 'Validation failed');
        },
      });
  }

  confirmProceed() {
    if (!this.validateOk || this.validateConflicts.length) return;
    this.showConfirm = false;
    Array.isArray(this.parsedPayload)
      ? this.submitImportFromCsv()
      : this.submitCreateFromCsv();
  }

  // ─── Conflict time display ────────────────────────────────────────────
  private toAmPm(min: any): string {
    const n = Number(min);
    return Number.isFinite(n) && n >= 0 ? minToLabel(Math.trunc(n)) : '-';
  }

  conflictTimeRange(c: any): string {
    const s = c?.startMin ?? c?.time?.startMin ?? c?.period?.time?.startMin;
    const e = c?.endMin ?? c?.time?.endMin ?? c?.period?.time?.endMin;
    const sn = Number(s),
      en = Number(e);
    if (Number.isFinite(sn) && Number.isFinite(en))
      return `${this.toAmPm(sn)} – ${this.toAmPm(en)}`;
    const m = String(c?.message || '').match(
      /from\s+(\d+)\s+to\s+(\d+)\s+mins?/i,
    );
    if (m) {
      const [, a, b] = m.map(Number);
      if (Number.isFinite(a) && Number.isFinite(b))
        return `${this.toAmPm(a)} – ${this.toAmPm(b)}`;
    }
    return '-';
  }
}
