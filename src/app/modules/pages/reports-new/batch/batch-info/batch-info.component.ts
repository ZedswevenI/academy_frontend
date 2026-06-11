import { Component, OnInit } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-batch-info',
  standalone: false,
  templateUrl: './batch-info.component.html',
  styles: ``
})
export class BatchInfoComponent  extends BaseReportComponent implements OnInit {

  // ── Filters ────────────────────────────────────────────────────────────────
  selectedProgramIds: string[] = [];
  selectedCenterIds: string[] = [];
  filterStatus = '';

  programOptions: any[] = [];
  centerOptions: any[] = [];

  // ── Table ──────────────────────────────────────────────────────────────────
  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'slNo',             label: '#' },
    { key: 'batchCode',        label: 'Batch Code' },
    { key: 'batchName',        label: 'Batch Name' },
    { key: 'programName',      label: 'Program' },
    { key: 'centerName',       label: 'Center' },
    { key: 'academicYear',     label: 'Year' },
    { key: 'studentCount',     label: 'Students' },
    { key: 'staffCount',       label: 'Staff' },
    { key: 'classTeacherName', label: 'Class Teacher' },
    { key: 'status',           label: 'Status' }
  ];

  constructor(
    reportService: ReportService,
    exportService: ReportExportService,
    alert: AlertService
  ) {
    super(reportService, exportService, alert);
  }

  protected override onInit(): void {
    this.reportService.loadPrograms().subscribe(opts => this.programOptions = opts);
    this.reportService.loadCenters().subscribe(opts => this.centerOptions = opts);
  }

  canGenerate(): boolean { return true; }

  generate(): void {
    const payload: any = {};
    if (this.selectedProgramIds.length) payload.programIds = this.selectedProgramIds;
    if (this.selectedCenterIds.length) payload.centerIds = this.selectedCenterIds;
    if (this.filterStatus) payload.status = this.filterStatus;

    this.reportService.generate('reports/batch', 'batch-info', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
        this.summaryItems = this.reportService.buildSummaryItems(res.summary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedProgramIds = [];
    this.selectedCenterIds = [];
    this.filterStatus = '';
    this.rows = [];
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Batch Details');
    this.exportService.writeFile(wb, 'Batch_Details_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Batch Details Report', [
      { label: 'Generated', value: new Date().toLocaleDateString('en-IN') }
    ]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Batch_Details_Report.pdf');
  }
}