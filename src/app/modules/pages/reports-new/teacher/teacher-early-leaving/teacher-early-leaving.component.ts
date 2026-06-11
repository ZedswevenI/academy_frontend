import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-teacher-early-leaving',
  standalone: false,
  templateUrl: './teacher-early-leaving.component.html',
  styles: ``
})
export class TeacherEarlyLeavingComponent extends BaseReportComponent {
  selectedStaffId = '';
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [{ key: 'slNo', label: '#' }, { key: 'dateFormatted', label: 'Date' }, { key: 'batchCode', label: 'Batch' }, { key: 'periodNo', label: 'Period' }, { key: 'earlyByMinutes', label: 'Early By (min)' }, { key: 'reason', label: 'Reason' }];

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
    this.reportService.generate('reports/teacher', 'early-leaving', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
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
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { codes: string[] }): void {
    this.selectedBatchCodes = event.codes;
  }

  exportExcel(): void {
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Early Leaving');
    this.exportService.writeFile(wb, 'Teacher_Early_Leaving_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Teacher Early Leaving Report', [{ label: 'From', value: this.fromDate }, { label: 'To', value: this.toDate }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Teacher_Early_Leaving_Report.pdf');
  }
}
