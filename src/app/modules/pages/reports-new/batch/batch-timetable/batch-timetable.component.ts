// batch-timetable.component.ts
import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService, SubjectOption } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-timetable',
  standalone: false,
  templateUrl: './batch-timetable.component.html',
  styles: ``
})
export class BatchTimetableComponent extends BaseReportComponent {
  // ── Filters ────────────────────────────────────────────────────────────────
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  filterSubjectId = '';
  filterMode = '';

  subjectOptions: SubjectOption[] = [];
  subjectsLoading = false;

  // ── Table ──────────────────────────────────────────────────────────────────
  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'dateFormatted', label: 'Date' },
    { key: 'day', label: 'Day' },
    { key: 'batchLabel', label: 'Batch' },
    { key: 'periodNo', label: 'Period' },
    { key: 'periodType', label: 'Type' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'facultyName', label: 'Faculty' },
    { key: 'startTime', label: 'Start' },
    { key: 'endTime', label: 'End' },
    { key: 'venue', label: 'Venue' },
    { key: 'topic', label: 'Topic' }
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
    if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
    if (this.filterMode) payload.mode = this.filterMode;

    this.reportService.generate('reports/batch', 'timetable', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        const ttRows: any[] = [];
        (res.data || []).forEach((d: any) => {
          (d.periods || []).filter((p: any) => !p.isCancelled).forEach((p: any) => {
            ttRows.push({
              dateFormatted: this.reportService.formatEpoch(d.date),
              day: d.day,
              batchCode: d.batchCode || '-',
              batchLabel: this.reportService.formatBatchLabel(d.batchName, d.batchCode),
              ...p
            });
          });
        });
        this.rows = ttRows;
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
    this.filterSubjectId = '';
    this.filterMode = '';
    this.subjectOptions = [];
    this.rows = [];
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids;
    this.selectedBatchCodes = event.codes;
    this.filterSubjectId = '';
    this.subjectOptions = [];
    // Load subjects filtered by selected batches
    if (event.codes.length) {
      this.subjectsLoading = true;
      this.reportService.loadSubjectsByBatches(event.codes).subscribe({
        next: opts => {
          this.subjectOptions = opts;
          this.subjectsLoading = false;
        },
        error: () => (this.subjectsLoading = false)
      });
    }
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Timetable');
    this.exportService.writeFile(wb, 'Timetable_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Timetable Report', [{ label: 'From', value: this.fromDate }, { label: 'To', value: this.toDate }, { label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Timetable_Report.pdf');
  }
}
