import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-consolidated-report',
  standalone: false,
  templateUrl: './consolidated-report.component.html',
  styleUrl: './consolidated-report.component.scss',
})
export class ConsolidatedReportComponent implements OnInit {
  tenantId: any;
  staffList: any[] = [];
  selectedStaff: string[] = [];
  staffSearch = '';
  staffLoading = false;
  fromDate = '';
  toDate = '';
  loading = false;
  exporting = false;
  reportData: any = null;
  rows: any[] = [];
  partHeaders: any = {};
  partKeys: string[] = [];
  activeTab: 'scores' | 'remarks' = 'scores';
  remarksLoading = false;
  remarksExporting = false;
  remarksData: any[] = [];

  constructor(
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
    private backNav: BackNavigationService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([
      { label: 'Feedback', link: '/app/feedback' },
      { label: 'Consolidated Report' },
    ]);
  }

  ngOnInit(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    this.fromDate = start.toISOString().split('T')[0];
    this.toDate = now.toISOString().split('T')[0];
    this.loadStaffList();
  }

  loadStaffList(): void {
    this.staffLoading = true;
    this.commonApi
      .fetchData({ tenantId: this.tenantId }, 'feedback', 'report-staff-list')
      .subscribe({
        next: (res: any) => {
          this.staffLoading = false;
          this.staffList = res?.data || [];
        },
        error: () => {
          this.staffLoading = false;
        },
      });
  }

  get filteredStaffList(): any[] {
    if (!this.staffSearch.trim()) return this.staffList;
    const q = this.staffSearch.toLowerCase();
    return this.staffList.filter(
      (s) =>
        (s.staffName || '').toLowerCase().includes(q) ||
        (s.staffCode || '').toLowerCase().includes(q) ||
        (s.subjectName || '').toLowerCase().includes(q),
    );
  }

  toggleStaff(staffId: string): void {
    if (this.selectedStaff.includes(staffId)) {
      this.selectedStaff = this.selectedStaff.filter((id) => id !== staffId);
    } else {
      this.selectedStaff = [...this.selectedStaff, staffId];
    }
  }

  isSelected(staffId: string): boolean {
    return this.selectedStaff.includes(staffId);
  }
  selectAll(): void {
    this.selectedStaff = [];
  }
  clearAll(): void {
    this.selectedStaff = [];
  }

  get staffLabel(): string {
    if (!this.selectedStaff.length)
      return 'All Staff (' + this.staffList.length + ')';
    return (
      this.selectedStaff.length + ' of ' + this.staffList.length + ' selected'
    );
  }

  fetchReport(): void {
    if (!this.fromDate || !this.toDate) {
      this.alert.error('Please select a date range');
      return;
    }
    this.loading = true;
    this.reportData = null;
    this.rows = [];
    const payload: any = {
      tenantId: this.tenantId,
      fromDate: new Date(this.fromDate).getTime(),
      toDate: new Date(this.toDate).getTime(),
    };
    if (this.selectedStaff.length) payload.staffIds = this.selectedStaff;
    this.commonApi
      .fetchData(payload, 'feedback', 'consolidated-report')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.reportData = res.data;
            this.rows = res.data.rows || [];
            this.partHeaders = res.data.partHeaders || {};
            this.partKeys = res.data.partKeys || [];
          } else {
            this.alert.error(res?.message || 'No data found');
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Failed to generate report');
        },
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getPartScores(row: any, part: string): any[] {
    return row.partScores?.[part] || [];
  }

  getPartPct(row: any, part: string): number | null {
    return row.partPct?.[part] ?? null;
  }

