import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonapiService } from '../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../service/alert/alert.service';

export interface BatchOption {
  value: string;
  label: string;
  batchCode: string;
  batchId: string;
  programId: string;
  classNo?: number;
  staffMap?: any[];
}

export interface StaffOption {
  value: string;
  label: string;
  staffId: string;
  staffName: string;
  staffCode?: string;
}

export interface StudentOption {
  value: string;
  label: string;
  admissionNo: string;
  studentId: string;
  batchCode?: string;
}

export interface SubjectOption {
  value: string;       // subjectId (_id)
  label: string;       // subjectName
}

export interface TopicOption {
  value: string;       // topicId
  label: string;       // topicName
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  readonly tenantId = localStorage.getItem('tenantId') || '';
  private _batchOptions = new BehaviorSubject<BatchOption[]>([]);
  private _staffOptions = new BehaviorSubject<StaffOption[]>([]);
  private _allBatchesFull: any[] = [];
  readonly batchOptions$ = this._batchOptions.asObservable();
  readonly staffOptions$ = this._staffOptions.asObservable();
  get batchOptions(): BatchOption[] { return this._batchOptions.value; }
  get staffOptions(): StaffOption[] { return this._staffOptions.value; }
  get allBatchesFull(): any[] { return this._allBatchesFull; }
  private _batchesLoaded = false;
  private _staffLoaded = false;

