import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-exams',
  standalone: false,
  templateUrl: './batch-exams.component.html',
  styles: ``
})
export class BatchExamsComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'examCode', label: 'Code' },
    { key: 'examName', label: 'Name' },
    { key: 'totalMarks', label: 'Marks' },
    { key: 'duration', label: 'Duration (min)' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'completed', label: 'Completed' },
    { key: 'started', label: 'Started' },
    { key: 'absent', label: 'Absent' },
    { key: 'completionPct', label: 'Completion %' },
    { key: 'examStatus', label: 'Status' }
  ];

  constructor(reportService: ReportService, exportService: ReportExportService, alert: AlertService) {
    super(reportService, exportService, alert);
  }

  canGenerate(): boolean {
    return true;
  }

  generate(): void {
    const payload: any = {};
    if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
    this.reportService.generate('reports/batch', 'exams', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = res.data || [];
        this.summaryItems = this.reportService.buildSummaryItems(res.summary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedBatchIds = [];
    this.rows = [];
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[] }): void {
    this.selectedBatchIds = event.ids;
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Exams');
    this.exportService.writeFile(wb, 'Batch_Exams_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Batch Exams Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Batch_Exams_Report.pdf');
  }
}