  partPctLabel(part: string): string {
    const labels: Record<string, string> = { A: 'TEA%', B: 'REA%', C: 'CEA%' };
    return labels[part] || part + '%';
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

  partHeaderBg(part: string): string {
    const map: Record<string, string> = {
      A: '#dbeafe',
      B: '#fef9c3',
      C: '#dcfce7',
    };
    return map[part] || '#f1f5f9';
  }

  partHeaderColor(part: string): string {
    const map: Record<string, string> = {
      A: '#1e40af',
      B: '#92400e',
      C: '#166534',
    };
    return map[part] || '#374151';
  }

  partCellBg(part: string): string {
    const map: Record<string, string> = {
      A: '#eff6ff',
      B: '#fffbeb',
      C: '#f0fdf4',
    };
    return map[part] || '#f8fafc';
  }

  partPctBg(part: string): string {
    const map: Record<string, string> = {
      A: '#f0fdf4',
      B: '#fffbeb',
      C: '#ecfdf5',
    };
    return map[part] || '#f8fafc';
  }

  get avgPcts(): Record<string, string> {
    const result: Record<string, string> = {};
    this.partKeys.forEach((part) => {
      const valid = this.rows.filter((r) => r.partPct?.[part] != null);
      result[part] = valid.length
        ? (
          valid.reduce((s, r) => s + r.partPct[part], 0) / valid.length
        ).toFixed(1) + '%'
        : '—';
    });
    return result;
  }

  get totalResponses(): number {
    return this.rows.reduce((s, r) => s + (r.responseCount || 0), 0);
  }

  formatDate(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/feedback' });
  }

  get groupedByStaff(): any[] {
    const map = new Map<string, any>();
    this.rows.forEach((r) => {
      const key = r.staffId + '::' + (r.subjectName || '');
      if (!map.has(key)) {
        map.set(key, {
          staffId: r.staffId,
          staffCode: r.staffCode || '—',
          staffName: r.staffName || '',
          subjectName: r.subjectName || null,
          subjectCode: r.subjectCode || null,
          rows: [],
        });
      }
      map.get(key).rows.push(r);
    });
    return Array.from(map.values()).map((g) => ({
      ...g,
      avgPcts: this.calcStaffAvgPcts(g.rows),
    }));
  }

  private calcStaffAvgPcts(rows: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    this.partKeys.forEach((part) => {
      const valid = rows.filter((r) => r.partPct?.[part] != null);
      result[part] = valid.length
        ? (
          valid.reduce((s: number, r: any) => s + r.partPct[part], 0) /
          valid.length
        ).toFixed(1) + '%'
        : '—';
    });
    return result;
  }

  exportPdf(): void {
    if (!this.rows.length) {
      this.alert.error('No data to export');
      return;
    }
    this.exporting = true;
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ml = 2,
        mr = 2;
      const usableW = pageW - ml - mr;
      const bold = (s: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(s);
      };
      const normal = (s: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(s);
      };
      const startFmt = this.fromDate
        ? new Date(this.fromDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        : '—';
      const endFmt = this.toDate
        ? new Date(this.toDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        : '—';
      const partColors: Record<string, { fill: number[]; text: number[] }> = {
        A: { fill: [219, 234, 254], text: [30, 64, 175] },
        B: { fill: [254, 249, 195], text: [146, 64, 14] },
        C: { fill: [220, 252, 231], text: [22, 101, 52] },
      };
      const pctColors: Record<string, { fill: number[]; text: number[] }> = {
        A: { fill: [240, 253, 244], text: [22, 101, 52] },
        B: { fill: [255, 251, 235], text: [146, 64, 14] },
        C: { fill: [236, 253, 245], text: [6, 95, 70] },
      };
      const fixedW = 40;
      const pctW = 14; // fixed width for each % column
      const scoreColCount = this.partKeys.reduce(
        (s, p) => s + (this.partHeaders[p]?.length || 0),
        0,
      );
      const pctColCount = this.partKeys.length;
      // dynW fills only the space left after fixed cols and pct cols
      const dynW = Math.max(
        5,
        Math.floor((usableW - fixedW - pctColCount * pctW) / Math.max(scoreColCount, 1)),
      );
      const columnStyles: Record<number, any> = {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
      };
      let colIdx = 2;
      // Pct columns — fixed reserved width (placed right after STR / RES)
      this.partKeys.forEach(() => {
        columnStyles[colIdx++] = { cellWidth: pctW };
      });
      // Score columns — dynamic width
      this.partKeys.forEach((part) => {
        (this.partHeaders[part] || []).forEach(() => {
          columnStyles[colIdx++] = { cellWidth: dynW };
        });
      });
      const totalCols = 2 + scoreColCount + pctColCount;
      const colHeaderRow: any[] = [
        // {
        //   content: 'BATCH',
        //   styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
        // },
        // {
        //   content: 'PHASE',
        //   styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
        // },
        // {
        //   content: 'STRENGTH',
        //   styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
        // },
        // {
        //   content: 'RESPONSES',
        //   styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
        // },
        {
          content: 'BATCH / PHASE',
          styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
        },
        {
          content: 'STR / RES',
          styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
        },
      ];
      this.partKeys.forEach((part) => {
        const col = pctColors[part] || {
          fill: [241, 245, 249],
          text: [55, 65, 81],
        };
        colHeaderRow.push({
          content: this.partPctLabel(part),
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 6.5,
            fillColor: col.fill,
            textColor: col.text,
          },
        });
      });
      this.partKeys.forEach((part) => {
        const col = partColors[part] || {
          fill: [241, 245, 249],
          text: [55, 65, 81],
        };
        (this.partHeaders[part] || []).forEach((_h: any, qIdx: number) => {
          colHeaderRow.push({
            content: part + (qIdx + 1),   // A1, A2 … B1, B2 …
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 6,
              fillColor: col.fill,
              textColor: col.text,
              overflow: 'linebreak',
            },
          });
        });
      });

      const drawPageHeader = (g: any) => {
        bold(13);
        doc.text(this.reportTitle.toUpperCase(), pageW / 2, 10, {
          align: 'center',
        });
        normal(7.5);
        const staffLine = [
          g.staffCode && g.staffCode.length < 20 ? g.staffCode : '',
          g.staffName,
          g.subjectName ? '(' + g.subjectName + ')' : '',
        ]
          .filter(Boolean)
          .join('  ');
        doc.text('Staff: ' + staffLine, pageW / 2, 16, { align: 'center' });
        doc.text(
          'Feedback Period: ' + startFmt + ' to ' + endFmt,
          pageW / 2,
          21,
          { align: 'center' },
        );
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(ml, 24, pageW - mr, 24);
      };

      const groups = this.groupedByStaff;
      groups.forEach((g, gIndex) => {
        if (gIndex > 0) doc.addPage();
        drawPageHeader(g);
        // const bannerContent = [
        //   g.staffCode !== '—' ? g.staffCode : '',
        //   g.staffName,
        //   g.subjectName ? '·  ' + g.subjectName : '',
        // ]
        //   .filter(Boolean)
        //   .join('   ');
        const bannerContent = [
          g.staffCode && g.staffCode.length < 20 ? g.staffCode : '',
          g.staffName,
          g.subjectName ? '·  ' + g.subjectName : '',
        ]
          .filter(Boolean)
          .join('   ');
        const staffHead: any[][] = [
          [
            {
              content: bannerContent,
              colSpan: totalCols,
              styles: {
                fontStyle: 'bold',
                fontSize: 9,
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                halign: 'left',
                cellPadding: 3,
              },
            },
          ],
          colHeaderRow,
        ];
        const body: any[][] = [];
        g.rows.forEach((r: any) => {
          const row: any[] = [
            // {
            //   content: r.batchCode,
            //   styles: { halign: 'center', fontSize: 6.5 },
            // },
            // {
            //   content: r.phase || '—',
            //   styles: { halign: 'center', fontSize: 6.5 },
            // },
            // {
            //   content: r.strength,
            //   styles: { halign: 'center', fontSize: 6.5 },
            // },
            // {
            //   content: r.responseCount,
            //   styles: { halign: 'center', fontSize: 6.5 },
            // },
            {
              content: r.batchCode + '\n' + (r.phase || '—'),
              styles: { halign: 'center', fontSize: 6.5 },
            },
            {
              content: r.strength + ' / ' + r.responseCount,
              styles: { halign: 'center', fontSize: 6.5 },
            },
          ];

          this.partKeys.forEach((part) => {
            const pct = r.partPct?.[part];
            const col = pctColors[part] || {
              fill: [241, 245, 249],
              text: [55, 65, 81],
            };
            const tColor =
              pct == null
                ? [150, 150, 150]
                : pct >= 90
                  ? [22, 101, 52]
                  : pct >= 75
                    ? [37, 99, 235]
                    : pct >= 50
                      ? [161, 98, 7]
                      : [153, 27, 27];
            row.push({
              content: pct != null ? pct.toFixed(1) + '%' : '—',
              styles: {
                halign: 'center',
                fontStyle: 'bold',
                fontSize: 7,
                textColor: tColor,
                fillColor: col.fill,
              },
            });
          });
          this.partKeys.forEach((part) => {
            const bg =
              part === 'A'
                ? [239, 246, 255]
                : part === 'B'
                  ? [255, 251, 235]
                  : [240, 253, 244];
            const headerLen = (this.partHeaders[part] || []).length;
            const scores = r.partScores?.[part] || [];
            for (let qi = 0; qi < headerLen; qi++) {
              const v = scores[qi] != null ? scores[qi] : null;
              row.push({
                content: v != null ? v.toFixed(2) : '—',
                styles: { halign: 'center', fontSize: 6, fillColor: bg },
              });
            }
          });

          body.push(row);
        });
        const staffAvgRow: any[] = [
          {
            content: 'Staff Average',
            colSpan: 2,
            styles: {
              halign: 'right',
              fontStyle: 'bold',
              fontSize: 7,
              fillColor: [241, 245, 249],
            },
          },
        ];
        this.partKeys.forEach((part) => {
          const col = pctColors[part] || {
            fill: [241, 245, 249],
            text: [55, 65, 81],
          };
          staffAvgRow.push({
            content: g.avgPcts[part] || '—',
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 7,
              fillColor: col.fill,
              textColor: col.text,
            },
          });
        });
        this.partKeys.forEach((part) => {
          (this.partHeaders[part] || []).forEach(() =>
            staffAvgRow.push({
              content: '',
              styles: { fillColor: [241, 245, 249] },
            }),
          );
        });
        body.push(staffAvgRow);
        autoTable(doc, {
          startY: 26,
          head: staffHead,
          body,
          theme: 'grid',
          styles: {
            fontSize: 6.5,
            cellPadding: 1.5,
            lineColor: [210, 210, 210],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: 255,
            fontSize: 7,
            cellPadding: 2,
            halign: 'center',
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: ml, right: mr },
          columnStyles,
        });
        const staffFinalY = (doc as any).lastAutoTable?.finalY || 180;
        normal(7);
        doc.setTextColor(100, 100, 100);
        const staffSummary = this.partKeys
          .map((p) => this.partPctLabel(p) + ': ' + (g.avgPcts[p] || '—'))
          .join('  |  ');
        doc.text(
          g.staffName +
          (g.subjectName ? ' (' + g.subjectName + ')' : '') +
          '  —  ' +
          staffSummary,
          pageW / 2,
          staffFinalY + 6,
          { align: 'center' },
        );
      });
      const lastFinalY = (doc as any).lastAutoTable?.finalY || 180;
      const summaryRow: any[] = [
        {
          content: 'OVERALL AVERAGE',
          colSpan: 2,
          styles: {
            halign: 'left',
            fontStyle: 'bold',
            fontSize: 7,
            fillColor: [241, 245, 249],
          },
        },
      ];
      this.partKeys.forEach((part) => {
        const col = pctColors[part] || {
          fill: [241, 245, 249],
          text: [55, 65, 81],
        };
        summaryRow.push({
          content: this.avgPcts[part] || '—',
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 7,
            fillColor: col.fill,
            textColor: col.text,
          },
        });
      });
      this.partKeys.forEach((part) => {
        (this.partHeaders[part] || []).forEach(() =>
          summaryRow.push({
            content: '',
            styles: { fillColor: [241, 245, 249] },
          }),
        );
      });

