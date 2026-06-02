import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-student-late-entries',
  standalone: false,
  templateUrl: './student-late-entries.component.html',
  styles: ``
})
export class StudentLateEntriesComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  selectedAdmissionNos: string[] = [];
  fromDate = '';
  toDate = '';
  filterEntryType = '';
  rows: any[] = [];
  detailRows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];
  showDetail = false;
  isBulk = false;

  readonly summaryColumns = [
    { key: 'admissionNo', label: 'Enrollment No' },
    { key: 'studentName', label: 'Student' },
    { key: 'batchCode', label: 'Batch' },
    { key: 'totalEntries', label: 'Total Entries' },
    { key: 'lateCount', label: 'Late' },
    { key: 'earlyCount', label: 'Early Leave' },
    { key: 'totalDelayMinutes', label: 'Total Delay (min)' }
  ];

  readonly singleColumns = [{ key: 'slNo', label: '#' }, { key: 'entryType', label: 'Type' }, { key: 'dateFormatted', label: 'Date' }, { key: 'periodNo', label: 'Period' }, { key: 'delayMinutes', label: 'Delay (min)' }, { key: 'reason', label: 'Reason' }];

  readonly detailColumns = [
    { key: 'admissionNo', label: 'Enrollment No' },
    { key: 'studentName', label: 'Student' },
    { key: 'batchCode', label: 'Batch' },
    { key: 'entryType', label: 'Type' },
    { key: 'dateFormatted', label: 'Date' },
    { key: 'periodNo', label: 'Period' },
    { key: 'delayMinutes', label: 'Delay (min)' },
    { key: 'reason', label: 'Reason' }
  ];

  get activeColumns() {
    return this.isBulk ? this.summaryColumns : this.singleColumns;
  }

  constructor(rs: ReportService, es: ReportExportService, a: AlertService) {
    super(rs, es, a);
  }
  canGenerate(): boolean {
    return this.selectedAdmissionNos.length > 0;
  }

  generate(): void {
    this.isBulk = this.selectedAdmissionNos.length !== 1;
    const payload: any = {};
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);
    if (this.filterEntryType) payload.entryType = this.filterEntryType;
    const endpoint = this.isBulk ? 'late-entries-bulk' : 'late-entries';
    if (this.isBulk) payload.admissionNos = this.selectedAdmissionNos;
    else payload.admissionNo = this.selectedAdmissionNos[0];
    this.reportService.generate('reports/student', endpoint, payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = this.isBulk ? res.data || [] : (res.data || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
        this.detailRows = res.detail || [];
        this.summaryItems = this.reportService.buildSummaryItems(res.summary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.selectedAdmissionNos = [];
    this.fromDate = '';
    this.toDate = '';
    this.filterEntryType = '';
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
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.activeColumns, this.rows, 'Summary');
    if (this.isBulk && this.detailRows.length) this.exportService.appendSheet(wb, this.detailColumns, this.detailRows, 'Late Entries Detail');
    this.exportService.writeFile(wb, 'Student_Late_Entries_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Student Late Entries Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.activeColumns, this.rows, y);
    this.exportService.savePdf(doc, 'Student_Late_Entries_Report.pdf');
  }
}
