import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-teacher-attendance',
  standalone: false,
  templateUrl: './teacher-attendance.component.html',
  styles: ``
})
export class TeacherAttendanceComponent extends BaseReportComponent {
  selectedStaffId = '';
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  rows: any[] = [];
  periodDetailRows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];
  showPeriodDetail = false;

  readonly columns = [{ key: 'dateFormatted', label: 'Date' }, { key: 'day', label: 'Day' }, { key: 'totalPeriods', label: 'Total Periods' }, { key: 'markedCount', label: 'Marked' }, { key: 'notMarkedCount', label: 'Not Marked' }];

  readonly periodColumns = [
    { key: 'dateFormatted', label: 'Date' },
    { key: 'batchLabel', label: 'Batch' },
    { key: 'periodNo', label: 'Period' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'startTime', label: 'Start' },
    { key: 'isMarked', label: 'Marked' },
    { key: 'presentCount', label: 'Present' },
    { key: 'absentCount', label: 'Absent' }
  ];

  constructor(rs: ReportService, es: ReportExportService, a: AlertService) {
    super(rs, es, a);
  }
  canGenerate(): boolean {
    return !!this.selectedStaffId && !!this.fromDate && !!this.toDate;
  }

  generate(): void {
    const payload: any = { staffId: this.selectedStaffId };
    if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
    payload.fromDate = this.toEpoch(this.fromDate);
    payload.toDate = this.toEpoch(this.toDate);
    this.reportService.generate('reports/teacher', 'attendance', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = res.data || [];
        this.periodDetailRows = (res.data || []).flatMap((d: any) =>
          (d.periods || []).map((p: any) => ({
            dateFormatted: d.dateFormatted,
            day: d.day,
            batchCode: p.batchCode,
            batchLabel: this.reportService.formatBatchLabel(p.batchName, p.batchCode),
            periodNo: p.periodNo,
            subjectName: p.subjectName,
            startTime: p.startTime,
            isMarked: p.isMarked,
            presentCount: p.presentCount,
            absentCount: p.absentCount
          }))
        );
        this.summaryItems = this.reportService.buildSummaryItems(res.summary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedStaffId = '';
    this.selectedBatchCodes = [];
    this.fromDate = '';
    this.toDate = '';
    this.rows = [];
    this.periodDetailRows = [];
    this.summaryItems = [];
    this.showPeriodDetail = false;
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { codes: string[] }): void {
    this.selectedBatchCodes = event.codes;
  }

  exportExcel(): void {
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Summary');
    if (this.periodDetailRows.length) this.exportService.appendSheet(wb, this.periodColumns, this.periodDetailRows, 'Period Detail');
    this.exportService.writeFile(wb, 'Teacher_Attendance_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Teacher Attendance Report', [{ label: 'From', value: this.fromDate }, { label: 'To', value: this.toDate }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Teacher_Attendance_Report.pdf');
  }
}
