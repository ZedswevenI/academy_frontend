import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-teacher-feedback',
  standalone: false,
  templateUrl: './teacher-feedback.component.html',
  styles: ``
})
export class TeacherFeedbackComponent extends BaseReportComponent {
  selectedStaffId = '';
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  rows: any[] = [];
  remarksRows: any[] = [];
  showRemarks = false;

  readonly columns = [{ key: 'admissionNo', label: 'Enrollment No' }, { key: 'studentName', label: 'Student' }, { key: 'batchCode', label: 'Batch' }, { key: 'ptmDateFormatted', label: 'PTM Date' }, { key: 'ptmStatus', label: 'Status' }, { key: 'remarksCount', label: 'Remarks' }];

  readonly remarksColumns = [{ key: 'admissionNo', label: 'Enrollment No' }, { key: 'studentName', label: 'Student' }, { key: 'subjectName', label: 'Subject' }, { key: 'remarks', label: 'Remarks' }, { key: 'submittedAt', label: 'Submitted At' }];

  constructor(rs: ReportService, es: ReportExportService, a: AlertService) {
    super(rs, es, a);
  }
  canGenerate(): boolean {
    return !!this.selectedStaffId;
  }

  generate(): void {
    const payload: any = { staffId: this.selectedStaffId };
    if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);
    this.reportService.generate('reports/teacher', 'feedback', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any) => ({
          ...r,
          ptmDateFormatted: r.ptmDateFormatted || this.reportService.formatEpoch(r.ptmDate),
          remarksCount: (r.myRemarks || []).length
        }));
        this.remarksRows = (res.data || []).flatMap((r: any) =>
          (r.myRemarks || []).map((rm: any) => ({
            admissionNo: r.admissionNo,
            studentName: r.studentName,
            subjectName: rm.subjectName,
            remarks: rm.remarks,
            submittedAt: rm.submittedAt ? this.reportService.formatEpoch(rm.submittedAt) : '-'
          }))
        );
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
    this.remarksRows = [];
    this.showRemarks = false;
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { codes: string[] }): void {
    this.selectedBatchCodes = event.codes;
  }

  exportExcel(): void {
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'PTM Feedback');
    if (this.remarksRows.length) this.exportService.appendSheet(wb, this.remarksColumns, this.remarksRows, 'Remarks Detail');
    this.exportService.writeFile(wb, 'Teacher_PTM_Feedback_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Teacher PTM Feedback Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Teacher_PTM_Feedback_Report.pdf');
  }
}
