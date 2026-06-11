import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-students',
  standalone: false,
  templateUrl: './batch-students.component.html',
  styles: ``
})
export class BatchStudentsComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  filterStatus = 'ACTIVE';

  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  // Revealed columns for masking
  revealedColumns = new Set<string>();

  readonly maskedKeys = new Set(['phone', 'phone1', 'phone2', 'email', 'email1', 'email2', 'parentPhone']);

  get columns() {
    return [
      { key: 'slNo', label: '#' },
      ...(this.selectedBatchIds.length !== 1 ? [{ key: 'batchCode', label: 'Batch' }] : []),
      { key: 'admissionNo', label: 'Enrollment No' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone', masked: true },
      { key: 'phone1', label: 'Phone 1', masked: true },
      { key: 'phone2', label: 'Phone 2', masked: true },
      { key: 'email', label: 'Email', masked: true },
      { key: 'email1', label: 'Email 1', masked: true },
      { key: 'email2', label: 'Email 2', masked: true },
      { key: 'parentName', label: 'Parent' },
      { key: 'parentPhone', label: 'Parent Phone', masked: true },
      { key: 'status', label: 'Status' }
    ];
  }

  constructor(reportService: ReportService, exportService: ReportExportService, alert: AlertService) {
    super(reportService, exportService, alert);
  }

  canGenerate(): boolean {
    return true;
  }

  generate(): void {
    const payload: any = {};
    if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
    if (this.filterStatus) payload.status = this.filterStatus;

    this.reportService.generate('reports/batch', 'students', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
        this.summaryItems = [{ label: 'Total Students', value: res.count || 0 }];
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.filterStatus = 'ACTIVE';
    this.rows = [];
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
    this.revealedColumns = new Set();
  }

  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids;
    this.selectedBatchCodes = event.codes;
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Student List', this.revealedColumns, val => this.reportService.maskValue(val));
    this.exportService.writeFile(wb, 'Student_List_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Student List Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    // For PDF masking — apply mask based on revealed columns
    const pdfColumns = this.columns.map(c => ({ ...c }));
    const pdfRows = this.rows.map(row => {
      const r: any = { ...row };
      for (const key of this.maskedKeys) {
        if (r[key] && !this.revealedColumns.has(key)) {
          r[key] = this.reportService.maskValue(String(r[key]));
        }
      }
      return r;
    });
    this.exportService.addTable(doc, pdfColumns, pdfRows, y);
    this.exportService.savePdf(doc, 'Student_List_Report.pdf');
  }
}
