import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AuthService } from '../../../../service/auth/auth.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { PermissionService } from '../../../../shared/permission.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  holidaySet = new Set<string>();
  selectedDate = 0;
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
  canDeclare = false;
  staffId = '';
  roleLevel = '';
  popoverDate: number | null = null;
  holidayPopoverDateMap = new Map<
    number,
    { name: string; type: string; attendanceId: string }
  >();
  declareForm = { name: '', type: 'HOLIDAY' };
  declaringHoliday = false;
  removingHoliday = false;
  showPrintModal = false;
  printBatch: any = null;
  printMonth = '';
  printMode: 'month' | 'range' = 'month';
  printReportType: 'ALL' | 'PRESENT' | 'ABSENT' = 'ALL';
  printFromDate = '';
  printToDate = '';
  printLoading = false;
  monthOptions: { label: string; value: string }[] = [];
  finalisedSet = new Set<string>();
  finalisingBatch: string | null = null;
  statusReport: any[] = [];
  statusReportLoading = false;
  showStatusReport = false;
  statusReportFrom = '';
  statusReportTo = '';

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private auth: AuthService,
    private alert: AlertService,
    private elRef: ElementRef,
    private permissionService: PermissionService,
  ) {
    this.breadcrumb.set([{ label: 'School Attendance' }]);
  }

  ngOnInit(): void {
    this.roleLevel = this.auth.getRole();
    this.isAO = ['L1', 'L3'].includes(this.roleLevel);
    this.isTeacher = ['L4', 'L5'].includes(this.roleLevel);
    // Popover-open gate — the popover itself offers Declare OR Remove
    // depending on state, so either permission is enough to open it; the
    // individual buttons inside are gated separately by their exact key.
    this.canDeclare =
      ['L1', 'L3', 'L4'].includes(this.roleLevel) &&
      this.permissionService.hasAny(['schoolAttendance:declareHoliday', 'schoolAttendance:removeHoliday']);
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

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (
      !this.elRef.nativeElement
        .querySelector('.date-popover-wrap')
        ?.contains(e.target as Node)
    ) {
      this.popoverDate = null;
    }
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
    this.popoverDate = null;
    this.loadBatches();
    this.loadWeekHolidays();
  }

  selectDateOnly(d: any): void {
    const changed = this.selectedDate !== d.value;
    this.selectedDate = d.value;
    this.selectedDateLabel = d.label;
    this.popoverDate = null;
    if (changed) {
      this.loadBatches();
      this.loadWeekHolidays();
    }
  }

  onHolidayIconClick(d: any, event: MouseEvent): void {
    event.stopPropagation();
    const changed = this.selectedDate !== d.value;
    this.selectedDate = d.value;
    this.selectedDateLabel = d.label;
    if (changed) {
      this.loadBatches();
      this.loadWeekHolidays();
    }
    if (this.popoverDate === d.value) {
      this.popoverDate = null;
    } else {
      this.popoverDate = d.value;
      const existing = this.holidayPopoverDateMap.get(d.value);
      this.declareForm = {
        name: existing?.name || '',
        type: existing?.type || 'HOLIDAY',
      };
    }
  }

  loadWeekHolidays(): void {
    if (!this.batches.length) return;
    const tenantId = localStorage.getItem('tenantId');
    const batchCode = this.batches[0]?.batchCode;
    if (!batchCode) return;
    const fromDate = this.dates[0].value;
    const toDate = this.dates[6].value;
    this.commonApi
      .fetchData(
        { entiId: tenantId, batchCode, fromDate, toDate },
        'batch',
        'school-attendance/holiday/list',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.holidayPopoverDateMap.clear();
          (res?.data || []).forEach((h: any) => {
            this.holidayPopoverDateMap.set(h.date, {
              name: h.holidayName || h.type,
              type: h.type,
              attendanceId: h.attendanceId,
            });
          });
        },
        error: () => {},
      });
  }

  isDateHoliday(dateMs: number): boolean {
    return this.holidayPopoverDateMap.has(dateMs);
  }

  getDateHolidayName(dateMs: number): string {
    return this.holidayPopoverDateMap.get(dateMs)?.name || '';
  }

  declareHoliday(): void {
    if (!this.declareForm.name.trim()) {
      this.alert.error('Please enter a holiday name');
      return;
    }
    const tenantId = localStorage.getItem('tenantId');
    this.declaringHoliday = true;
    this.commonApi
      .fetchData(
        {
          entiId: tenantId,
          date: this.popoverDate,
          holidayName: this.declareForm.name.trim(),
          type: this.declareForm.type,
          userId: localStorage.getItem('userId'),
        },
        'batch',
        'school-attendance/holiday/declare-all-batches',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.declaringHoliday = false;
          if (res?.status) {
            this.alert.success(`Holiday declared: ${this.declareForm.name}`);
            this.holidayPopoverDateMap.set(this.popoverDate!, {
              name: this.declareForm.name.trim(),
              type: this.declareForm.type,
              attendanceId: '',
            });
            this.popoverDate = null;
            this.declareForm = { name: '', type: 'HOLIDAY' };
            this.checkMarkedStatus();
          } else {
            this.alert.error(res?.message || 'Failed to declare holiday');
          }
        },
        error: (err: any) => {
          this.declaringHoliday = false;
          this.alert.error(err?.error?.message || 'Failed to declare holiday');
        },
      });
  }

  removeHoliday(dateMs: number): void {
    if (!confirm('Remove holiday for all batches on this date?')) return;
    const tenantId = localStorage.getItem('tenantId');
    const batchCode = this.batches[0]?.batchCode;
    if (!batchCode) return;
    this.removingHoliday = true;
    const ops = this.batches.map((b) =>
      this.commonApi
        .fetchData(
          {
            entiId: tenantId,
            batchCode: b.batchCode,
            date: dateMs,
            userId: localStorage.getItem('userId'),
          },
          'batch',
          'school-attendance/holiday/remove',
        )
        .pipe(takeUntil(this.destroy$))
        .toPromise(),
    );

    Promise.allSettled(ops).then(() => {
      this.removingHoliday = false;
      this.holidayPopoverDateMap.delete(dateMs);
      this.popoverDate = null;
      this.alert.success('Holiday removed');
      this.checkMarkedStatus();
    });
  }

  closePopover(): void {
    this.popoverDate = null;
    this.declareForm = { name: '', type: 'HOLIDAY' };
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
          this.loadWeekHolidays();
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
    this.holidaySet.clear();
    this.finalisedSet.clear();
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
          (res?.markedBatchCodes || []).forEach((c: string) =>
            this.markedSet.add(c),
          );
          (res?.holidayBatchCodes || []).forEach((c: string) =>
            this.holidaySet.add(c),
          );
          (res?.finalisedBatchCodes || []).forEach((c: string) =>
            this.finalisedSet.add(c),
          );
        },
        error: () => {},
      });
  }

  isFinalised(batchCode: string): boolean {
    return this.finalisedSet.has(batchCode);
  }

  isMarked(batchCode: string): boolean {
    return this.markedSet.has(batchCode);
  }
  isHoliday(batchCode: string): boolean {
    return this.holidaySet.has(batchCode);
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
    if (this.isHoliday(batch.batchCode)) return false;
    if (this.isTeacher) return !this.isPastDate && !this.isFutureDate;
    return !this.isFutureDate;
  }

  openPrintModal(batch: any): void {
    this.printBatch = batch;
    this.printMode = 'month';
    this.printReportType = 'ALL';
    this.printFromDate = '';
    this.printToDate = '';
    this.showPrintModal = true;
  }

  closePrintModal(): void {
    this.showPrintModal = false;
    this.printBatch = null;
    this.printReportType = 'ALL';
  }

  downloadPdf(): void {
    if (this.printReportType === 'PRESENT' || this.printReportType === 'ABSENT') {
      this.downloadFirstBatchPdf();
      return;
    }
    if (this.printMode === 'range') {
      this.downloadRangePdf();
      return;
    }
    if (!this.printBatch || !this.printMonth || this.printLoading) return;
    const [year, month] = this.printMonth.split('-').map(Number);
    const tenantId = localStorage.getItem('tenantId');
    this.printLoading = true;
    this.commonApi
      .fetchData(
        { entiId: tenantId, batchCode: this.printBatch.batchCode, month, year },
        'batch',
        'school-attendance/monthly-report',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.printLoading = false;
          this.generatePdf(res?.data, { monthLabel: this.monthLabelFor(year, month) });
        },
        error: (err: any) => {
          this.printLoading = false;
          this.alert.error(err?.error?.message || 'Failed to generate report');
        },
      });
  }

  private downloadFirstBatchPdf(): void {
    if (!this.printBatch || this.printLoading) return;
    const tenantId = localStorage.getItem('tenantId');
    const payload: any = {
      entiId: tenantId,
      batchCode: this.printBatch.batchCode,
      reportType: this.printReportType,
    };

    let monthLabel = '';
    let fileSuffix = '';

    if (this.printMode === 'month') {
      if (!this.printMonth) return;
      const [year, month] = this.printMonth.split('-').map(Number);
      payload.month = month;
      payload.year = year;
      monthLabel = this.monthLabelFor(year, month);
      fileSuffix = monthLabel.replace(/ /g, '_');
    } else {
      if (!this.printFromDate || !this.printToDate) return;
      const [fy, fm, fd] = this.printFromDate.split('-').map(Number);
      const [ty, tm, td] = this.printToDate.split('-').map(Number);
      const fromDate = Date.UTC(fy, fm - 1, fd);
      const toDate = Date.UTC(ty, tm - 1, td);
      payload.fromDate = fromDate;
      payload.toDate = toDate;
      monthLabel = `${this.formatShortDate(fromDate)} – ${this.formatShortDate(toDate)}`;
      fileSuffix = `${this.printFromDate}_to_${this.printToDate}`;
    }

    const reportTypeName = this.printReportType === 'PRESENT' ? 'Present List' : 'Absent List';
    const reportTitle = this.printReportType === 'PRESENT'
      ? 'PRESENT LIST'
      : this.printReportType === 'ABSENT'
        ? 'ABSENT LIST'
        : 'ATTENDANCE REGISTER';
    const filePrefix = this.printReportType === 'PRESENT' ? 'Present' : 'Absent';

    this.printLoading = true;
    this.commonApi
      .fetchData(payload, 'batch', 'school-attendance/first-batch-report')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.printLoading = false;
          if (!res?.data?.rows?.length && !res?.data?.allRows?.length) {
            this.alert.warning(`No students found in the First Batch ${reportTypeName} for this period`);
            return;
          }
          this.generatePdf(res?.data, {
            monthLabel,
            fileSuffix,
            title: reportTitle,
            filePrefix,
          });
        },
        error: (err: any) => {
          this.printLoading = false;
          this.alert.error(err?.error?.message || `Failed to generate First Batch ${reportTypeName}`);
        },
      });
  }

  private downloadRangePdf(): void {
    if (!this.printBatch || !this.printFromDate || !this.printToDate || this.printLoading) return;
    const tenantId = localStorage.getItem('tenantId');
    const [fy, fm, fd] = this.printFromDate.split('-').map(Number);
    const [ty, tm, td] = this.printToDate.split('-').map(Number);
    const fromDate = Date.UTC(fy, fm - 1, fd);
    const toDate = Date.UTC(ty, tm - 1, td);
    this.printLoading = true;
    this.commonApi
      .fetchData(
        { entiId: tenantId, batchCode: this.printBatch.batchCode, fromDate, toDate },
        'batch',
        'school-attendance/range-report',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.printLoading = false;
          const rangeLabel = `${this.formatShortDate(fromDate)} – ${this.formatShortDate(toDate)}`;
          this.generatePdf(res?.data, {
            monthLabel: rangeLabel,
            fileSuffix: `${this.printFromDate}_to_${this.printToDate}`,
          });
        },
        error: (err: any) => {
          this.printLoading = false;
          this.alert.error(err?.error?.message || 'Failed to generate range report');
        },
      });
  }

  private monthLabelFor(year: number, month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${monthNames[month - 1]} ${year}`;
  }

  private formatShortDate(ms: number): string {
    return new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Groups a date-range report's dates/rows into one bucket per calendar
  // month, each with its own day columns, holiday set, and per-month
  // present/absent/% recomputed from that month's slice of attendance[]
  // (the API's row-level presentCount/absentCount/percentage are totals for
  // the whole requested range, not per month, so they can't be reused here).
  private splitRangeIntoMonthBuckets(data: any): {
    monthLabel: string;
    dayMeta: { label: string; isHoliday: boolean }[];
    holidays: any[];
    rows: any[];
    workingDays: number;
  }[] {
    const dates: number[] = data.dates || [];
    const holidays: any[] = data.holidays || [];
    const holidayDateSet = new Set<number>(holidays.map((h: any) => h.date));
    const sourceRows: any[] = data.rows || [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthKeyOf = (ms: number) => {
      const d = new Date(ms);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    };

    const order: string[] = [];
    const indicesByMonth = new Map<string, number[]>();
    dates.forEach((ms, idx) => {
      const key = monthKeyOf(ms);
      if (!indicesByMonth.has(key)) {
        indicesByMonth.set(key, []);
        order.push(key);
      }
      indicesByMonth.get(key)!.push(idx);
    });

    return order.map((key) => {
      const indices = indicesByMonth.get(key)!;
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const monthNum = Number(monthStr);
      const monthLabel = `${monthNames[monthNum]} ${year}`;

      const dayMeta = indices.map((idx) => ({
        label: String(new Date(dates[idx]).getUTCDate()),
        isHoliday: holidayDateSet.has(dates[idx]),
      }));
      const workingDays = dayMeta.filter((d) => !d.isHoliday).length;
      const monthHolidays = holidays.filter((h: any) => monthKeyOf(h.date) === key);

      const rows = sourceRows.map((r: any) => {
        const attendance = indices.map((idx) => r.attendance?.[idx] ?? '');
        const remarks = indices.map((idx) => r.remarks?.[idx] ?? null);
        const presentCount = attendance.filter((v) => v === 'P' || v === 'L').length;
        const absentCount = attendance.filter((v) => v === 'A').length;
        const percentage = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;
        return { ...r, attendance, remarks, presentCount, absentCount, percentage };
      });

      return { monthLabel, dayMeta, holidays: monthHolidays, rows, workingDays };
    });
  }

  private generatePdf(
    data: any,
    period: { monthLabel: string; fileSuffix?: string; title?: string; filePrefix?: string },
  ): void {
    if (!data) return;
    const batch = this.printBatch;

    // Month mode: `data.lastDay` (1..N) is the day-of-month column count —
    // rendered as a single page. Range mode: `data.dates[]` (epoch ms) can
    // span several calendar months, so it's split into daily pages
    // with a dedicated Remarks column.
    const isRangeMode = !data.lastDay && Array.isArray(data.dates);
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    if (isRangeMode) {
      this.renderDateRangeDailyPages(doc, batch, data, period);
    } else {
      const lastDay = data.lastDay || 31;
      const holidays: any[] = data.holidays || [];
      const holidayDaySet = new Set<number>();
      holidays.forEach((h: any) => holidayDaySet.add(new Date(h.date).getUTCDate()));
      const dayMeta = Array.from({ length: lastDay }, (_, i) => ({
        label: String(i + 1),
        isHoliday: holidayDaySet.has(i + 1),
      }));
      this.renderAttendanceBlock(doc, batch, {
        rows: data.rows || [],
        dayMeta,
        monthLabel: period.monthLabel,
        holidays,
        workingDays: data.workingDays || 0,
        title: period.title,
      });
    }

    const fileSuffix = period.fileSuffix || period.monthLabel.replace(/ /g, '_');
    const prefix = period.filePrefix ? `${period.filePrefix}_` : '';
    doc.save(`Attendance_${prefix}${batch.batchCode}_${fileSuffix}.pdf`);
  }

  // Date range report: renders each date on a separate PDF page with a dedicated Remarks column.
  private renderDateRangeDailyPages(
    doc: jsPDF,
    batch: any,
    data: any,
    period: { monthLabel: string; title?: string },
  ): void {
    const dates: number[] = data.dates || [];
    if (!dates.length) return;

    const holidays: any[] = data.holidays || [];
    const holidayDateMap = new Map<number, string>();
    holidays.forEach((h: any) => {
      holidayDateMap.set(h.date, h.holidayName || h.type || 'Holiday');
    });

    const sourceStudents: any[] =
      data.allRows && data.allRows.length ? data.allRows : data.rows || [];
    const reportType = this.printReportType;

    let pageAddedCount = 0;

    dates.forEach((dateMs, dateIdx) => {
      if (pageAddedCount > 0) {
        doc.addPage();
      }
      this.renderDailyDateBlock(doc, batch, {
        dateMs,
        dateIdx,
        students: sourceStudents,
        isHoliday: holidayDateMap.has(dateMs),
        holidayName: holidayDateMap.get(dateMs),
        reportType,
        customTitle: period.title,
      });
      pageAddedCount++;
    });
  }

  private renderDailyDateBlock(
    doc: jsPDF,
    batch: any,
    block: {
      dateMs: number;
      dateIdx: number;
      students: any[];
      isHoliday: boolean;
      holidayName?: string;
      reportType: 'ALL' | 'PRESENT' | 'ABSENT';
      customTitle?: string;
    },
  ): void {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ml = 10,
      mr = 10;
    const contentW = pageW - ml - mr;

    const bold = (s: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(s);
    };
    const normal = (s: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(s);
    };

    const d = new Date(block.dateMs);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    const dateDDMMYYYY = `${dd}/${mm}/${yyyy}`;

    // 1. Process all students for this date
    const allForDate = block.students.map((s: any) => {
      const raw = s.attendance?.[block.dateIdx] ?? '';
      const remark = s.remarks?.[block.dateIdx] || '';
      return {
        admissionNo: s.admissionNo || '',
        name: s.name || '',
        raw,
        remark,
      };
    });

    const totalStudents = allForDate.length;
    const presentCount = allForDate.filter(
      (s) => s.raw === 'P' || s.raw === 'L',
    ).length;
    const absentCount = allForDate.filter((s) => s.raw === 'A').length;
    const lateCount = allForDate.filter((s) => s.raw === 'L').length;
    const attPct =
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    // Filter students by selected report type
    let displayStudents = allForDate;
    if (block.reportType === 'PRESENT') {
      displayStudents = allForDate.filter((s) => s.raw === 'P' || s.raw === 'L');
    } else if (block.reportType === 'ABSENT') {
      displayStudents = allForDate.filter((s) => s.raw === 'A');
    }

    // 2. Header
    bold(14);
    let titleText = 'ATTENDANCE REGISTER';
    if (block.reportType === 'PRESENT') {
      titleText = 'PRESENT LIST';
    } else if (block.reportType === 'ABSENT') {
      titleText = 'ABSENT LIST';
    } else if (block.customTitle) {
      titleText = block.customTitle
        .replace(/^ATTENDANCE REGISTER\s*-\s*/i, '')
        .replace(/^FIRST BATCH\s*/i, '');
    }
    doc.text(titleText, pageW / 2, 11, { align: 'center' });

    let secVal = batch.section || '';
    if (!secVal && batch.batchName) {
      const match = String(batch.batchName).match(/\b\d+([A-Za-z]\d*)\b/);
      secVal = match ? match[1] : '';
    }

    normal(9);
    doc.text(`Date  : ${dateDDMMYYYY}`, ml, 18);
    doc.text(`Class : ${batch.classNo || '-'}`, ml, 23);
    doc.text(`Sec   : ${secVal || '-'}`, ml, 28);

    if (block.isHoliday) {
      bold(9);
      doc.setTextColor(211, 84, 0);
      doc.text(`[ ${block.holidayName || 'HOLIDAY / WEEK-OFF'} ]`, pageW / 2, 23, {
        align: 'center',
      });
      doc.setTextColor(0, 0, 0);
    }

    normal(9);
    doc.text(`Total Students : ${totalStudents}`, pageW - mr, 18, {
      align: 'right',
    });
    const countsLine = `Present: ${presentCount}  |  Absent: ${absentCount}  |  Late: ${lateCount}`;
    doc.text(countsLine, pageW - mr, 23, { align: 'right' });
    bold(9);
    doc.text(`Attendance : ${attPct}%`, pageW - mr, 28, { align: 'right' });

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(ml, 31, pageW - mr, 31);

    // 3. Table Rows
    const head = [['Sr', 'Adm No', 'Student Name', 'Status', 'Remarks']];
    let body: any[][] = [];

    if (displayStudents.length === 0) {
      const emptyMsg =
        block.reportType === 'ABSENT'
          ? 'No students absent on this date (100% Attendance)'
          : block.reportType === 'PRESENT'
            ? 'No students present on this date'
            : 'No student records available for this date';
      body = [['-', '-', emptyMsg, 'Nil', '-']];
    } else {
      body = displayStudents.map((s, idx) => {
        let statusStr = 'Not Marked';
        if (block.isHoliday) statusStr = block.holidayName || 'Holiday';
        else if (s.raw === 'P') statusStr = 'Present';
        else if (s.raw === 'L') statusStr = 'Late';
        else if (s.raw === 'A') statusStr = 'Absent';
        else if (s.raw === 'H') statusStr = block.holidayName || 'Holiday';

        return [
          String(idx + 1),
          s.admissionNo,
          s.name,
          statusStr,
          s.remark || '-',
        ];
      });
    }

    const srW = 12;
    const idW = 36;
    const nameW = 70;
    const statusW = 32;
    const remW = contentW - srW - idW - nameW - statusW; // ~123mm

    autoTable(doc, {
      startY: 33,
      head,
      body,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: srW, halign: 'center' },
        1: { cellWidth: idW, halign: 'center' },
        2: { cellWidth: nameW, halign: 'left' },
        3: { cellWidth: statusW, halign: 'center' },
        4: { cellWidth: remW, halign: 'left' },
      },
      alternateRowStyles: { fillColor: [250, 252, 255] },
      margin: { left: ml, right: mr },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 3) {
          const val = String(hookData.cell.raw || '');
          if (val === 'Present') {
            hookData.cell.styles.fillColor = [235, 247, 238];
            hookData.cell.styles.textColor = [39, 174, 96];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (val === 'Absent') {
            hookData.cell.styles.fillColor = [253, 237, 237];
            hookData.cell.styles.textColor = [192, 57, 43];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (val === 'Late') {
            hookData.cell.styles.fillColor = [254, 243, 230];
            hookData.cell.styles.textColor = [230, 126, 34];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Holiday') || val.includes('Week-Off')) {
            hookData.cell.styles.fillColor = [254, 249, 231];
            hookData.cell.styles.textColor = [183, 149, 11];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // 4. Footer & Signatures
    const finalY = (doc as any).lastAutoTable?.finalY || pageH - 30;
    const footY = Math.min(finalY + 8, pageH - 18);

    normal(7.5);
    doc.setTextColor(100, 100, 100);

    const sigX1 = pageW - mr - 130;
    const sigX2 = pageW - mr - 55;

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.line(sigX1, footY + 4, sigX1 + 45, footY + 4);
    doc.line(sigX2, footY + 4, sigX2 + 50, footY + 4);

    doc.text('Signature of Class Teacher', sigX1 + 2, footY + 8);
    doc.text('Signature of Principal / Academic Coordinator', sigX2, footY + 8);
  }

  // Renders one month's attendance register as a single page/table block
  // onto an already-created jsPDF document (caller adds a new page between
  // blocks when printing multiple months for a date-range report).
  private renderAttendanceBlock(
    doc: jsPDF,
    batch: any,
    block: {
      rows: any[];
      dayMeta: { label: string; isHoliday: boolean }[];
      monthLabel: string;
      holidays: any[];
      workingDays: number;
      title?: string;
    },
  ): void {
    const monthLabel = block.monthLabel;
    const rows: any[] = block.rows;
    const workingDays = block.workingDays;
    const holidays: any[] = block.holidays;
    const dayMeta = block.dayMeta;
    const lastDay = dayMeta.length;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ml = 10,
      mr = 10;
    const contentW = pageW - ml - mr;
    const bold = (s: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(s);
    };
    const normal = (s: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(s);
    };
    bold(14);
    let titleText = block.title || 'ATTENDANCE REGISTER';
    if (titleText.includes('PRESENT LIST')) titleText = 'PRESENT LIST';
    else if (titleText.includes('ABSENT LIST')) titleText = 'ABSENT LIST';
    doc.text(titleText, pageW / 2, 12, { align: 'center' });
    normal(9);
    doc.text(`Batch  : ${batch.batchName} (${batch.batchCode})`, ml, 19);
    if (batch.section) doc.text(`Section : ${batch.section}`, ml, 24);
    if (batch.classNo)
      doc.text(`Class   : ${batch.classNo}`, ml, batch.section ? 29 : 24);
    bold(10);
    doc.text(`Month : ${monthLabel}`, pageW / 2, 19, { align: 'center' });
    normal(9);
    doc.text(`No. of Working Days : ${workingDays}`, pageW - mr, 19, {
      align: 'right',
    });
    doc.text(`Total Students      : ${rows.length}`, pageW - mr, 24, {
      align: 'right',
    });
    if (holidays.length) {
      doc.text(`Holidays : ${holidays.length}`, pageW - mr, 29, {
        align: 'right',
      });
    }
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(ml, 32, pageW - mr, 32);
    const srW = 6,
      idW = 22,
      nameW = 36,
      dayW = 5.5,
      pW = 8,
      aW = 8,
      pctW = 10;
    const remW = contentW - srW - idW - nameW - lastDay * dayW - pW - aW - pctW;
    const head: any[][] = [[]];
    head[0].push(
      {
        content: 'Sr',
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: srW },
      },
      {
        content: 'Adm No',
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: idW },
      },
      {
        content: 'Name',
        styles: { halign: 'left', fontStyle: 'bold', cellWidth: nameW },
      },
    );
    for (let d = 0; d < lastDay; d++) {
      const isHol = dayMeta[d].isHoliday;
      head[0].push({
        content: dayMeta[d].label,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          cellWidth: dayW,
          fontSize: 6,
          fillColor: isHol ? [255, 200, 0] : [41, 128, 185],
          textColor: isHol ? [80, 60, 0] : [255, 255, 255],
        },
      });
    }
    head[0].push(
      {
        content: 'P',
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: pW },
      },
      {
        content: 'A',
        styles: { halign: 'center', fontStyle: 'bold', cellWidth: aW },
      },
      {
        content: `% of\n${workingDays}d`,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          cellWidth: pctW,
          fontSize: 5.5,
        },
      },
      {
        content: 'Remarks',
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          cellWidth: remW > 5 ? remW : 12,
        },
      },
    );
    const body: any[][] = rows.map((row: any, idx: number) => {
      const cells: any[] = [
        { content: idx + 1, styles: { halign: 'center' } },
        {
          content: row.admissionNo,
          styles: { halign: 'center', fontSize: 5.5 },
        },
        { content: row.name, styles: { halign: 'left', fontSize: 6.5 } },
      ];
      for (const val of row.attendance || []) {
        const v = val || '';
        cells.push({
          content: v,
          styles: {
            halign: 'center',
            fontStyle: v && v !== 'H' ? 'bold' : 'normal',
            fontSize: v === 'H' ? 5.5 : 6.5,
            textColor:
              v === 'A'
                ? [220, 53, 69]
                : v === 'L'
                  ? [255, 153, 0]
                  : v === 'P'
                    ? [25, 135, 84]
                    : v === 'H'
                      ? [120, 90, 0]
                      : [210, 210, 210],
            fillColor:
              v === 'H'
                ? [255, 243, 180]
                : v === ''
                  ? [245, 245, 245]
                  : [255, 255, 255],
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
        {
          content: row.absentCount,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            textColor: [220, 53, 69],
          },
        },
        {
          content: `${row.percentage}%`,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            textColor: row.percentage >= 75 ? [25, 135, 84] : [220, 53, 69],
          },
        },
        { content: '', styles: { halign: 'left' } },
      );
      return cells;
    });
    const dayTotalsRow: any[] = [
      { content: '', styles: { fillColor: [230, 235, 255] } },
      { content: '', styles: { fillColor: [230, 235, 255] } },
      {
        content: 'Present',
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [230, 235, 255],
          fontSize: 6.5,
        },
      },
    ];
    for (let d = 0; d < lastDay; d++) {
      const isHol = dayMeta[d].isHoliday;
      if (isHol) {
        dayTotalsRow.push({
          content: 'H',
          styles: {
            halign: 'center',
            fontSize: 5.5,
            fillColor: [255, 243, 180],
            textColor: [120, 90, 0],
          },
        });
      } else {
        const cnt = rows.filter(
          (r: any) => r.attendance[d] === 'P' || r.attendance[d] === 'L',
        ).length;
        dayTotalsRow.push({
          content: cnt || '',
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fillColor: [230, 235, 255],
            fontSize: 6,
          },
        });
      }
    }
    const totalPresent = rows.reduce(
      (s: number, r: any) => s + (r.presentCount || 0),
      0,
    );
    const totalAbsent = rows.reduce(
      (s: number, r: any) => s + (r.absentCount || 0),
      0,
    );
    const avgPct = rows.length
      ? Math.round(
          rows.reduce((s: number, r: any) => s + (r.percentage || 0), 0) /
            rows.length,
        )
      : 0;
    dayTotalsRow.push(
      {
        content: totalPresent,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fillColor: [230, 235, 255],
          textColor: [25, 135, 84],
        },
      },
      {
        content: totalAbsent,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fillColor: [230, 235, 255],
          textColor: [220, 53, 69],
        },
      },
      {
        content: `${avgPct}%`,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fillColor: [230, 235, 255],
        },
      },
      { content: '', styles: { fillColor: [230, 235, 255] } },
    );
    body.push(dayTotalsRow);
    const dayPctRow: any[] = [
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      {
        content: 'Attendance %',
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [245, 245, 245],
          fontSize: 6,
        },
      },
    ];
    for (let d = 0; d < lastDay; d++) {
      const isHol = dayMeta[d].isHoliday;
      if (isHol) {
        dayPctRow.push({
          content: 'H',
          styles: {
            halign: 'center',
            fontSize: 5.5,
            fillColor: [255, 243, 180],
            textColor: [120, 90, 0],
          },
        });
      } else {
        const cnt = rows.filter(
          (r: any) => r.attendance[d] === 'P' || r.attendance[d] === 'L',
        ).length;
        const pct = rows.length > 0 ? Math.round((cnt / rows.length) * 100) : 0;
        dayPctRow.push({
          content: cnt > 0 ? `${pct}` : '',
          styles: {
            halign: 'center',
            fontSize: 5.5,
            fillColor: [245, 245, 245],
            textColor:
              pct >= 75
                ? [25, 135, 84]
                : pct > 0
                  ? [220, 53, 69]
                  : [180, 180, 180],
          },
        });
      }
    }
    dayPctRow.push(
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
    );
    body.push(dayPctRow);
    const blankRow = (label: string) => {
      const r: any[] = [
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        {
          content: label,
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fillColor: [255, 255, 255],
            fontSize: 6,
            textColor: [100, 100, 100],
          },
        },
      ];
      for (let d = 0; d < lastDay; d++)
        r.push({ content: '', styles: { fillColor: [255, 255, 255] } });
      r.push(
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
      );
      return r;
    };
    body.push(blankRow('Present (Morning)'));
    body.push(blankRow('Present (Afternoon)'));
    body.push(blankRow('Girls'));
    body.push(blankRow('Boys'));
    body.push(blankRow('Class Teacher Initial'));
    autoTable(doc, {
      startY: 34,
      head,
      body,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
        lineColor: [200, 200, 200],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 7,
        cellPadding: 1.5,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      margin: { left: ml, right: mr },
      didParseCell: (hookData: any) => {
        const li = rows.length;
        if (hookData.row.index === li)
          hookData.cell.styles.fillColor = [230, 235, 255];
        if (hookData.row.index === li + 1)
          hookData.cell.styles.fillColor = [245, 245, 245];
        if (hookData.row.index > li + 1)
          hookData.cell.styles.fillColor = [255, 255, 255];
      },
    });
    const finalY = (doc as any).lastAutoTable?.finalY || pageH - 40;
    const footY = Math.min(finalY + 8, pageH - 28);
    normal(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('No. on Roll at beginning of month : ___________', ml, footY);
    doc.text('No. on Roll at end of month        : ___________', ml, footY + 5);
    doc.text(
      'No. Admitted                        : ___________',
      ml,
      footY + 10,
    );
    doc.text(
      'No. Left with TC                    : ___________',
      ml,
      footY + 15,
    );
    const sigX = pageW - mr - 70;
    doc.line(sigX, footY + 8, sigX + 65, footY + 8);
    doc.text('Signature of Class Teacher', sigX, footY + 10);
    doc.line(sigX, footY + 16, sigX + 65, footY + 16);
    doc.text('Signature of Principal / Academic Coordinator', sigX, footY + 18);
    if (batch.classTeacherName) {
      normal(7);
      doc.setTextColor(60, 60, 60);
      doc.text(`(${batch.classTeacherName})`, sigX, footY + 12.5);
    }
    if (holidays.length) {
      normal(7);
      doc.setTextColor(100, 80, 0);
      const hText = holidays
        .map((h: any) => {
          const dn = new Date(h.date).getUTCDate();
          return `${dn} — ${h.name} (${h.type})`;
        })
        .join('   |   ');
      doc.text(`Holidays : ${hText}`, ml, footY + 17);
    }
    normal(7);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'P = Present   A = Absent   L = Late   H = Holiday/Week-off   (grey) = Not taken   % = of working days',
      pageW / 2,
      footY + 22,
      { align: 'center' },
    );
  }

  finaliseAttendance(batch: any): void {
    if (
      !confirm(
        `Finalise attendance for ${batch.batchName} on ${this.selectedDateLabel}? This cannot be undone.`,
      )
    )
      return;
    const tenantId = localStorage.getItem('tenantId');
    this.finalisingBatch = batch.batchCode;
    this.commonApi
      .fetchData(
        {
          entiId: tenantId,
          batchCode: batch.batchCode,
          date: this.selectedDate,
          userId: localStorage.getItem('userId'),
          finalisedByName: localStorage.getItem('userName') || '',
        },
        'batch',
        'school-attendance/finalise',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.finalisingBatch = null;
          if (res?.status) {
            this.alert.success(
              `Attendance finalised. ${res?.data?.emailsSent || 0} absence alert(s) sent.`,
            );
            this.finalisedSet.add(batch.batchCode);
          } else {
            this.alert.error(res?.message || 'Failed to finalise');
          }
        },
        error: (err: any) => {
          this.finalisingBatch = null;
          this.alert.error(err?.error?.message || 'Failed to finalise');
        },
      });
  }

  loadBatchStatusReport(): void {
    const tenantId = localStorage.getItem('tenantId');
    this.statusReportLoading = true;
    const payload: any = { entiId: tenantId };
    if (this.statusReportFrom) {
      const [y, m, d] = this.statusReportFrom.split('-').map(Number);
      payload.fromDate = Date.UTC(y, m - 1, d);
    }
    if (this.statusReportTo) {
      const [y, m, d] = this.statusReportTo.split('-').map(Number);
      payload.toDate = Date.UTC(y, m - 1, d);
    }
    this.commonApi
      .fetchData(payload, 'batch', 'school-attendance/batch-status-report')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.statusReportLoading = false;
          this.statusReport = res?.data || [];
          this.showStatusReport = true;
        },
        error: (err: any) => {
          this.statusReportLoading = false;
          this.alert.error(err?.error?.message || 'Failed to load report');
        },
      });
  }

  closeStatusReport(): void {
    this.showStatusReport = false;
    this.statusReport = [];
    this.statusReportFrom = '';
    this.statusReportTo = '';
  }

  getStatusBadgeClass(status: string): string {
    const map: any = {
      MARKED: 'bg-success-subtle text-success border-success-subtle',
      FINALISED: 'bg-primary-subtle text-primary border-primary-subtle',
      NOT_MARKED: 'bg-danger-subtle text-danger border-danger-subtle',
      HOLIDAY: 'bg-warning-subtle text-warning border-warning-subtle',
      WEEK_OFF: 'bg-warning-subtle text-warning border-warning-subtle',
      LEAVE: 'bg-secondary-subtle text-secondary border-secondary-subtle',
    };
    return map[status] || 'bg-secondary-subtle text-secondary';
  }

  getStatusIcon(status: string): string {
    const map: any = {
      MARKED: 'fa-circle-check',
      FINALISED: 'fa-lock',
      NOT_MARKED: 'fa-circle-xmark',
      HOLIDAY: 'fa-umbrella-beach',
      WEEK_OFF: 'fa-umbrella-beach',
      LEAVE: 'fa-calendar-minus',
    };
    return map[status] || 'fa-circle-question';
  }

  formatDayTooltip(day: any): string {
    const d = new Date(day.date);
    const dateStr = `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
    if (day.status === 'NOT_MARKED') return `${dateStr} — Not Marked`;
    if (['HOLIDAY', 'WEEK_OFF', 'LEAVE'].includes(day.status))
      return `${dateStr} — ${day.holidayName || day.status}`;
    const parts = [`${dateStr} — ${day.status}`];
    if (day.markedByName) parts.push(`By: ${day.markedByName}`);
    if (day.presentCount != null)
      parts.push(
        `P:${day.presentCount} A:${day.absentCount} L:${day.lateCount}`,
      );
    return parts.join(' | ');
  }

  exportStatusReportToExcel(): void {
    if (!this.statusReport.length) return;
    const rows: any[] = [];
    for (const b of this.statusReport) {
      for (const day of b.days) {
        const d = new Date(day.date);
        const dateStr = `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
        rows.push({
          'Batch Code': b.batchCode,
          'Batch Name': b.batchName,
          Class: b.classNo ? `Class ${b.classNo}` : '',
          Section: b.section || '',
          'Academic Year': b.academicYear || '',
          'Class Teacher': b.classTeacher?.name || '',
          Date: dateStr,
          Status: day.status,
          'Holiday Name': day.holidayName || '',
          'Marked By': day.markedByName || '',
          'Marked By Role': day.markedByRole || '',
          Finalised: day.isFinalised ? 'Yes' : 'No',
          'Finalised By': day.finalisedByName || '',
          'Total Students': day.totalStudents || 0,
          Present: day.presentCount || 0,
          Absent: day.absentCount || 0,
          Late: day.lateCount || 0,
          Remarks: day.remarks || '',
        });
      }
      rows.push({
        'Batch Code': b.batchCode,
        'Batch Name': `SUMMARY — ${b.batchName}`,
        Class: '',
        Section: '',
        'Academic Year': b.academicYear || '',
        'Class Teacher': b.classTeacher?.name || '',
        Date: '',
        Status: '',
        'Holiday Name': '',
        'Marked By': '',
        'Marked By Role': '',
        Finalised: '',
        'Finalised By': '',
        'Total Students': '',
        Present: '',
        Absent: '',
        Late: '',
        Remarks: `Total:${b.summary.totalDays} Marked:${b.summary.marked} Finalised:${b.summary.finalised} Not Marked:${b.summary.notMarked} Holiday:${b.summary.holiday}`,
      });
      rows.push({});
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
      { wch: 14 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Batch Status Report');
    const fromLabel = this.statusReportFrom || 'all';
    const toLabel = this.statusReportTo || 'all';
    XLSX.writeFile(
      wb,
      `Batch_Attendance_Report_${fromLabel}_to_${toLabel}.xlsx`,
    );
  }

  exportDailyStatusToExcel(
    type: 'all' | 'marked' | 'not_marked' | 'holiday' = 'all',
  ): void {
    const tenantId = localStorage.getItem('tenantId');
    this.commonApi
      .fetchData(
        {
          entiId: tenantId,
          fromDate: this.selectedDate,
          toDate: this.selectedDate,
        },
        'batch',
        'school-attendance/batch-status-report',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const allData: any[] = res?.data || [];
          let filtered = allData;
          if (type === 'marked')
            filtered = allData.filter((b) =>
              ['MARKED', 'FINALISED'].includes(b.days[0]?.status),
            );
          if (type === 'not_marked')
            filtered = allData.filter(
              (b) => b.days[0]?.status === 'NOT_MARKED',
            );
          if (type === 'holiday')
            filtered = allData.filter((b) =>
              ['HOLIDAY', 'WEEK_OFF', 'LEAVE'].includes(b.days[0]?.status),
            );
          if (!filtered.length) return;
          const rows = filtered.map((b: any) => {
            const day = b.days[0] || {};
            return {
              'Batch Code': b.batchCode,
              'Batch Name': b.batchName,
              Class: b.classNo ? `Class ${b.classNo}` : '',
              Section: b.section || '',
              'Class Teacher': b.classTeacher?.name || '',
              Status: day.status || 'NOT_MARKED',
              'Holiday Name': day.holidayName || '',
              'Marked By': day.markedByName || '',
              Finalised: day.isFinalised ? 'Yes' : 'No',
              'Finalised By': day.finalisedByName || '',
              'Total Students': day.totalStudents || 0,
              Present: day.presentCount || 0,
              Absent: day.absentCount || 0,
              Late: day.lateCount || 0,
            };
          });
          const ws = XLSX.utils.json_to_sheet(rows);
          ws['!cols'] = [
            { wch: 14 },
            { wch: 28 },
            { wch: 8 },
            { wch: 8 },
            { wch: 22 },
            { wch: 12 },
            { wch: 16 },
            { wch: 20 },
            { wch: 10 },
            { wch: 20 },
            { wch: 14 },
            { wch: 8 },
            { wch: 8 },
            { wch: 8 },
          ];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Attendance Status');
          XLSX.writeFile(
            wb,
            `School_Attendance_${type.toUpperCase()}_${this.selectedDateLabel.replace(/ /g, '_')}.xlsx`,
          );
        },
        error: () => {},
      });
  }
}
