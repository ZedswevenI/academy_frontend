import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-student-remarks',
  standalone: false,
  templateUrl: './student-remarks.component.html',
  styles: ``
})
export class StudentRemarksComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  selectedAdmissionNos: string[] = [];
  fromDate = '';
  toDate = '';
  filterType = '';
  filterStatus = '';
  rows: any[] = [];
  detailRows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];
  showDetail = false;
  isBulk = false;

  readonly summaryColumns = [{ key: 'admissionNo', label: 'Enrollment No' }, { key: 'studentName', label: 'Student' }, { key: 'batchLabel', label: 'Batch' }, { key: 'totalRemarks', label: 'Total Remarks' }];

  readonly singleColumns = [{ key: 'slNo', label: '#' }, { key: 'type', label: 'Type' }, { key: 'dateFormatted', label: 'Date' }, { key: 'remark', label: 'Remark' }, { key: 'status', label: 'Status' }];

  readonly detailColumns = [
    { key: 'admissionNo', label: 'Enrollment No' },
    { key: 'studentName', label: 'Student' },
    { key: 'batchLabel', label: 'Batch' },
    { key: 'type', label: 'Type' },
    { key: 'dateFormatted', label: 'Date' },
    { key: 'remark', label: 'Remark' },
    { key: 'status', label: 'Status' },
    { key: 'reportedByParent', label: 'Reported By Parent' }
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

  private buildBatchLabel(r: any): string {
    if (r?.batchName && r?.batchCode) return `${r.batchName} (${r.batchCode})`;
    return r?.batchName || r?.batchCode || '';
  }

  generate(): void {
    this.isBulk = this.selectedAdmissionNos.length !== 1;
    const payload: any = {};
    if (this.filterType) payload.type = this.filterType;
    if (this.filterStatus) payload.status = this.filterStatus;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);
    const endpoint = this.isBulk ? 'remarks-bulk' : 'remarks';
    if (this.isBulk) payload.admissionNos = this.selectedAdmissionNos;
    else payload.admissionNo = this.selectedAdmissionNos[0];
    this.reportService.generate('reports/student', endpoint, payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = this.isBulk
          ? (res.data || []).map((r: any) => ({ ...r, batchLabel: this.buildBatchLabel(r) }))
          : (res.data || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
        this.detailRows = (res.detail || []).map((r: any) => ({ ...r, batchLabel: this.buildBatchLabel(r) }));
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
    this.filterType = '';
    this.filterStatus = '';
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
    if (this.isBulk && this.detailRows.length) this.exportService.appendSheet(wb, this.detailColumns, this.detailRows, 'Remarks Detail');
    this.exportService.writeFile(wb, 'Student_Remarks_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Student Remarks Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.activeColumns, this.rows, y);
    this.exportService.savePdf(doc, 'Student_Remarks_Report.pdf');
  }
}
