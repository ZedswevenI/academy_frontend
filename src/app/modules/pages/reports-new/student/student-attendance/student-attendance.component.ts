import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-student-attendance',
  standalone: false,
  templateUrl: './student-attendance.component.html',
  styles: ``,
})
export class StudentAttendanceComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  selectedAdmissionNos: string[] = [];
  fromDate = '';
  toDate = '';
  rows: any[] = [];
  detailRows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];
  showDetail = false;
  isBulk = false;

  readonly summaryColumns = [
    { key: 'admissionNo', label: 'Enrollment No' },
    { key: 'studentName', label: 'Student' },
    { key: 'batchCode', label: 'Batch' },
    { key: 'totalPeriods', label: 'Total Periods' },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'late', label: 'Late' },
    { key: 'attendancePct', label: 'Attendance %' },
  ];

  readonly singleColumns = [
    { key: 'dateFormatted', label: 'Date' },
    { key: 'periodNo', label: 'Period' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'topicTaught', label: 'Topic' },
  ];

  readonly detailColumns = [
    { key: 'admissionNo', label: 'Enrollment No' },
    { key: 'studentName', label: 'Student' },
    { key: 'batchCode', label: 'Batch' },
    { key: 'dateFormatted', label: 'Date' },
    { key: 'periodNo', label: 'Period' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'topicTaught', label: 'Topic' },
  ];

  get activeColumns() {
    return this.isBulk ? this.summaryColumns : this.singleColumns;
  }

  constructor(
    reportService: ReportService,
    exportService: ReportExportService,
    alert: AlertService,
  ) {
    super(reportService, exportService, alert);
  }

  canGenerate(): boolean {
    return this.selectedAdmissionNos.length > 0;
  }

  generate(): void {
    this.isBulk = this.selectedAdmissionNos.length !== 1;
    const payload: any = {};
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);
    const endpoint = this.isBulk ? 'attendance-bulk' : 'attendance';
    if (this.isBulk) payload.admissionNos = this.selectedAdmissionNos;
    else payload.admissionNo = this.selectedAdmissionNos[0];
    this.reportService
      .generate('reports/student', endpoint, payload)
      .subscribe({
        next: (res: any) => {
          this.onSuccess(res);
          if (this.isBulk) {
            this.rows = res.data || [];
            this.detailRows = res.detail || [];
            this.summaryItems = this.reportService.buildSummaryItems(
              res.summary,
            );
          } else {
            this.rows = res?.periodAttendance?.detail || [];
            this.summaryItems = [
              {
                label: 'Period Total',
                value: res?.periodAttendance?.total || 0,
              },
              {
                label: 'Period Present',
                value: res?.periodAttendance?.present || 0,
              },
              {
                label: 'Period Absent',
                value: res?.periodAttendance?.absent || 0,
              },
              {
                label: 'Period Present %',
                value: (res?.periodAttendance?.presentPct || 0) + '%',
              },
              {
                label: 'School Total',
                value: res?.schoolAttendance?.total || 0,
              },
              {
                label: 'School Present',
                value: res?.schoolAttendance?.present || 0,
              },
              {
                label: 'School Present %',
                value: (res?.schoolAttendance?.presentPct || 0) + '%',
              },
            ];
          }
        },
        error: (err: any) => this.onError(err),
      });
  }

  reset(): void {
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.selectedAdmissionNos = [];
    this.fromDate = '';
    this.toDate = '';
    this.rows = [];
    this.detailRows = [];
    this.summaryItems = [];
    this.showDetail = false;
    this.isBulk = false;
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids;
    this.selectedBatchCodes = event.codes;
  }

  onStudentChange(event: { ids: string[]; admissionNos: string[] }): void {
    this.selectedAdmissionNos = event.admissionNos;
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(
      wb,
      this.activeColumns,
      this.rows,
      'Summary',
    );
    if (this.isBulk && this.detailRows.length) {
      this.exportService.appendSheet(
        wb,
        this.detailColumns,
        this.detailRows,
        'Period Detail',
      );
    }
    this.exportService.writeFile(wb, 'Student_Attendance_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Student Attendance Report', [
      { label: 'Generated', value: new Date().toLocaleDateString('en-IN') },
    ]);
    this.exportService.addTable(doc, this.activeColumns, this.rows, y);
    this.exportService.savePdf(doc, 'Student_Attendance_Report.pdf');
  }
}