      autoTable(doc, {
        startY: lastFinalY + 10,
        head: [],
        body: [summaryRow],
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          lineColor: [210, 210, 210],
          lineWidth: 0.2,
        },
        margin: { left: ml, right: mr },
        columnStyles,
      });

      const overallFinalY =
        (doc as any).lastAutoTable?.finalY || lastFinalY + 20;
      normal(7);
      doc.setTextColor(100, 100, 100);
      const overallSummary = this.partKeys
        .map((p) => this.partPctLabel(p) + ': ' + (this.avgPcts[p] || '—'))
        .join('  |  ');
      doc.text('Overall  ' + overallSummary, pageW / 2, overallFinalY + 7, {
        align: 'center',
      });

      // ── Save ──────────────────────────────────────────────────────────────────
      doc.save(
        'Feedback_Report_' +
        startFmt.replace(/ /g, '_') +
        '_to_' +
        endFmt.replace(/ /g, '_') +
        '.pdf',
      );
    } finally {
      this.exporting = false;
    }
  }

  get reportTitle(): string {
    if (this.selectedStaff.length === 1) {
      const s = this.staffList.find(
        (x: any) => x.staffId === this.selectedStaff[0],
      );
      return (s?.staffName || 'Faculty') + ' — Feedback Report';
    }
    return 'Consolidated Feedback Report';
  }

  switchToRemarks(): void {
    this.activeTab = 'remarks';
    if (!this.remarksData.length && !this.remarksLoading) {
      this.fetchRemarks();
    }
  }

  fetchRemarks(): void {
    if (!this.fromDate || !this.toDate) {
      this.alert.error('Please select a date range');
      return;
    }
    this.remarksLoading = true;
    this.remarksData = [];

    const payload: any = {
      tenantId: this.tenantId,
      fromDate: new Date(this.fromDate).getTime(),
      toDate: new Date(this.toDate).getTime(),
    };
    if (this.selectedStaff.length) payload.staffIds = this.selectedStaff;

    this.commonApi.fetchData(payload, 'feedback', 'remarks-report').subscribe({
      next: (res: any) => {
        this.remarksLoading = false;
        this.remarksData = res?.data || [];
        if (!this.remarksData.length)
          this.alert.error('No remarks found for the selected filters');
      },
      error: (err: any) => {
        this.remarksLoading = false;
        this.alert.error(err?.error?.message || 'Failed to load remarks');
      },
    });
  }

  getTotalRemarks(staff: any): number {
    return (staff.batches || []).reduce(
      (s: number, b: any) =>
        s +
        (b.phases || []).reduce(
          (ps: number, p: any) => ps + (p.remarks?.length || 0),
          0,
        ),
      0,
    );
  }

  exportRemarksPdf(): void {
    if (!this.remarksData.length) {
      this.alert.error('No remarks to export');
      return;
    }
    this.remarksExporting = true;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageW = doc.internal.pageSize.getWidth();
      const ml = 12,
        mr = 12,
        maxW = pageW - ml - mr;
      const bold = (s: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(s);
      };
      const normal = (s: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(s);
      };
      const indent = 4;

      const startFmt = this.fromDate
        ? new Date(this.fromDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        : '—';
      const endFmt = this.toDate
        ? new Date(this.toDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        : '—';

      bold(13);
      doc.text('STAFF REMARKS REPORT', pageW / 2, 14, { align: 'center' });
      normal(8);
      doc.text('Period: ' + startFmt + ' to ' + endFmt, pageW / 2, 20, {
        align: 'center',
      });
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(ml, 23, pageW - mr, 23);

      let curY = 27;
      const checkPage = (needed = 10) => {
        if (curY + needed > 282) {
          doc.addPage();
          curY = 15;
        }
      };

      this.remarksData.forEach((staff: any, staffIdx: number) => {
        if (staffIdx > 0) {
          doc.addPage();
          curY = 15;
        } else {
          checkPage(14);
        }
        doc.setFillColor(30, 41, 59);
        doc.rect(ml, curY - 4, maxW, 8, 'F');
        bold(9);
        doc.setTextColor(255, 255, 255);
        doc.text(
          (staff.staffCode ? staff.staffCode + '  ' : '') + staff.staffName,
          ml + 2,
          curY + 0.5,
        );
        curY += 8;

        (staff.batches || []).forEach((batch: any) => {
          checkPage(10);
          doc.setFillColor(219, 234, 254);
          doc.rect(ml + indent, curY - 4, maxW - indent, 7, 'F');
          bold(8);
          doc.setTextColor(30, 64, 175);
          doc.text('Batch: ' + batch.batchCode, ml + indent + 2, curY);
          curY += 7;

          (batch.phases || []).forEach((phase: any) => {
            checkPage(8);
            normal(7.5);
            doc.setTextColor(100, 100, 100);
            doc.text(
              phase.phaseLabel +
              '  (' +
              phase.remarks.length +
              ' remark' +
              (phase.remarks.length !== 1 ? 's' : '') +
              ')',
              ml + indent * 2,
              curY,
            );
            curY += 6;

            phase.remarks.forEach((r: any, idx: number) => {
              checkPage(8);
              normal(7);
              doc.setTextColor(50, 50, 50);
              const lines = doc.splitTextToSize(
                idx + 1 + '. ' + (r.remark || ''),
                maxW - indent * 3 - 2,
              );
              lines.forEach((line: string) => {
                checkPage(6);
                doc.text(line, ml + indent * 3, curY);
                curY += 5;
              });
            });
            curY += 3;
          });
          curY += 4;
        });
        curY += 5;
      });

      doc.save(
        'Staff_Remarks_Report_' +
        startFmt.replace(/ /g, '_') +
        '_to_' +
        endFmt.replace(/ /g, '_') +
        '.pdf',
      );
    } finally {
      this.remarksExporting = false;
    }
  }
}
