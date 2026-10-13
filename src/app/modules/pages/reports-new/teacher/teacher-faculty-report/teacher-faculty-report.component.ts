import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService, ExportColumn } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-teacher-faculty-report',
  standalone: false,
  templateUrl: './teacher-faculty-report.component.html',
  styles: ``,
})
export class TeacherFacultyReportComponent extends BaseReportComponent {
  selectedStaffIds: string[] = [];
  fromDate = '';
  toDate = '';
  selectedSections: string[] = [];
  facultyReportData: any[] = [];
  get hasFacultyReportData(): boolean {
    return this.dataLoaded && this.facultyReportData.length > 0;
  }

  private batchLabel(r: any): string {
    return r?.batchName
      ? r?.batchCode
        ? `${r.batchName} (${r.batchCode})`
        : r.batchName
      : r?.batchCode || '—';
  }

  readonly sectionOptions = [
    { key: 'teaching', label: 'Teaching Hours', disabled: false },
    { key: 'invigilation', label: 'Invigilation Hours', disabled: true },
    { key: 'tasks', label: 'Tasks', disabled: false },
    { key: 'cancelled', label: 'Cancelled Periods', disabled: false },
    { key: 'replaced', label: 'Replaced Periods', disabled: false },
    { key: 'lateEntry', label: 'Late Entry', disabled: false },
    { key: 'earlyLeaving', label: 'Early Leaving', disabled: false },
    { key: 'attendanceMarked', label: 'Attendance Marked', disabled: false },
    {
      key: 'attendanceNotMarked',
      label: 'Attendance Not Marked',
      disabled: false,
    },
    {
      key: 'assignments',
      label: 'Assignment Enabled Per Batch',
      disabled: false,
    },
  ];

  readonly periodCols: ExportColumn[] = [
    { key: 'dateFormatted', label: 'Date' },
    { key: 'batchName', label: 'Batch' },
    { key: 'batchCode', label: 'Batch Code' },
    { key: 'subject', label: 'Subject' },
    { key: 'fromTime', label: 'From' },
    { key: 'endTime', label: 'To' },
    { key: 'hours', label: 'Hours' },
  ];

  constructor(
    reportService: ReportService,
    exportService: ReportExportService,
    alert: AlertService,
  ) {
    super(reportService, exportService, alert);
  }

  // ── Sections ───────────────────────────────────────────────────────────────
  get allSectionsSelected(): boolean {
    const active = this.sectionOptions.filter((s) => !s.disabled);
    return active.length > 0 && this.selectedSections.length === active.length;
  }

  isSectionSelected(key: string): boolean {
    return this.selectedSections.includes(key);
  }

  toggleSection(key: string, disabled: boolean): void {
    if (disabled) return;
    if (this.isSectionSelected(key))
      this.selectedSections = this.selectedSections.filter((s) => s !== key);
    else this.selectedSections = [...this.selectedSections, key];
  }

