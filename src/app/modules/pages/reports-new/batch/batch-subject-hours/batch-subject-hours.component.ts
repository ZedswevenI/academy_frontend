import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService, SubjectOption } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-batch-subject-hours',
  standalone: false,
  templateUrl: './batch-subject-hours.component.html',
  styles: ``
})
export class BatchSubjectHoursComponent extends BaseReportComponent {

  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  fromDate = '';
  toDate = '';
  filterSubjectId = '';

  subjectOptions: SubjectOption[] = [];
  subjectsLoading = false;

  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'batchCode',      label: 'Batch' },
    { key: 'batchName',      label: 'Batch Name' },
    { key: 'subjectName',    label: 'Subject' },
    { key: 'phaseName',      label: 'Phase' },
    { key: 'estHours',       label: 'Est Hours' },
    { key: 'allottedHours',  label: 'Allotted Hours' },
    { key: 'balanceHours',   label: 'Balance Hours' }
  ];

  constructor(reportService: ReportService, exportService: ReportExportService, alert: AlertService) {
    super(reportService, exportService, alert);
  }

  canGenerate(): boolean { return true; }

  generate(): void {
    const payload: any = {};
    if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
    if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);

    this.reportService.generate('reports/batch', 'subject-hours', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any) => ({
          ...r,
          estHours: this.reportService.formatHours(r.estHours),
          allottedHours: this.reportService.formatHours(r.allottedHours),
          balanceHours: this.reportService.formatHours(r.balanceHours)
        }));
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
    if (event.codes.length) {
      this.subjectsLoading = true;
      this.reportService.loadSubjectsByBatches(event.codes).subscribe({
        next: (opts) => { this.subjectOptions = opts; this.subjectsLoading = false; },
        error: () => this.subjectsLoading = false
      });
    }
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = XLSX.utils.book_new();
    const batchGroups = new Map<string, any[]>();
    for (const row of this.rows) {
      const bc = row.batchCode || 'Unknown';
      if (!batchGroups.has(bc)) batchGroups.set(bc, []);
      batchGroups.get(bc)!.push(row);
    }
    for (const [bc, batchRows] of batchGroups.entries()) {
      this.exportService.appendSheet(wb, this.columns, batchRows, bc.substring(0, 31));
    }
    this.exportService.writeFile(wb, 'Subject_Hours_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const doc = this.exportService.newPdf();
    const batchGroups = new Map<string, any[]>();
    for (const row of this.rows) {
      const bc = row.batchCode || 'Unknown';
      if (!batchGroups.has(bc)) batchGroups.set(bc, []);
      batchGroups.get(bc)!.push(row);
    }
    let isFirst = true;
    for (const [bc, batchRows] of batchGroups.entries()) {
      if (!isFirst) doc.addPage();
      isFirst = false;
      const batchName = batchRows[0]?.batchName || '';
      let y = this.exportService.addPdfHeader(doc, 'Subject Hours Report', [
        { label: 'Batch', value: `${bc}${batchName ? ' - ' + batchName : ''}` },
        { label: 'Generated', value: new Date().toLocaleDateString('en-IN') }
      ]);
      this.exportService.addTable(doc, this.columns, batchRows, y,
        [59, 130, 246], [249, 250, 251],
        (data: any) => {
          if (data.section === 'body') {
            const row = batchRows[data.row.index];
            if (row?.phaseName === 'Unassigned') {
              data.cell.styles.textColor = [156, 163, 175];
              data.cell.styles.fontStyle = 'italic';
            }
          }
        }
      );
    }
    this.exportService.savePdf(doc, 'Subject_Hours_Report.pdf');
  }
}