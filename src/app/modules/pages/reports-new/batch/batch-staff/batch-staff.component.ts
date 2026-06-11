import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-staff',
  standalone: false,
  templateUrl: './batch-staff.component.html',
  styles: ``
})
export class BatchStaffComponent extends BaseReportComponent {
  selectedBatchIds: string[] = [];
  rows: any[] = [];

  readonly columns = [
    { key: 'slNo', label: '#' },
    { key: 'batchCode', label: 'Batch' },
    { key: 'staffName', label: 'Name' },
    { key: 'staffCode', label: 'Code' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'facultyType', label: 'Type' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' }
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
    this.reportService.generate('reports/batch', 'staff', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.currentStaff || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedBatchIds = [];
    this.rows = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids;
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Staff List');
    this.exportService.writeFile(wb, 'Staff_List_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Staff List Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Staff_List_Report.pdf');
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   batch-staff.component.html
──────────────────────────────────────────────────────────────────────────── */
const BATCH_STAFF_HTML = `
<div>
  <div class="filter-panel">
    <div class="row g-3 align-items-end">
      <div class="col-md-3">
        <app-batch-multiselect [options]="batchOptions" label="Batch" [optional]="true"
          (selectionChange)="onBatchChange($event)">
        </app-batch-multiselect>
      </div>
      <div class="col-md-4 d-flex gap-2 align-items-end">
        <button class="btn btn-create fs-16 fw-medium" [disabled]="loading" (click)="onGenerateClick()">
          <span *ngIf="!loading"><i class="fa-solid fa-play me-1"></i> Generate</span>
          <span *ngIf="loading"><span class="spinner-border spinner-border-sm me-1"></span> Loading...</span>
        </button>
        <button class="btn btn-outline-secondary btn-sm" *ngIf="rows.length" (click)="reset()">
          <i class="fa-solid fa-rotate-left me-1"></i> Reset
        </button>
      </div>
    </div>
  </div>
  <div *ngIf="loading" class="text-center py-5">
    <div class="spinner-border text-primary"></div>
    <p class="text-muted mt-2">Generating report...</p>
  </div>
  <div *ngIf="rows.length && !loading" class="d-flex gap-2 mb-3">
    <button class="btn btn-outline-danger btn-sm" (click)="exportPdf()">
      <i class="fa-solid fa-file-pdf me-1"></i> Export PDF
    </button>
    <button class="btn btn-export btn-sm" (click)="exportExcel()">
      <i class="fa-solid fa-file-excel me-1"></i> Export Excel
    </button>
  </div>
  <app-report-table [columns]="columns" [rows]="rows" [loading]="loading" [dataLoaded]="dataLoaded"
    emptyHint="No staff found for selected batches.">
  </app-report-table>
</div>
`;
