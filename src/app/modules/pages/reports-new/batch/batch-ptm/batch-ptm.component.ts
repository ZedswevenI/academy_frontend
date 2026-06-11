import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-ptm',
  standalone: false,
  templateUrl: './batch-ptm.component.html',
  styles: ``
})
export class BatchPtmComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  filterStatus = '';
  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'ptmDateFormatted', label: 'Date' },
    { key: 'venue', label: 'Venue' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'completed', label: 'Completed' },
    { key: 'noShow', label: 'No Show' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'prePtmSubmissionPct', label: 'Pre-PTM %' },
    { key: 'postPtmSubmissionPct', label: 'Post-PTM %' }
  ];

  constructor(reportService: ReportService, exportService: ReportExportService, alert: AlertService) {
    super(reportService, exportService, alert);
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  canGenerate(): boolean {
    // No required filters for PTM — batch and dates are optional
    return true;
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  generate(): void {
    const payload: any = {};
    if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);
    if (this.filterStatus) payload.status = this.filterStatus;

    this.reportService.generate('reports/batch', 'ptm', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.buildTable(res);
      },
      error: (err: any) => this.onError(err)
    });
  }

  private buildTable(res: any): void {
    this.rows = (res.sessions || []).map((s: any) => ({
      ...s,
      ptmDateFormatted: this.reportService.formatEpoch(s.ptmDate)
    }));
    this.summaryItems = this.reportService.buildSummaryItems(res.summary);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  reset(): void {
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.fromDate = '';
    this.toDate = '';
    this.filterStatus = '';
    this.rows = [];
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids;
    this.selectedBatchCodes = event.codes;
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'PTM Sessions');
    this.exportService.writeFile(wb, 'PTM_Sessions_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'PTM Sessions Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    y = this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'PTM_Sessions_Report.pdf');
  }
}
