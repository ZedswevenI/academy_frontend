import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-feedbackreport',
  standalone: false,
  templateUrl: './feedbackreport.component.html',
  styleUrl: './feedbackreport.component.scss',
})
export class FeedbackreportComponent implements OnInit {
  tenantId: any;
  formId = '';
  formData: any = null;
  filterForm!: FormGroup;
  loading = false;
  exporting = false;
  staffList: any[] = [];
  selectedStaff: string[] = [];
  staffSearch = '';
  reportData: any = null;
  reportRows: any[] = [];
  partAHeaders: any[] = [];
  partBHeaders: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
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

    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
    });

    this.loadForm();
  }

  loadForm(): void {
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, formId: this.formId },
        'feedback',
        'view',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.formData = res.data;
            this.staffList = res.data.staffAssignments || [];
            this.breadcrump.set([
              { label: 'Feedback', link: '/app/feedback' },
              { label: res.data.title },
              { label: 'Report' },
            ]);
            this.filterForm.patchValue({
              startDate: this.tsToDate(res.data.startDate),
              endDate: this.tsToDate(res.data.endDate),
            });
            this.fetchReport();
          }
        },
        error: () => this.alert.error('Error loading form'),
      });
  }

  get filteredStaffList(): any[] {
    if (!this.staffSearch.trim()) return this.staffList;
    const q = this.staffSearch.toLowerCase();
    return this.staffList.filter(
      (s) =>
        (s.staffName || '').toLowerCase().includes(q) ||
        (s.staffCode || '').toLowerCase().includes(q),
    );
  }

  isStaffSelected(staffId: string): boolean {
    return (
      this.selectedStaff.length === 0 || this.selectedStaff.includes(staffId)
    );
  }

  toggleStaff(staffId: string): void {
    if (this.selectedStaff.includes(staffId)) {
      this.selectedStaff = this.selectedStaff.filter((id) => id !== staffId);
    } else {
      this.selectedStaff = [...this.selectedStaff, staffId];
    }
  }

  selectAllStaff(): void {
    this.selectedStaff = [];
  }

  clearStaffFilter(): void {
    this.selectedStaff = [];
  }

  get staffSelectionLabel(): string {
    if (!this.selectedStaff.length)
      return 'All Staff (' + this.staffList.length + ')';
    return this.selectedStaff.length + ' staff selected';
  }

  fetchReport(): void {
    this.loading = true;
    this.reportData = null;
    this.reportRows = [];
    const payload: any = {
      tenantId: this.tenantId,
      formId: this.formId,
    };
    if (this.selectedStaff.length) payload.staffIds = this.selectedStaff;
    this.commonApi.fetchData(payload, 'feedback', 'report').subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status) {
          this.reportData = res.data;
          this.reportRows = res.data.rows || [];
          this.partAHeaders = res.data.partAHeaders || [];
          this.partBHeaders = res.data.partBHeaders || [];
        } else {
          this.alert.error(res?.message || 'Failed to load report');
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Failed to load report');
      },
    });
  }

  scoreClass(val: number | null): string {
    if (val == null) return 'text-muted';
    if (val >= 9) return 'text-success fw-semibold';
    if (val >= 7) return 'text-primary';
    if (val >= 5) return 'text-warning';
    return 'text-danger';
  }

  pctClass(val: number | null): string {
    if (val == null) return 'text-muted';
    if (val >= 90) return 'text-success fw-bold';
    if (val >= 75) return 'text-primary fw-bold';
    if (val >= 50) return 'text-warning fw-bold';
    return 'text-danger fw-bold';
  }

  get avgTea(): string {
    const v = this.reportRows.filter((r) => r.teaPct != null);
    if (!v.length) return '—';
    return (v.reduce((s, r) => s + r.teaPct, 0) / v.length).toFixed(1) + '%';
  }

  get avgRea(): string {
    const v = this.reportRows.filter((r) => r.reaPct != null);
    if (!v.length) return '—';
    return (v.reduce((s, r) => s + r.reaPct, 0) / v.length).toFixed(1) + '%';
  }

  get totalResponses(): number {
    return this.reportRows.reduce((s, r) => s + (r.responseCount || 0), 0);
  }

  exportPdf(): void {
    if (!this.reportRows.length) {
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
      const startFmt = this.formData?.startDate
        ? new Date(this.formData.startDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '—';
      const endFmt = this.formData?.endDate
        ? new Date(this.formData.endDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '—';
      const batchStr = (this.reportData?.assignedBatches || []).join(', ');
      const staffStr = this.selectedStaff.length
        ? this.staffList
            .filter((s) => this.selectedStaff.includes(s.staffId))
            .map((s) => s.staffCode || s.staffName)
            .join(', ')
        : 'All Staff';
      bold(13);
      doc.text(this.reportTitle.toUpperCase(), pageW / 2, 12, { align: 'center' });
      normal(7.5);
      doc.text(
        'Staff: ' + staffStr + '  |  Batch: ' + batchStr,
        pageW / 2,
        18,
        { align: 'center' },
      );
      doc.text(
        'Feedback Period: ' + startFmt + ' to ' + endFmt,
        pageW / 2,
        23,
        { align: 'center' },
      );
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(ml, 26, pageW - mr, 26);
      const aHdrs = this.partAHeaders;
      const bHdrs = this.partBHeaders;
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
          {
            content: 'STRENGTH',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
          },
          {
            content: 'RESPONSES',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 },
          },
          {
            content: 'TEA%',
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 6.5,
              fillColor: [220, 252, 231],
              textColor: [22, 101, 52],
            },
          },
          {
            content: 'REA%',
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 6.5,
              fillColor: [254, 243, 199],
              textColor: [146, 64, 14],
            },
          },
          ...aHdrs.map((h: any) => ({
            content: h.label,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 6,
              fillColor: [219, 234, 254],
              textColor: [30, 64, 175],
            },
          })),
          ...bHdrs.map((h: any) => ({
            content: h.label,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 6,
              fillColor: [254, 243, 199],
              textColor: [146, 64, 14],
            },
          })),
        ],
      ];
      const body: any[][] = this.reportRows.map((r: any) => {
        const teaColor =
          r.teaPct == null
            ? [150, 150, 150]
            : r.teaPct >= 90
              ? [22, 101, 52]
              : r.teaPct >= 75
                ? [37, 99, 235]
                : r.teaPct >= 50
                  ? [161, 98, 7]
                  : [153, 27, 27];
        const reaColor =
          r.reaPct == null
            ? [150, 150, 150]
            : r.reaPct >= 90
              ? [22, 101, 52]
              : r.reaPct >= 75
                ? [37, 99, 235]
                : r.reaPct >= 50
                  ? [161, 98, 7]
                  : [153, 27, 27];

        return [
          {
            content: r.staffCode || '—',
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 },
          },
          { content: r.batchCode, styles: { halign: 'center', fontSize: 6.5 } },
          { content: r.strength, styles: { halign: 'center', fontSize: 6.5 } },
          {
            content: r.responseCount,
            styles: { halign: 'center', fontSize: 6.5 },
          },
          {
            content: r.teaPct != null ? r.teaPct.toFixed(1) + '%' : '—',
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 7,
              textColor: teaColor,
              fillColor: [240, 253, 244],
            },
          },
          {
            content: r.reaPct != null ? r.reaPct.toFixed(1) + '%' : '—',
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 7,
              textColor: reaColor,
              fillColor: [255, 251, 235],
            },
          },
          ...(r.partAScores || []).map((v: any) => ({
            content: v != null ? v.toFixed(2) : '—',
            styles: {
              halign: 'center',
              fontSize: 6,
              fillColor: [239, 246, 255],
            },
          })),
          ...(r.partBScores || []).map((v: any) => ({
            content: v != null ? v.toFixed(2) : '—',
            styles: {
              halign: 'center',
              fontSize: 6,
              fillColor: [255, 251, 235],
            },
          })),
        ];
      });
      const avgTeaNum = this.reportRows.filter((r) => r.teaPct != null);
      const avgReaNum = this.reportRows.filter((r) => r.reaPct != null);
      const tAvg = avgTeaNum.length
        ? (
            avgTeaNum.reduce((s: number, r: any) => s + r.teaPct, 0) /
            avgTeaNum.length
          ).toFixed(1) + '%'
        : '—';
      const rAvg = avgReaNum.length
        ? (
            avgReaNum.reduce((s: number, r: any) => s + r.reaPct, 0) /
            avgReaNum.length
          ).toFixed(1) + '%'
        : '—';
      body.push([
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
        {
          content: tAvg,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 7,
            fillColor: [220, 252, 231],
            textColor: [22, 101, 52],
          },
        },
        {
          content: rAvg,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 7,
            fillColor: [254, 243, 199],
            textColor: [146, 64, 14],
          },
        },
        ...aHdrs.map(() => ({
          content: '',
          styles: { fillColor: [241, 245, 249] },
        })),
        ...bHdrs.map(() => ({
          content: '',
          styles: { fillColor: [241, 245, 249] },
        })),
      ]);
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
          2: { cellWidth: 14 },
          3: { cellWidth: 16 },
        },
      });
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      normal(7);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Overall teaching effectiveness: ' +
          tAvg +
          '  |  Research effectiveness: ' +
          rAvg,
        pageW / 2,
        finalY + 7,
        { align: 'center' },
      );
      doc.text(
        'TEA% = Teaching Effectiveness (Part A)   |   REA% = Research Effectiveness (Part B)',
        pageW / 2,
        finalY + 13,
        { align: 'center' },
      );
      const title = (this.formData?.title || 'Feedback').replace(
        /[^a-z0-9]/gi,
        '_',
      );
      doc.save('Feedback_Report_' + title + '.pdf');
    } finally {
      this.exporting = false;
    }
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/feedback' });
  }

  private tsToDate(ts: number): string {
    if (!ts) return '';
    return new Date(ts).toISOString().split('T')[0];
  }

  formatDate(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  get reportTitle(): string {
  if (this.selectedStaff.length === 1) {
    const s = this.staffList.find((x: any) => x.staffId === this.selectedStaff[0]);
    return (s?.staffName || 'Faculty') + ' — Feedback Report';
  }
  return 'Consolidated Feedback Report';
}
}
