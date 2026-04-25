import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-batchperformance',
  standalone: false,
  templateUrl: './batchperformance.component.html',
  styleUrl: './batchperformance.component.scss',
})
export class BatchperformanceComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId') || '';

  // Resolved from router state or select
  batchId = '';
  batchCode = '';
  academicYear = '';

  // Filter dropdowns (if navigated directly without state)
  batch_options: any[] = [];
  year_options: any[] = [];
  selectedBatchId = '';
  selectedYear = '';

  loading = false;

  // Report data
  overview: any = null;
  subjectWise: any[] = [];
  mockExamWise: any[] = [];
  schoolExamWise: any[] = [];

  // Active section toggle
  activeSection = 'subject'; // subject | mock | school

  constructor(
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
  ) {}

  ngOnInit(): void {
    this.breadcrump.set([
      { label: 'Performance', link: '/app/performance' },
      { label: 'Batch Report' },
    ]);

    // Try to get from router state first
    const state = history.state;
    if (state?.batchId && state?.academicYear) {
      this.batchId = state.batchId;
      this.batchCode = state.batchCode || '';
      this.academicYear = state.academicYear;
      this.selectedBatchId = state.batchId;
      this.selectedYear = state.academicYear;
      this.loadReport();
    } else {
      this.loadBatches();
    }
  }

  loadBatches(): void {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          const batches = res?.data || [];
          this.batch_options = batches.map((b: any) => ({
            label: `${b.batchName} (${b.batchCode})`,
            value: b.batchId,
            batchCode: b.batchCode,
            academicYear: b.academicYear,
          }));
          const years = [
            ...new Set(batches.map((b: any) => b.academicYear)),
          ].filter(Boolean) as string[];
          this.year_options = years
            .sort()
            .reverse()
            .map((y: string) => ({ label: y, value: y }));
        },
        error: () => {},
      });
  }

  onBatchChange(batchId: string): void {
    this.selectedBatchId = batchId;
    const batch = this.batch_options.find((b) => b.value === batchId);
    this.batchCode = batch?.batchCode || '';
    if (batch?.academicYear && !this.selectedYear)
      this.selectedYear = batch.academicYear;
  }

  onApply(): void {
    if (!this.selectedBatchId || !this.selectedYear) {
      this.alert.error('Please select Batch and Academic Year');
      return;
    }
    this.batchId = this.selectedBatchId;
    this.academicYear = this.selectedYear;
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          batchId: this.batchId,
          academicYear: this.academicYear,
        },
        'performance',
        'batch/report',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            const d = res.data;
            this.overview = d.overview || null;
            this.subjectWise = d.subjectWise || [];
            this.mockExamWise = d.mockExamWise || [];
            this.schoolExamWise = d.schoolExamWise || [];
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/app/performance']);
  }

  pct(val: any): string {
    return val != null ? Number(val).toFixed(1) + '%' : '—';
  }
  num(val: any, dec = 2): string {
    return val != null ? Number(val).toFixed(dec) : '—';
  }

  formatDate(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Colour band for percentage
  pctColor(val: any): string {
    const n = Number(val);
    if (n >= 75) return '#16a34a';
    if (n >= 50) return '#f59e0b';
    return '#ef4444';
  }

  pctBg(val: any): string {
    const n = Number(val);
    if (n >= 75) return '#dcfce7';
    if (n >= 50) return '#fef9c3';
    return '#fee2e2';
  }

  pctTextColor(val: any): string {
    const n = Number(val);
    if (n >= 75) return '#166534';
    if (n >= 50) return '#92400e';
    return '#991b1b';
  }
}
