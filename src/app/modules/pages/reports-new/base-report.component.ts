import { OnInit, OnDestroy, Directive } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReportService } from './report.service';
import { ReportExportService } from './report-export.service';
import { AlertService } from '../../../service/alert/alert.service';
import { BatchOption, StaffOption } from './report.service';

@Directive()
export abstract class BaseReportComponent implements OnInit, OnDestroy {
  // ── Common state ───────────────────────────────────────────────────────────
  loading = false;
  dataLoaded = false;
  touched = false;    // for validation on generate click
  reportData: any = null;

  // ── Shared options (from service) ──────────────────────────────────────────
  batchOptions: BatchOption[] = [];
  staffOptions: StaffOption[] = [];

  // ── Destroy subject for cleanup ────────────────────────────────────────────
  protected readonly destroy$ = new Subject<void>();

  constructor(
    protected reportService: ReportService,
    protected exportService: ReportExportService,
    protected alert: AlertService
  ) {}

  ngOnInit(): void {
    // Subscribe to shared data
    this.reportService.batchOptions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(opts => this.batchOptions = opts);

    this.reportService.staffOptions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(opts => this.staffOptions = opts);

    this.onInit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Override in child for additional init logic
  protected onInit(): void {}

  // ── Implement in each child ────────────────────────────────────────────────
  abstract canGenerate(): boolean;
  abstract generate(): void;
  abstract reset(): void;
  abstract exportExcel(): void;
  abstract exportPdf(): void;

  // ── Common generate flow ───────────────────────────────────────────────────
  protected onGenerateClick(): void {
    this.touched = true;
    if (!this.canGenerate()) return;
    this.loading = true;
    this.dataLoaded = false;
    this.reportData = null;
    this.generate();
  }

  // ── Common success/error handlers ──────────────────────────────────────────
  protected onSuccess(res: any): void {
    this.loading = false;
    this.dataLoaded = true;
    this.reportData = res;
  }

  protected onError(err: any): void {
    this.loading = false;
    this.dataLoaded = true;
    this.alert.error(err?.error?.message || 'Error generating report');
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  get hasData(): boolean { return this.dataLoaded && !!this.reportData; }

  toEpoch(dateStr: string): number | null {
    if (!dateStr) return null;
    return new Date(dateStr).getTime();
  }
}