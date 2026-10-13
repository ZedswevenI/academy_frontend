// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
// import { AlertService } from '../../../../service/alert/alert.service';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

// @Component({
//   selector: 'app-feedbackresults',
//   standalone: false,
//   templateUrl: './feedbackresults.component.html',
//   styleUrl: './feedbackresults.component.scss',
// })
// export class FeedbackresultsComponent implements OnInit {
//   loading = false;
//   tenantId: any;
//   results: any = null;
//   batchResults: any[] = [];
//   activeBatch: string = '';

//   constructor(
//     private route: ActivatedRoute,
//     private router: Router,
//     private commonApi: CommonapiService,
//     private alert: AlertService,
//     private breadcrump: BredcrumpService,
//   ) {
//     this.tenantId = localStorage.getItem('tenantId');
//   }

//   ngOnInit(): void {
//     const formId = this.route.snapshot.paramMap.get('id');
//     if (!formId) {
//       this.router.navigate(['/app/feedback']);
//       return;
//     }
//     this.fetchResults(formId);
//   }

//   fetchResults(formId: string): void {
//     this.loading = true;
//     this.commonApi
//       .fetchData({ tenantId: this.tenantId, formId }, 'feedback', 'results')
//       .subscribe({
//         next: (res: any) => {
//           if (res?.status) {
//             this.results = res.data;
//             this.batchResults = res.data.batchResults || [];
//             this.activeBatch = this.batchResults[0]?.batchCode || '';
//             this.breadcrump.set([
//               { label: 'Feedback', link: '/app/feedback' },
//               { label: this.results.title },
//             ]);
//           }
//           this.loading = false;
//         },
//         error: () => {
//           this.alert.error('Error loading results');
//           this.loading = false;
//         },
//       });
//   }

//   get activeBatchResult(): any {
//     return (
//       this.batchResults.find((b) => b.batchCode === this.activeBatch) || null
//     );
//   }

//   getMaxCount(optionCounts: Record<string, number>): number {
//     const values = Object.values(optionCounts) as number[];
//     return Math.max(...values, 1);
//   }

//   getBarWidth(count: unknown, max: number): string {
//     const n = Number(count);
//     if (!Number.isFinite(n) || max <= 0) return '0%';
//     return `${Math.round((n / max) * 100)}%`;
//   }

//   goBack(): void {
//     this.router.navigate(['/app/feedback']);
//   }

//   asString(val: unknown): string {
//     return String(val ?? '');
//   }