  constructor(
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {}

  // ── Load shared data ───────────────────────────────────────────────────────
  loadBatches(): void {
    if (this._batchesLoaded) return;
    this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full').subscribe({
      next: (res: any) => {
        this._allBatchesFull = res?.data || [];
        const opts: BatchOption[] = this._allBatchesFull.map((b: any) => ({
          value: b.batchId || b._id,
          label: `${b.batchCode} - ${b.batchName}`,
          batchCode: b.batchCode,
          batchId: b.batchId || b._id,
          programId: b.programId,
          classNo: b.classNo,
          staffMap: b.staffMap || []
        }));
        this._batchOptions.next(opts);
        this._batchesLoaded = true;
      },
      error: () => this.alert.error('Failed to load batches')
    });
  }

  loadStaff(): void {
    if (this._staffLoaded) return;
    this.commonApi.fetchData({ entiId: this.tenantId }, 'ims', 'staff/list?list=full').subscribe({
      next: (res: any) => {
        const opts: StaffOption[] = (res?.data || []).map((s: any) => ({
          value: s.staffId || s._id,
          label: (s.staffCode ? `${s.staffCode} - ` : '') + s.staffName,
          staffId: s.staffId || s._id,
          staffName: s.staffName,
          staffCode: s.staffCode || null
        }));
        this._staffOptions.next(opts);
        this._staffLoaded = true;
      },
      error: () => this.alert.error('Failed to load staff')
    });
  }

  // Force reload (used when tenant changes)
  reload(): void {
    this._batchesLoaded = false;
    this._staffLoaded = false;
    this.loadBatches();
    this.loadStaff();
  }

  // ── Students by batch ──────────────────────────────────────────────────────
  loadStudentsByBatchCodes(batchCodes: string[]): Observable<StudentOption[]> {
    if (!batchCodes.length) return new BehaviorSubject<StudentOption[]>([]).asObservable();
    const calls = batchCodes.map(bc =>
      this.commonApi.fetchData({ entiId: this.tenantId }, 'student', `list?list=full&batchCode=${bc}`)
    );
    return forkJoin(calls).pipe(
      map((results: any[]) => {
        const allStudents = results.flatMap((res: any) => res?.data || []);
        const seen = new Set<string>();
        const unique = allStudents.filter((s: any) => {
          const id = s.studentId || s._id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        return this.mapStudentOptions(unique);
      })
    );
  }

  private mapStudentOptions(students: any[]): StudentOption[] {
    return students.map((s: any) => ({
      value: s.studentId || s._id,
      label: `${s.admissionNo || ''} - ${s.student?.name || s.name || s.studentName || ''}`,
      admissionNo: s.admissionNo,
      studentId: s.studentId || s._id,
      batchCode: s.batchCode || null
    }));
  }

  // ── Subjects by batchCodes (from timetable) ────────────────────────────────
  loadSubjectsByBatches(batchCodes: string[]): Observable<SubjectOption[]> {
    return this.commonApi.fetchData(
      { entiId: this.tenantId, batchCodes },
      'reports/batch',
      'subjects-by-batch'
    ).pipe(
      map((res: any) => (res?.data || []).map((s: any) => ({
        value: s._id || s.subjectId,
        label: s.subjectName
      })))
    );
  }

  // All subjects
  loadAllSubjects(): Observable<SubjectOption[]> {
    return this.commonApi.fetchData({ entiId: this.tenantId }, 'ims', 'subject/list?list=full').pipe(
      map((res: any) => (res?.data || []).map((s: any) => ({
        value: s._id,
        label: s.subjectName
      })))
    );
  }

  // ── Topics by subject ──────────────────────────────────────────────────────
  loadTopics(subjectId: string): Observable<TopicOption[]> {
    return this.commonApi.fetchData(
      { entiId: this.tenantId, subjectId },
      'ims',
      `topic/list?list=full&subjectId=${subjectId}`
    ).pipe(
      map((res: any) => (res?.data || []).map((t: any) => ({
        value: t.topicId || t._id,
        label: t.topicName
      })))
    );
  }

  // ── Programs ───────────────────────────────────────────────────────────────
  loadPrograms(): Observable<any[]> {
    return this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/program', 'list?list=full').pipe(
      map((res: any) => (res?.data || []).map((p: any) => ({
        value: p.programId || p._id,
        label: p.programName
      })))
    );
  }

  // ── Centers ────────────────────────────────────────────────────────────────
  loadCenters(): Observable<any[]> {
    return this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/center', 'list?list=full').pipe(
      map((res: any) => (res?.data || []).map((c: any) => ({
        value: c.centerId || c._id,
        label: c.centerName
      })))
    );
  }

  // ── API call ───────────────────────────────────────────────────────────────
  generate(module: string, endpoint: string, payload: any): Observable<any> {
    return this.commonApi.fetchData({ entiId: this.tenantId, ...payload }, module, endpoint);
  }

  // ── Batch helpers ──────────────────────────────────────────────────────────
  getBatchesByPrograms(programIds: string[]): BatchOption[] {
    if (!programIds.length) return this.batchOptions;
    return this.batchOptions.filter(b =>
      this._allBatchesFull.some((fb: any) =>
        fb.batchId === b.value && programIds.includes(fb.programId)
      )
    );
  }

  getBatchCodesByIds(batchIds: string[]): string[] {
    return this.batchOptions
      .filter(b => batchIds.includes(b.value))
      .map(b => b.batchCode)
      .filter(Boolean);
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  formatHours(decimalHours: any): string {
    if (decimalHours === null || decimalHours === undefined || decimalHours === '') return '-';
    const total = Math.round(Number(decimalHours) * 60);
    if (!Number.isFinite(total)) return '-';
    const hrs = Math.floor(total / 60);
    const mins = total % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
  }

  formatEpoch(epoch: number | null | undefined): string {
    if (!epoch) return '-';
    return new Date(epoch).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  maskValue(val: string | null | undefined): string {
    if (!val) return '-';
    const s = String(val).trim();
    if (s.length <= 4) return s;
    return 'X'.repeat(s.length - 4) + s.slice(-4);
  }

  formatSummaryKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  formatCellValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  buildSummaryItems(summary: any): { label: string; value: any }[] {
    if (!summary || typeof summary !== 'object') return [];
    return Object.keys(summary)
      .filter(k => typeof summary[k] !== 'object' && summary[k] !== null)
      .map(k => ({ label: this.formatSummaryKey(k), value: summary[k] }));
  }
}