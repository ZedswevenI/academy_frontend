import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-feedback',
  standalone: false,
  templateUrl: './batch-feedback.component.html',
  styles: ``
})
export class BatchFeedbackComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  rows: any[] = [];
  staffSummaryRows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];
  showStaffSummary = false;

  readonly columns = [{ key: 'admissionNo', label: 'Admission No' }, { key: 'studentName', label: 'Student' }, { key: 'status', label: 'Status' }, { key: 'ptmDateFormatted', label: 'PTM Date' }, { key: 'staffFeedbackCount', label: 'Feedbacks' }];

  readonly staffColumns = [{ key: 'staffName', label: 'Staff' }, { key: 'subjectName', label: 'Subject' }, { key: 'remarksCount', label: 'Remarks' }, { key: 'studentsCovered', label: 'Students Covered' }];

  constructor(reportService: ReportService, exportService: ReportExportService, alert: AlertService) {
    super(reportService, exportService, alert);
  }

  canGenerate(): boolean {
    return true;
  }

  generate(): void {
    const payload: any = {};
    if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);

    this.reportService.generate('reports/batch', 'feedback', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any) => ({
          ...r,
          ptmDateFormatted: this.reportService.formatEpoch(r.ptmDate)
        }));
        this.staffSummaryRows = res.staffSummary || [];
        this.summaryItems = this.reportService.buildSummaryItems(res.batchSummary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.fromDate = '';
    this.toDate = '';
    this.rows = [];
    this.staffSummaryRows = [];
    this.summaryItems = [];
    this.showStaffSummary = false;
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids;
    this.selectedBatchCodes = event.codes;
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'PTM Feedback');
    if (this.staffSummaryRows.length) {
      this.exportService.appendSheet(wb, this.staffColumns, this.staffSummaryRows, 'Staff Summary');
    }
    this.exportService.writeFile(wb, 'PTM_Feedback_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'PTM Feedback Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    y = this.exportService.addTable(doc, this.columns, this.rows, y);
    if (this.staffSummaryRows.length) {
      y = this.exportService.addSectionHeading(doc, 'Staff Summary', y);
      this.exportService.addTable(doc, this.staffColumns, this.staffSummaryRows, y, [22, 163, 74], [240, 253, 244]);
    }
    this.exportService.savePdf(doc, 'PTM_Feedback_Report.pdf');
  }
}