//   getOptionEntries(
//     optionCounts: Record<string, number>,
//   ): { key: string; value: number }[] {
//     if (!optionCounts) return [];
//     return Object.entries(optionCounts).map(([key, value]) => ({ key, value }));
//   }
// }

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-feedbackresults',
  standalone: false,
  templateUrl: './feedbackresults.component.html',
  styleUrl: './feedbackresults.component.scss',
})
export class FeedbackresultsComponent implements OnInit {
  loading = false;
  reportLoading = false;
  tenantId: any;
  results: any = null;
  batchResults: any[] = [];
  activeBatch = '';
  activeStaff = '';
  formId = '';
  activeTab: 'results' | 'report' = 'results';
  reportRows: any[] = [];
  partAHeaders: any[] = [];
  partBHeaders: any[] = [];
  reportSummary: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
    private backNav: BackNavigationService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
  }

  ngOnInit(): void {
    this.formId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.formId) {
      this.router.navigate(['/app/feedback']);
      return;
    }
    this.fetchResults(this.formId);
  }

  loadReportTab(): void {
    if (this.reportRows.length) return;
    this.reportLoading = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, formId: this.formId },
        'feedback',
        'report',
      )
      .subscribe({
        next: (res: any) => {
          this.reportLoading = false;
          if (res?.status) {
            this.reportSummary = res.data;
            this.reportRows = res.data.rows || [];
            this.partAHeaders = res.data.partAHeaders || [];
            this.partBHeaders = res.data.partBHeaders || [];
          }
        },
        error: () => {
          this.reportLoading = false;
        },
      });
  }

  switchTab(tab: 'results' | 'report'): void {
    this.activeTab = tab;
    if (tab === 'report') this.loadReportTab();
  }

  scoreClass(v: number | null): string {
    if (v == null) return 'text-muted';
    if (v >= 9) return 'text-success fw-semibold';
    if (v >= 7) return 'text-primary';
    if (v >= 5) return 'text-warning';
    return 'text-danger';
  }

  pctClass(v: number | null): string {
    if (v == null) return 'text-muted';
    if (v >= 90) return 'text-success fw-bold';
    if (v >= 75) return 'text-primary fw-bold';
    if (v >= 50) return 'text-warning fw-bold';
    return 'text-danger fw-bold';
  }

  fetchResults(formId: string): void {
    this.loading = true;
    this.commonApi
      .fetchData({ tenantId: this.tenantId, formId }, 'feedback', 'results')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.results = res.data;
            this.batchResults = res.data.batchResults || [];
            this.activeBatch = this.batchResults[0]?.batchCode || '';
            if (this.results.category === 'STAFF') {
              this.activeStaff =
                this.batchResults[0]?.staffResults?.[0]?.staffId || '';
            }
            this.breadcrump.set([
              { label: 'Feedback', link: '/app/feedback' },
              { label: this.results.title },
            ]);
          }
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading results');
          this.loading = false;
        },
      });
  }

  get isStaffCategory(): boolean {
    return this.results?.category === 'STAFF';
  }

  get activeBatchResult(): any {
    return (
      this.batchResults.find((b) => b.batchCode === this.activeBatch) || null
    );
  }

  // For STAFF category: staff list within the active batch
  get activeStaffList(): any[] {
    return this.activeBatchResult?.staffResults || [];
  }

  get activeStaffResult(): any {
    return (
      this.activeStaffList.find((s) => s.staffId === this.activeStaff) || null
    );
  }

  // Question summary to display — staff-specific for STAFF category, generic otherwise
  get questionSummary(): any[] {
    if (this.isStaffCategory)
      return this.activeStaffResult?.questionSummary || [];
    return this.activeBatchResult?.questionSummary || [];
  }

  getMaxCount(optionCounts: Record<string, number>): number {
    const values = Object.values(optionCounts) as number[];
    return Math.max(...values, 1);
  }

  getBarWidth(count: unknown, max: number): string {
    const n = Number(count);
    if (!Number.isFinite(n) || max <= 0) return '0%';
    return `${Math.round((n / max) * 100)}%`;
  }

  getOptionEntries(
    optionCounts: Record<string, number>,
  ): { key: string; value: number }[] {
    if (!optionCounts) return [];
    return Object.entries(optionCounts).map(([key, value]) => ({ key, value }));
  }

  asString(val: unknown): string {
    return String(val ?? '');
  }
  goBack(): void {
    if (this.activeTab === 'report') {
      this.switchTab('results');
      return;
    }
    this.backNav.goBack({ route: '/app/feedback' });
  }

  // ── Consolidated PDF Report ───────────────────────────────────────────────
  downloadReport(): void {
    if (!this.formId || this.reportLoading) return;
    this.reportLoading = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, formId: this.formId },
        'feedback',
        'report',
      )
      .subscribe({
        next: (res: any) => {
          this.reportLoading = false;
          if (res?.status) this.generateReportPdf(res.data);
          else this.alert.error(res?.message || 'Failed to generate report');
        },
        error: (err: any) => {
          this.reportLoading = false;
          this.alert.error(err?.error?.message || 'Failed to generate report');
        },
      });
  }

  private generateReportPdf(data: any): void {
    if (!data?.rows?.length) {
      this.alert.error('No data to generate report');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageW = doc.internal.pageSize.getWidth();
    const ml = 10,
      mr = 10;
    const bold = (s: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(s);
    };
    const normal = (s: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(s);
    };

    const startFmt = data.startDate
      ? new Date(data.startDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';
    const endFmt = data.endDate
      ? new Date(data.endDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    // ── Header ────────────────────────────────────────────────────────────
    bold(13);
    doc.text('CONSOLIDATED FEEDBACK REPORT', pageW / 2, 12, {
      align: 'center',
    });
    normal(8);
    doc.text(
      `Staff: All Staff  |  Batch: ${(data.assignedBatches || []).join(', ')}`,
      pageW / 2,
      19,
      { align: 'center' },
    );
    doc.text(`Feedback Period: ${startFmt} to ${endFmt}`, pageW / 2, 24, {
      align: 'center',
    });
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(ml, 27, pageW - mr, 27);

    // ── Build table headers ───────────────────────────────────────────────
    const partAHeaders: any[] = data.partAHeaders || [];
    const partBHeaders: any[] = data.partBHeaders || [];

    const head: any[][] = [
      [
        { content: 'Staff', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Batch', styles: { halign: 'center', fontStyle: 'bold' } },
        {
          content: 'Strength',
          styles: { halign: 'center', fontStyle: 'bold' },
        },
        {
          content: 'Responses',
          styles: { halign: 'center', fontStyle: 'bold' },
        },
        ...partAHeaders.map((h: any) => ({
          content: h.label,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 6,
            fillColor: [219, 234, 254],
            textColor: [30, 64, 175],
          },
        })),
        ...partBHeaders.map((h: any) => ({
          content: h.label,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 6,
            fillColor: [254, 243, 199],
            textColor: [146, 64, 14],
          },
        })),
        {
          content: 'TEA%',
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fillColor: [220, 252, 231],
            textColor: [22, 101, 52],
          },
        },
        {
          content: 'REA%',
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fillColor: [254, 243, 199],
            textColor: [146, 64, 14],
          },
        },
      ],
    ];

    // ── Build rows ────────────────────────────────────────────────────────
    const rows: any[] = data.rows.map((r: any) => {
      const aScores = (r.partAScores || []).map((v: any) =>
        v != null ? v.toFixed(2) : '—',
      );
      const bScores = (r.partBScores || []).map((v: any) =>
        v != null ? v.toFixed(2) : '—',
      );
      const teaColor =
        r.teaPct != null
          ? r.teaPct >= 75
            ? [22, 101, 52]
            : r.teaPct >= 50
              ? [133, 77, 14]
              : [153, 27, 27]
          : [100, 100, 100];
      const reaColor =
        r.reaPct != null
          ? r.reaPct >= 75
            ? [22, 101, 52]
            : r.reaPct >= 50
              ? [133, 77, 14]
              : [153, 27, 27]
          : [100, 100, 100];

      return [
        {
          content: r.staffCode || '—',
          styles: { halign: 'center', fontStyle: 'bold' },
        },
        { content: r.batchCode, styles: { halign: 'center' } },
        { content: r.strength, styles: { halign: 'center' } },
        { content: r.responseCount, styles: { halign: 'center' } },
        ...aScores.map((v: string) => ({
          content: v,
          styles: {
            halign: 'center',
            fontSize: 6.5,
            fillColor: [239, 246, 255],
          },
        })),
        ...bScores.map((v: string) => ({
          content: v,
          styles: {
            halign: 'center',
            fontSize: 6.5,
            fillColor: [255, 251, 235],
          },
        })),
        {
          content: r.teaPct != null ? r.teaPct.toFixed(1) + '%' : '—',
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            textColor: teaColor,
            fillColor: [240, 253, 244],
          },
        },
        {
          content: r.reaPct != null ? r.reaPct.toFixed(1) + '%' : '—',
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            textColor: reaColor,
            fillColor: [255, 251, 235],
          },
        },
      ];
    });

    // ── Summary row ───────────────────────────────────────────────────────
    const validRows = data.rows.filter((r: any) => r.teaPct != null);
    const avgTea = validRows.length
      ? (
          validRows.reduce((s: number, r: any) => s + r.teaPct, 0) /
          validRows.length
        ).toFixed(1)
      : '—';
    const validRowsB = data.rows.filter((r: any) => r.reaPct != null);
    const avgRea = validRowsB.length
      ? (
          validRowsB.reduce((s: number, r: any) => s + r.reaPct, 0) /
          validRowsB.length
        ).toFixed(1)
      : '—';

    const summaryRow: any[] = [
      {
        content: 'OVERALL AVERAGE',
        colSpan: 4,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [241, 245, 249],
        },
      },
      ...partAHeaders.map(() => ({
        content: '',
        styles: { fillColor: [241, 245, 249] },
      })),
      ...partBHeaders.map(() => ({
        content: '',
        styles: { fillColor: [241, 245, 249] },
      })),
      {
        content: `${avgTea}%`,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fillColor: [220, 252, 231],
          textColor: [22, 101, 52],
        },
      },
      {
        content: `${avgRea}%`,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fillColor: [254, 243, 199],
          textColor: [146, 64, 14],
        },
      },
    ];
    rows.push(summaryRow);

    // ── Render ────────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: 30,
      head,
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        cellPadding: 2,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: ml, right: mr },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 22 },
        2: { cellWidth: 14 },
        3: { cellWidth: 16 },
      },
    });

    // ── Footer ────────────────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    normal(7);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Overall teaching effectiveness: ${avgTea}% | Research effectiveness: ${avgRea}%`,
      pageW / 2,
      finalY + 8,
      { align: 'center' },
    );
    doc.text(
      'TEA% = Teaching Effectiveness Average (Part A)   |   REA% = Research Effectiveness Average (Part B)',
      pageW / 2,
      finalY + 14,
      { align: 'center' },
    );

    const title = (data.title || 'Feedback').replace(/[^a-z0-9]/gi, '_');
    doc.save(`Feedback_Report_${title}.pdf`);
  }

  // Compute TEA% from Part A questions in activeStaffResult
  getTeaPct(): number | null {
    const qs = this.activeStaffResult?.questionSummary || [];
    const partA = qs.filter(
      (q: any) =>
        q.part === 'A' && q.fieldType === 'score' && q.avgScore != null,
    );
    if (!partA.length) return null;
    const maxScore = partA[0]?.maxScore || 10;
    const avg =
      partA.reduce((s: number, q: any) => s + q.avgScore, 0) / partA.length;
    return Math.round((avg / maxScore) * 1000) / 10;
  }

  getReaPct(): number | null {
    const qs = this.activeStaffResult?.questionSummary || [];
    const partB = qs.filter(
      (q: any) =>
        q.part === 'B' && q.fieldType === 'score' && q.avgScore != null,
    );
    if (!partB.length) return null;
    const maxScore = partB[0]?.maxScore || 10;
    const avg =
      partB.reduce((s: number, q: any) => s + q.avgScore, 0) / partB.length;
    return Math.round((avg / maxScore) * 1000) / 10;
  }

  getAvgTea(): string {
    const v = this.reportRows.filter((r) => r.teaPct != null);
    return v.length
      ? (v.reduce((s, r) => s + r.teaPct, 0) / v.length).toFixed(1) + '%'
      : '—';
  }

  getAvgRea(): string {
    const v = this.reportRows.filter((r) => r.reaPct != null);
    return v.length
      ? (v.reduce((s, r) => s + r.reaPct, 0) / v.length).toFixed(1) + '%'
      : '—';
  }
}
