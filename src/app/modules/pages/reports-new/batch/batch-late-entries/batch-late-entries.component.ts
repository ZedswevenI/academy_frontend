import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-late-entries',
  standalone: false,
  templateUrl: './batch-late-entries.component.html',
  styles: ``
})
export class BatchLateEntriesComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  filterType = ''; // STAFF | STUDENT
  filterEntryType = ''; // LATE | EARLY_LEAVE

  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'slNo', label: '#' },
    { key: 'personName', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'entryType', label: 'Entry Type' },
    { key: 'dateFormatted', label: 'Date' },
    { key: 'periodNo', label: 'Period' },
    { key: 'delayMinutes', label: 'Delay (min)' },
    { key: 'reason', label: 'Reason' }
  ];

  constructor(reportService: ReportService, exportService: ReportExportService, alert: AlertService) {
    super(reportService, exportService, alert);
  }

  canGenerate(): boolean {
    return !!this.fromDate && !!this.toDate;
  }

  generate(): void {
    const payload: any = {};
    if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
    payload.fromDate = this.toEpoch(this.fromDate);
    payload.toDate = this.toEpoch(this.toDate);
    if (this.filterType) payload.type = this.filterType;
    if (this.filterEntryType) payload.entryType = this.filterEntryType;

    this.reportService.generate('reports/batch', 'late-entries', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
        this.summaryItems = this.reportService.buildSummaryItems(res.summary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.fromDate = '';
    this.toDate = '';
    this.filterType = '';
    this.filterEntryType = '';
    this.rows = [];
    this.summaryItems = [];
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
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Late Entries');
    this.exportService.writeFile(wb, 'Batch_Late_Entries_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Batch Late Entries Report', [{ label: 'From', value: this.fromDate }, { label: 'To', value: this.toDate }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Batch_Late_Entries_Report.pdf');
  }
}
