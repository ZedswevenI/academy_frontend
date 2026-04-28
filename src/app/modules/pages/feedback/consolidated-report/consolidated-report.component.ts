import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
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

  // Staff selector
  staffList: any[] = [];
  selectedStaff: string[] = []; // empty = all
  staffSearch = '';
  staffLoading = false;

  // Date range
  fromDate = '';
  toDate = '';

  // Report state
  loading = false;
  exporting = false;
  reportData: any = null;
  rows: any[] = [];
  partHeaders: any = {}; // { A: [{label,fieldId,fieldText,maxScore}], B: [...] }
  partKeys: string[] = []; // ['A','B'] or ['A','B','C']

  constructor(
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([
      { label: 'Feedback', link: '/app/feedback' },
      { label: 'Consolidated Report' },
    ]);
  }

  ngOnInit(): void {
    // Default date range — last 3 months
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    this.fromDate = start.toISOString().split('T')[0];
    this.toDate = now.toISOString().split('T')[0];
    this.loadStaffList();
  }

  // ── Staff list ────────────────────────────────────────────────────────────
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

  // ── Fetch report ──────────────────────────────────────────────────────────
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
    this.router.navigate(['/app/feedback']);
  }

  // ── PDF Export ────────────────────────────────────────────────────────────
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
      const ml = 8,
        mr = 8;
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
      const staffStr = this.selectedStaff.length
        ? this.staffList
            .filter((s) => this.selectedStaff.includes(s.staffId))
            .map((s) => s.staffCode || s.staffName)
            .join(', ')
        : 'All Staff';
      const batches = [...new Set(this.rows.map((r) => r.batchCode))].join(
        ', ',
      )
      bold(13);
      doc.text('CONSOLIDATED FEEDBACK REPORT', pageW / 2, 12, {
        align: 'center',
      });
      normal(7.5);
      doc.text('Staff: ' + staffStr + '  |  Batch: ' + batches, pageW / 2, 18, {
        align: 'center',
      });
      doc.text(
        'Feedback Period: ' + startFmt + ' to ' + endFmt,
        pageW / 2,
        23,
        { align: 'center' },
      );
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(ml, 26, pageW - mr, 26);
      const head: any[][] = [
        [
          {
            content: 'STAFF',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
          },
          {
            content: 'BATCH',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
          },
          { content: 'PHASE', styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 } },
          {
            content: 'STRENGTH',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
          },
          {
            content: 'RESPONSES',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
          },
        ],
      ];
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
      this.partKeys.forEach((part) => {
        const col = partColors[part] || {
          fill: [241, 245, 249],
          text: [55, 65, 81],
        };
        (this.partHeaders[part] || []).forEach((h: any) => {
          head[0].push({
            content: h.label,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 6,
              fillColor: col.fill,
              textColor: col.text,
            },
          });
        });
      });
      this.partKeys.forEach((part) => {
        const col = pctColors[part] || {
          fill: [241, 245, 249],
          text: [55, 65, 81],
        };
        head[0].push({
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
      const body: any[][] = this.rows.map((r: any) => {
        const row: any[] = [
          {
            content: r.staffCode || '—',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 },
          },
          { content: r.batchCode, styles: { halign: 'center', fontSize: 6.5 } },
          { content: r.phase || '—', styles: { halign: 'center', fontSize: 6.5 } },
          { content: r.strength, styles: { halign: 'center', fontSize: 6.5 } },
          {
            content: r.responseCount,
            styles: { halign: 'center', fontSize: 6.5 },
          },
        ];
        this.partKeys.forEach((part) => {
          const bg =
            part === 'A'
              ? [239, 246, 255]
              : part === 'B'
                ? [255, 251, 235]
                : [240, 253, 244];
          (r.partScores?.[part] || []).forEach((v: any) => {
            row.push({
              content: v != null ? v.toFixed(2) : '—',
              styles: { halign: 'center', fontSize: 6, fillColor: bg },
            });
          });
        });
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
        return row;
      });
      const summaryRow: any[] = [
        {
          content: 'OVERALL AVERAGE',
          colSpan: 4,
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fontSize: 7,
            fillColor: [241, 245, 249],
          },
        },
      ];
      this.partKeys.forEach((part) => {
        (this.partHeaders[part] || []).forEach(() =>
          summaryRow.push({
            content: '',
            styles: { fillColor: [241, 245, 249] },
          }),
        );
      });
      this.partKeys.forEach((part) => {
        const col = pctColors[part] || {
          fill: [241, 245, 249],
          text: [55, 65, 81],
        };
        const avg = this.avgPcts[part] || '—';
        summaryRow.push({
          content: avg,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 7,
            fillColor: col.fill,
            textColor: col.text,
          },
        });
      });
      body.push(summaryRow);
      autoTable(doc, {
        startY: 28,
        head,
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
        columnStyles: {
          0: { cellWidth: 14 },
          1: { cellWidth: 22 },
          2: { cellWidth: 13 },
          3: { cellWidth: 16 },
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      normal(7);
      doc.setTextColor(100, 100, 100);
      const summaryLine = this.partKeys
        .map((p) => this.partPctLabel(p) + ': ' + (this.avgPcts[p] || '—'))
        .join('  |  ');
      doc.text('Overall  ' + summaryLine, pageW / 2, finalY + 7, {
        align: 'center',
      });
      doc.save(
        'Feedback_Consolidated_Report_' +
          startFmt.replace(/ /g, '_') +
          '_to_' +
          endFmt.replace(/ /g, '_') +
          '.pdf',
      );
    } finally {
      this.exporting = false;
    }
  }
}