  toggleSelectAllSections(): void {
    const activeKeys = this.sectionOptions
      .filter((s) => !s.disabled)
      .map((s) => s.key);
    this.selectedSections = this.allSectionsSelected ? [] : activeKeys;
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  canGenerate(): boolean {
    return this.selectedSections.length > 0;
  }

  override get hasData(): boolean {
    return this.facultyReportData.length > 0;
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  generate(): void {
    const payload: any = { sections: this.selectedSections };
    if (this.selectedStaffIds.length) payload.staffIds = this.selectedStaffIds;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);

    this.reportService
      .generate('reports/teacher', 'faculty-report', payload)
      .subscribe({
        next: (res: any) => {
          this.onSuccess(res);
          this.facultyReportData = res.data || [];
        },
        error: (err: any) => this.onError(err),
      });
  }

  reset(): void {
    this.selectedStaffIds = [];
    this.fromDate = '';
    this.toDate = '';
    this.selectedSections = [];
    this.facultyReportData = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onStaffChange(ids: string[]): void {
    this.selectedStaffIds = ids;
  }

  // ── Export Excel ───────────────────────────────────────────────────────────
  exportExcel(): void {
    if (!this.facultyReportData.length) return;
    const wb = XLSX.utils.book_new();

    for (const staff of this.facultyReportData) {
      const sheetData: any[] = [];
      const addH = (t: string) => sheetData.push({ Section: t });
      const addEmpty = () => sheetData.push({});

      addH(
        `Staff: ${staff.staffName}${staff.staffCode ? ' (' + staff.staffCode + ')' : ''}`,
      );
      if (staff.centerName) addH(`Center: ${staff.centerName}`);
      addEmpty();

      // Summary
      if (staff.summary?.length) {
        addH('Summary');
        sheetData.push({
          'Nature of Work': 'Nature of Work',
          Particulars: 'Particulars',
        });
        staff.summary.forEach((r: any) =>
          sheetData.push({
            'Nature of Work': r.nature,
            Particulars: r.particulars,
          }),
        );
        addEmpty();
      }

      const addSection = (
        title: string,
        count: number,
        totalHours: string | null,
        cols: ExportColumn[],
        rows: any[],
      ) => {
        if (!rows?.length) return;
        addH(`${title} (${count}${totalHours ? ' | ' + totalHours : ''})`);
        const hr: any = {};
        cols.forEach((c) => (hr[c.label] = c.label));
        sheetData.push(hr);
        rows.forEach((row) => {
          const r: any = {};
          cols.forEach((c) => (r[c.label] = row[c.key] ?? ''));
          sheetData.push(r);
        });
        addEmpty();
      };

      addSection(
        'Teaching Hours',
        staff.teaching?.count || 0,
        staff.teaching?.totalHours || null,
        this.periodCols,
        staff.teaching?.periods,
      );
      addSection(
        'Cancelled Periods',
        staff.cancelled?.count || 0,
        staff.cancelled?.totalHours || null,
        [...this.periodCols, { key: 'note', label: 'Note' }],
        staff.cancelled?.periods,
      );
      addSection(
        'Replacement Periods',
        staff.replaced?.count || 0,
        staff.replaced?.totalHours || null,
        this.periodCols,
        staff.replaced?.periods,
      );
      addSection(
        'Tasks',
        staff.tasks?.count || 0,
        null,
        [
          { key: 'taskName', label: 'Task Name' },
          { key: 'dueDateFormatted', label: 'Due Date' },
          { key: 'status', label: 'Status' },
          { key: 'isDelayed', label: 'Delayed' },
          { key: 'daysOverdue', label: 'Days Overdue' },
          { key: 'remarks', label: 'Remarks' },
        ],
        staff.tasks?.tasks,
      );
      addSection(
        'Late Entry',
        staff.lateEntry?.count || 0,
        null,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' },
          { key: 'reason', label: 'Reason' },
        ],
        (staff.lateEntry?.entries || []).map((e: any) => ({ ...e, batchLabel: this.batchLabel(e) })),
      );
      addSection(
        'Early Leaving',
        staff.earlyLeaving?.count || 0,
        null,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'earlyByMinutes', label: 'Early By (min)' },
          { key: 'reason', label: 'Reason' },
        ],
        (staff.earlyLeaving?.entries || []).map((e: any) => ({ ...e, batchLabel: this.batchLabel(e) })),
      );
      addSection(
        'Attendance Marked',
        staff.attendanceMarked?.count || 0,
        null,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'subject', label: 'Subject' },
          { key: 'presentCount', label: 'Present' },
          { key: 'absentCount', label: 'Absent' },
          { key: 'lateCount', label: 'Late' },
          { key: 'total', label: 'Total' },
        ],
        (staff.attendanceMarked?.periods || []).map((p: any) => ({ ...p, batchLabel: this.batchLabel(p) })),
      );
      addSection(
        'Attendance Not Marked',
        staff.attendanceNotMarked?.count || 0,
        null,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'subject', label: 'Subject' },
        ],
        (staff.attendanceNotMarked?.periods || []).map((p: any) => ({ ...p, batchLabel: this.batchLabel(p) })),
      );
      addSection(
        'Assignment Enabled Per Batch',
        staff.assignments?.count || 0,
        null,
        [
          { key: 'batchCode', label: 'Batch' },
          { key: 'batchName', label: 'Batch Name' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'topicName', label: 'Topic' },
          { key: 'testCount', label: 'No. of Tests' },
          { key: 'enabledAtFormatted', label: 'Enabled On' },
          { key: 'totalStudents', label: 'Students' },
        ],
        staff.assignments?.rows,
      );

      const sheetName = (
        staff.staffCode || staff.staffName.substring(0, 10)
      ).substring(0, 31);
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(sheetData, { skipHeader: true }),
        sheetName,
      );
    }

    this.exportService.writeFile(wb, 'Faculty_Report.xlsx');
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────
  exportPdf(): void {
    if (!this.facultyReportData.length) return;
    const doc = this.exportService.newPdf();
    let isFirst = true;

    for (const staff of this.facultyReportData) {
      if (!isFirst) doc.addPage();
      isFirst = false;

      const pageWidth = doc.internal.pageSize.getWidth();
      const dateRangeStr =
        this.fromDate && this.toDate
          ? `(${new Date(this.fromDate).toLocaleDateString('en-IN')} - ${new Date(this.toDate).toLocaleDateString('en-IN')})`
          : '';

      let y = this.exportService.addPdfHeader(doc, 'Faculty Report', []);
      if (dateRangeStr) {
        doc.setFontSize(9);
        doc.text(dateRangeStr, pageWidth / 2, y - 4, { align: 'center' });
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${staff.staffName}${staff.staffCode ? ' (' + staff.staffCode + ')' : ''}`,
        14,
        y,
      );
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (staff.staffId) {
        doc.text(`Staff ID: ${staff.staffId}`, 14, y);
        y += 5;
      }
      if (staff.centerName) {
        doc.text(`Center: ${staff.centerName}`, 14, y);
        y += 5;
      }
      y += 2;

      // Summary table
      if (staff.summary?.length) {
        y = this.exportService.checkNewPage(doc, y);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, y);
        y += 4;
        y = this.exportService.addTable(
          doc,
          [
            { key: 'nature', label: 'Nature of Work' },
            { key: 'particulars', label: 'Particulars' },
          ],
          staff.summary,
          y,
          this.exportService.rgb(30, 64, 175),
          this.exportService.rgb(239, 246, 255),
        );
      }

      const addSection = (
        title: string,
        countLabel: string,
        cols: ExportColumn[],
        rows: any[],
        hColor: [number, number, number],
        altColor: [number, number, number],
      ) => {
        if (!rows?.length) return;
        y = this.exportService.checkNewPage(doc, y);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(countLabel, 14, y);
        y += 4;
        y = this.exportService.addSectionHeading(doc, title, y, hColor);
        y = this.exportService.addTable(doc, cols, rows, y, hColor, altColor);
      };

      addSection(
        'Teaching Hours',
        `Teaching Hours: ${staff.teaching?.totalHours || '-'} | ${staff.teaching?.count || 0} periods`,
        this.periodCols,
        staff.teaching?.periods,
        this.exportService.rgb(59, 130, 246),
        this.exportService.rgb(239, 246, 255),
      );
      addSection(
        'Cancelled Periods',
        `Cancelled Periods: ${staff.cancelled?.count || 0}`,
        [...this.periodCols, { key: 'note', label: 'Note' }],
        staff.cancelled?.periods,
        this.exportService.rgb(220, 38, 38),
        this.exportService.rgb(254, 242, 242),
      );
      addSection(
        'Replacement Periods',
        `Replacement Periods: ${staff.replaced?.count || 0}`,
        this.periodCols,
        staff.replaced?.periods,
        this.exportService.rgb(22, 163, 74),
        this.exportService.rgb(240, 253, 244),
      );
      addSection(
        'Tasks',
        `Tasks: ${staff.tasks?.count || 0}`,
        [
          { key: 'taskName', label: 'Task' },
          { key: 'dueDateFormatted', label: 'Due Date' },
          { key: 'status', label: 'Status' },
          { key: 'isDelayed', label: 'Delayed' },
          { key: 'daysOverdue', label: 'Overdue' },
        ],
        staff.tasks?.tasks,
        this.exportService.rgb(124, 58, 237),
        this.exportService.rgb(245, 243, 255),
      );
      addSection(
        'Late Entry',
        `Late Entries: ${staff.lateEntry?.count || 0}`,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' },
          { key: 'reason', label: 'Reason' },
        ],
        (staff.lateEntry?.entries || []).map((e: any) => ({ ...e, batchLabel: this.batchLabel(e) })),
        this.exportService.rgb(234, 88, 12),
        this.exportService.rgb(255, 247, 237),
      );
      addSection(
        'Early Leaving',
        `Early Leaving: ${staff.earlyLeaving?.count || 0}`,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'earlyByMinutes', label: 'Early (min)' },
          { key: 'reason', label: 'Reason' },
        ],
        (staff.earlyLeaving?.entries || []).map((e: any) => ({ ...e, batchLabel: this.batchLabel(e) })),
        this.exportService.rgb(234, 88, 12),
        this.exportService.rgb(255, 247, 237),
      );
      addSection(
        'Attendance Marked',
        `Attendance Marked: ${staff.attendanceMarked?.count || 0}`,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'subject', label: 'Subject' },
          { key: 'presentCount', label: 'Present' },
          { key: 'absentCount', label: 'Absent' },
          { key: 'total', label: 'Total' },
        ],
        (staff.attendanceMarked?.periods || []).map((p: any) => ({ ...p, batchLabel: this.batchLabel(p) })),
        this.exportService.rgb(20, 184, 166),
        this.exportService.rgb(240, 253, 250),
      );
      addSection(
        'Attendance Not Marked',
        `Not Marked: ${staff.attendanceNotMarked?.count || 0}`,
        [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'subject', label: 'Subject' },
        ],
        (staff.attendanceNotMarked?.periods || []).map((p: any) => ({ ...p, batchLabel: this.batchLabel(p) })),
        this.exportService.rgb(245, 158, 11),
        this.exportService.rgb(255, 251, 235),
      );
      addSection(
        'Assignment Enabled Per Batch',
        `Assignments: ${staff.assignments?.count || 0}`,
        [
          { key: 'batchLabel', label: 'Batch' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'topicName', label: 'Topic' },
          { key: 'testCount', label: 'Tests' },
          { key: 'enabledAtFormatted', label: 'Enabled On' },
          { key: 'totalStudents', label: 'Students' },
        ],
        (staff.assignments?.rows || []).map((r: any) => ({ ...r, batchLabel: this.batchLabel(r) })),
        this.exportService.rgb(99, 102, 241),
        this.exportService.rgb(238, 242, 255),
      );

      // Remarks + signature
      y = this.exportService.addRemarksAndSignature(doc, y);
    }

    this.exportService.savePdf(doc, 'Faculty_Report.pdf');
  }
}
