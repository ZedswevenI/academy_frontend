import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AuthService } from '../../../../service/auth/auth.service';
import { AlertService } from '../../../../service/alert/alert.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-school-attendance',
  standalone: false,
  templateUrl: './school-attendance.component.html',
  styleUrl: './school-attendance.component.scss',
})
export class SchoolAttendanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loading = false;
  batches: any[] = [];
  markedSet = new Set<string>();
  selectedDate: number = 0;
  selectedDateLabel = '';
  dates: {
    label: string;
    value: number;
    isToday: boolean;
    isFuture: boolean;
  }[] = [];
  currentWeekMonday = 0;
  isAO = false;
  isTeacher = false;
  staffId = '';
  roleLevel = '';
  showPrintModal = false;
  printBatch: any = null;
  printMonth = '';
  printLoading = false;
  monthOptions: { label: string; value: string }[] = [];

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private auth: AuthService,
    private alert: AlertService,
  ) {
    this.breadcrumb.set([{ label: 'School Attendance' }]);
  }

  ngOnInit(): void {
    this.roleLevel = this.auth.getRole();
    this.isAO = ['L1', 'L3'].includes(this.roleLevel);
    this.isTeacher = ['L4', 'L5'].includes(this.roleLevel);
    this.staffId = this.auth.getStaffId();
    this.buildWeekDates(this.getTodayUtcMs());
    const today =
      this.dates.find((d) => d.value === this.getTodayUtcMs()) || this.dates[0];
    this.selectDate(today);
    this.buildMonthOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildMonthOptions(): void {
    const now = new Date();
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.monthOptions = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const val = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      this.monthOptions.push({
        label: `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        value: val,
      });
    }
    this.printMonth = this.monthOptions[0]?.value || '';
  }

  getTodayUtcMs(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }

  getMondayOfWeek(anyMs: number): number {
    const d = new Date(anyMs);
    const utcDay = d.getUTCDay();
    const diff = utcDay === 0 ? -6 : 1 - utcDay;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff);
  }

  buildWeekDates(anyMs: number): void {
    const monday = this.getMondayOfWeek(anyMs);
    this.currentWeekMonday = monday;
    const today = this.getTodayUtcMs();
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    this.dates = Array.from({ length: 7 }, (_, i) => {
      const ms = monday + i * 86_400_000;
      const d = new Date(ms);
      return {
        label: `${dayLabels[i]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`,
        value: ms,
        isToday: ms === today,
        isFuture: ms > today,
      };
    });
  }

  prevWeek(): void {
    this.buildWeekDates(this.currentWeekMonday - 7 * 86_400_000);
    this.selectDate(this.dates[0]);
  }

  nextWeek(): void {
    this.buildWeekDates(this.currentWeekMonday + 7 * 86_400_000);
    this.selectDate(this.dates[0]);
  }

  selectDate(d: any): void {
    this.selectedDate = d.value;
    this.selectedDateLabel = d.label;
    this.loadBatches();
  }

  loadBatches(): void {
    const tenantId = localStorage.getItem('tenantId');
    const payload: any = { entiId: tenantId, roleLevel: this.roleLevel };
    if (this.isTeacher) payload.staffId = this.staffId;

    this.loading = true;
    this.commonApi
      .fetchData(payload, 'batch', 'school-attendance/batches')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.batches = res?.data || [];
          this.checkMarkedStatus();
        },
        error: () => {
          this.loading = false;
          this.batches = [];
        },
      });
  }

  checkMarkedStatus(): void {
    if (!this.batches.length || !this.selectedDate) return;
    const tenantId = localStorage.getItem('tenantId');
    this.markedSet.clear();

    this.commonApi
      .fetchData(
        {
          entiId: tenantId,
          fromDate: this.selectedDate,
          toDate: this.selectedDate,
          batchCodes: this.batches.map((b) => b.batchCode),
        },
        'batch',
        'school-attendance/marked-check',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const marked: string[] = res?.markedBatchCodes || [];
          this.markedSet = new Set(marked);
        },
        error: () => {},
      });
  }

  isMarked(batchCode: string): boolean {
    return this.markedSet.has(batchCode);
  }

  goToMark(batch: any): void {
    this.router.navigate(['/app/school-attendance/mark'], {
      state: {
        batchCode: batch.batchCode,
        batchName: batch.batchName,
        batchId: batch.batchId,
        section: batch.section || '',
        classNo: batch.classNo || '',
        date: this.selectedDate,
        dateLabel: this.selectedDateLabel,
        roleLevel: this.roleLevel,
        markedBy: localStorage.getItem('userId'),
        markedByName: localStorage.getItem('userName') || '',
        markedByRole: this.roleLevel,
      },
    });
  }

  get isPastDate(): boolean {
    return this.selectedDate < this.getTodayUtcMs();
  }

  get isFutureDate(): boolean {
    return this.selectedDate > this.getTodayUtcMs();
  }

  canMarkBatch(batch: any): boolean {
    if (this.isTeacher) return !this.isPastDate && !this.isFutureDate;
    return !this.isFutureDate;
  }

  openPrintModal(batch: any): void {
    this.printBatch = batch;
    this.showPrintModal = true;
  }

  closePrintModal(): void {
    this.showPrintModal = false;
    this.printBatch = null;
  }

  downloadPdf(): void {
    if (!this.printBatch || !this.printMonth || this.printLoading) return;
    const [year, month] = this.printMonth.split('-').map(Number);
    const tenantId = localStorage.getItem('tenantId');
    this.printLoading = true;
    this.commonApi
      .fetchData(
        {
          entiId: tenantId,
          batchCode: this.printBatch.batchCode,
          month,
          year,
        },
        'batch',
        'school-attendance/monthly-report',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.printLoading = false;
          this.generatePdf(res?.data, year, month);
        },
        error: (err: any) => {
          this.printLoading = false;
          this.alert.error(err?.error?.message || 'Failed to generate report');
        },
      });
  }

  private generatePdf(data: any, year: number, month: number): void {
    if (!data) return;
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;
    const lastDay = data.lastDay || 31;
    const rows: any[] = data.rows || [];
    const batch = this.printBatch;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ATTENDANCE REGISTER', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Batch: ${batch.batchName} (${batch.batchCode})`, 14, 22);
    doc.text(`Month: ${monthLabel}`, 14, 28);
    const rightX = pageW - 14;
    if (batch.section)
      doc.text(`Section: ${batch.section}`, rightX, 22, { align: 'right' });
    if (batch.classNo)
      doc.text(`Class: ${batch.classNo}`, rightX, 28, { align: 'right' });
    doc.setDrawColor(0);
    doc.line(14, 31, pageW - 14, 31);
    const head: any[][] = [[]];
    head[0].push(
      { content: 'Sl', styles: { halign: 'center', fontStyle: 'bold' } },
      {
        content: 'Name',
        styles: { halign: 'left', fontStyle: 'bold', cellWidth: 38 },
      },
    );
    for (let d = 1; d <= lastDay; d++) {
      head[0].push({
        content: String(d),
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: 6 },
      });
    }
    head[0].push(
      {
        content: 'P',
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: 8 },
      },
      {
        content: 'WD',
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: 8 },
      },
      {
        content: '%',
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
      },
    );
    const body: any[][] = rows.map((row: any, idx: number) => {
      const cells: any[] = [
        { content: idx + 1, styles: { halign: 'center' } },
        { content: row.name, styles: { halign: 'left' } },
      ];
      for (const cell of row.attendance || []) {
        const val = cell || '';
        cells.push({
          content: val,
          styles: {
            halign: 'center',
            textColor:
              val === 'A'
                ? [220, 53, 69] // red
                : val === 'L'
                  ? [255, 153, 0] // orange
                  : val === 'P'
                    ? [25, 135, 84] // green
                    : [180, 180, 180], // blank
            fontStyle: val ? 'bold' : 'normal',
          },
        });
      }
      cells.push(
        {
          content: row.presentCount,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            textColor: [25, 135, 84],
          },
        },
        { content: row.workingDays, styles: { halign: 'center' } },
        {
          content: `${row.percentage}%`,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            textColor: row.percentage >= 75 ? [25, 135, 84] : [220, 53, 69],
          },
        },
      );

      return cells;
    });

    // ── Totals row ────────────────────────────────────────────────────────────
    const totalRow: any[] = [
      { content: '', styles: { halign: 'center' } },
      { content: 'TOTAL', styles: { halign: 'left', fontStyle: 'bold' } },
      { content: '', styles: { halign: 'center' } },
    ];
    for (let d = 1; d <= lastDay; d++) {
      // Count how many marked on this day
      const dayIdx = d - 1;
      const dateMs = Date.UTC(year, month - 1, d);
      const dayCount = rows.filter(
        (r: any) =>
          r.attendance[dayIdx] === 'P' || r.attendance[dayIdx] === 'L',
      ).length;
      totalRow.push({
        content: dayCount || '',
        styles: { halign: 'center', fontStyle: 'bold' },
      });
    }
    const totalPresent = rows.reduce(
      (s: number, r: any) => s + (r.presentCount || 0),
      0,
    );
    const totalWorking = rows.length > 0 ? rows[0].workingDays : 0;
    const avgPct = rows.length
      ? Math.round(
          rows.reduce((s: number, r: any) => s + (r.percentage || 0), 0) /
            rows.length,
        )
      : 0;

    totalRow.push(
      {
        content: totalPresent,
        styles: { halign: 'center', fontStyle: 'bold' },
      },
      {
        content: totalWorking,
        styles: { halign: 'center', fontStyle: 'bold' },
      },
      {
        content: `${avgPct}%`,
        styles: { halign: 'center', fontStyle: 'bold' },
      },
    );
    body.push(totalRow);

    // ── Legend ────────────────────────────────────────────────────────────────
    const legendY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 6
      : 200;

    // ── Render table ──────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: 35,
      head,
      body,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
        lineColor: [200, 200, 200],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 7,
        cellPadding: 1.5,
      },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 7 },
        1: { cellWidth: 38 },
        2: { cellWidth: 18 },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData: any) => {
        // Last row (totals) — grey background
        if (hookData.row.index === body.length - 1) {
          hookData.cell.styles.fillColor = [230, 230, 230];
        }
      },
    });

    // Legend below table
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(
      'P = Present   A = Absent   L = Late   WD = Working Days   % = Attendance %',
      14,
      finalY + 6,
    );

    // ── Save ──────────────────────────────────────────────────────────────────
    doc.save(
      `Attendance_${batch.batchCode}_${monthLabel.replace(' ', '_')}.pdf`,
    );
  }
}
