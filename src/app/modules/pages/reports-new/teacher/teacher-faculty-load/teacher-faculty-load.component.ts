import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService, ExportColumn } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-teacher-faculty-load',
  standalone: false,
  templateUrl: './teacher-faculty-load.component.html',
  styles: ``
})
export class TeacherFacultyLoadComponent  extends BaseReportComponent {

  // ── Filters ────────────────────────────────────────────────────────────────
  selectedStaffIds: string[] = [];
  selectedCenterIds: string[] = [];
  fromDate = '';
  toDate = '';

  centerOptions: any[] = [];

  // ── Data ───────────────────────────────────────────────────────────────────
  facultyLoadData: any[] = [];

  readonly periodColumns: ExportColumn[] = [
    { key: 'dateFormatted', label: 'Date' },
    { key: 'batchName',     label: 'Batch Name' },
    { key: 'batchCode',     label: 'Batch Code' },
    { key: 'fromTime',      label: 'From Time' },
    { key: 'endTime',       label: 'End Time' },
    { key: 'hours',         label: 'Hours' }
  ];

  constructor(
    reportService: ReportService,
    exportService: ReportExportService,
    alert: AlertService
  ) {
    super(reportService, exportService, alert);
  }

  protected override onInit(): void {
    this.reportService.loadCenters().subscribe(opts => this.centerOptions = opts);
  }

  canGenerate(): boolean { return true; }

  generate(): void {
    const payload: any = {};
    if (this.selectedStaffIds.length) payload.staffIds = this.selectedStaffIds;
    if (this.selectedCenterIds.length) payload.centerIds = this.selectedCenterIds;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);

    this.reportService.generate('reports/teacher', 'load', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.facultyLoadData = res.data || [];
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedStaffIds = [];
    this.selectedCenterIds = [];
    this.fromDate = '';
    this.toDate = '';
    this.facultyLoadData = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onStaffChange(ids: string[]): void { this.selectedStaffIds = ids; }

  override get hasData(): boolean { return this.facultyLoadData.length > 0; }

  exportExcel(): void {
    if (!this.facultyLoadData.length) return;
    const wb = XLSX.utils.book_new();

    for (const staff of this.facultyLoadData) {
      for (const subject of staff.subjects || []) {
        const sheetData: any[] = [];
        const add = (text: string) => sheetData.push({ Date: text });

        add(`Staff: ${staff.staffName}${staff.staffCode ? ' (' + staff.staffCode + ')' : ''}`);
        add(`Subject: ${subject.subjectName}`);
        add(`Total Scheduled Hours: ${subject.totalScheduledHours}`);
        sheetData.push({});

        const addSection = (title: string, periods: any[]) => {
          if (!periods?.length) return;
          add(`--- ${title} ---`);
          const headerRow: any = {};
          this.periodColumns.forEach(c => headerRow[c.label] = c.label);
          sheetData.push(headerRow);
          for (const p of periods) {
            const r: any = {};
            this.periodColumns.forEach(c => r[c.label] = p[c.key] ?? '');
            sheetData.push(r);
          }
          sheetData.push({});
        };

        addSection('Scheduled Periods', subject.scheduledPeriods);
        addSection('Cancelled / Replaced Periods', subject.cancelledPeriods);
        addSection('Additional (Replacement) Periods', subject.replacedPeriods);

        const sheetName = `${staff.staffCode || staff.staffName.substring(0, 5)}_${subject.subjectName.substring(0, 15)}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData, { skipHeader: true }), sheetName);
      }
    }

    this.exportService.writeFile(wb, 'Faculty_Load_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.facultyLoadData.length) return;
    const doc = this.exportService.newPdf();
    let isFirst = true;

    for (const staff of this.facultyLoadData) {
      for (const subject of staff.subjects || []) {
        if (!isFirst) doc.addPage();
        isFirst = false;

        let y = this.exportService.addPdfHeader(doc, 'Faculty Load Report', [
          { label: 'Staff', value: `${staff.staffName}${staff.staffCode ? ' (' + staff.staffCode + ')' : ''}` },
          { label: 'Subject', value: subject.subjectName },
          { label: 'Total Hours', value: subject.totalScheduledHours },
          { label: 'Generated', value: new Date().toLocaleDateString('en-IN') }
        ]);

        if (subject.scheduledPeriods?.length) {
          y = this.exportService.addSectionHeading(doc, 'Scheduled Periods', y, [59, 130, 246]);
          y = this.exportService.addTable(doc, this.periodColumns, subject.scheduledPeriods, y, [59, 130, 246], [249, 250, 251]);
        }
        if (subject.cancelledPeriods?.length) {
          y = this.exportService.checkNewPage(doc, y);
          y = this.exportService.addSectionHeading(doc, 'Cancelled / Replaced Periods', y, [220, 38, 38]);
          y = this.exportService.addTable(doc, this.periodColumns, subject.cancelledPeriods, y, [220, 38, 38], [254, 242, 242]);
        }
        if (subject.replacedPeriods?.length) {
          y = this.exportService.checkNewPage(doc, y);
          y = this.exportService.addSectionHeading(doc, 'Additional (Replacement) Periods', y, [22, 163, 74]);
          this.exportService.addTable(doc, this.periodColumns, subject.replacedPeriods, y, [22, 163, 74], [240, 253, 244]);
        }
      }
    }

    this.exportService.savePdf(doc, 'Faculty_Load_Report.pdf');
  }
}