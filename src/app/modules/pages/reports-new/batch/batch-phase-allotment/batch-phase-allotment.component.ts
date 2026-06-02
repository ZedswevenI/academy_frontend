import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService, SubjectOption, BatchOption } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-batch-phase-allotment',
  standalone: false,
  templateUrl: './batch-phase-allotment.component.html',
  styles: ``
})
export class BatchPhaseAllotmentComponent extends BaseReportComponent {

  // ── Filters ────────────────────────────────────────────────────────────────
  selectedProgramIds: string[] = [];
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  filterSubjectId = '';

  programOptions: any[] = [];
  filteredBatchOptions: BatchOption[] = [];   // filtered by program
  subjectOptions: SubjectOption[] = [];
  subjectsLoading = false;

  // ── Table ──────────────────────────────────────────────────────────────────
  rows: any[] = [];

  get columns() {
    return [
      ...(this.selectedBatchIds.length !== 1 ? [
        { key: 'batchCode', label: 'Batch Code' },
        { key: 'batchName', label: 'Batch Name' }
      ] : []),
      { key: 'subjectName',    label: 'Subject' },
      { key: 'phaseName',      label: 'Phase' },
      { key: 'estHours',       label: 'Est Hours' },
      { key: 'allottedHours',  label: 'Allotted Hours' },
      { key: 'remainingHours', label: 'Remaining Hours' },
      { key: 'progressPct',    label: 'Progress %' }
    ];
  }

  constructor(
    reportService: ReportService,
    exportService: ReportExportService,
    alert: AlertService
  ) {
    super(reportService, exportService, alert);
  }

  protected override onInit(): void {
    this.reportService.loadPrograms().subscribe(opts => this.programOptions = opts);
    // Init filtered batch options with all batches
    this.batchOptions$.subscribe(opts => this.filteredBatchOptions = opts);
  }

  // Expose batchOptions$ as property for template
  get batchOptions$() { return this.reportService.batchOptions$; }

  canGenerate(): boolean { return true; }

  generate(): void {
    const payload: any = {};
    if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
    if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
    if (this.selectedProgramIds.length) payload.programIds = this.selectedProgramIds;

    this.reportService.generate('reports/batch', 'phase-allotment', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.buildTable(res.data || []);
      },
      error: (err: any) => this.onError(err)
    });
  }

  private buildTable(data: any[]): void {
    const phaseRows: any[] = [];
    data.forEach((r: any) => {
      const phases = (r.phases || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      if (!phases.length) {
        phaseRows.push({
          batchCode: r.batchCode, batchName: r.batchName,
          subjectName: r.subjectName, phaseName: '-',
          estHours: this.reportService.formatHours(r.totalEstHours),
          allottedHours: this.reportService.formatHours(r.totalAllottedHours),
          remainingHours: this.reportService.formatHours(r.totalRemainingHours),
          progressPct: r.overallProgressPct !== null ? r.overallProgressPct + '%' : '-'
        });
      } else {
        phases.forEach((ph: any) => {
          phaseRows.push({
            batchCode: r.batchCode, batchName: r.batchName,
            subjectName: r.subjectName, phaseName: ph.phaseName,
            estHours: this.reportService.formatHours(ph.estHours),
            allottedHours: this.reportService.formatHours(ph.allottedHours),
            remainingHours: this.reportService.formatHours(ph.remainingHours),
            progressPct: ph.progressPct !== null ? ph.progressPct + '%' : '-'
          });
        });
      }
    });
    this.rows = phaseRows;
  }

  reset(): void {
    this.selectedProgramIds = [];
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.filterSubjectId = '';
    this.subjectOptions = [];
    this.rows = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
    this.filteredBatchOptions = this.reportService.batchOptions;
  }

  onProgramChange(programIds: string[]): void {
    this.selectedProgramIds = programIds;
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.filterSubjectId = '';
    this.subjectOptions = [];
    this.filteredBatchOptions = this.reportService.getBatchesByPrograms(programIds);
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
      this.exportService.appendSheet(
        wb, this.columns, batchRows,
        bc.substring(0, 31)
      );
    }
    this.exportService.writeFile(wb, 'Phase_Allotment_Report.xlsx');
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
      let y = this.exportService.addPdfHeader(doc, 'Phase Allotment Report', [
        { label: 'Batch', value: `${bc}${batchName ? ' - ' + batchName : ''}` },
        { label: 'Generated', value: new Date().toLocaleDateString('en-IN') }
      ]);
      this.exportService.addTable(doc, this.columns, batchRows, y,
        [59, 130, 246], [249, 250, 251],
        (data: any) => {
          if (data.section === 'body' && batchRows[data.row.index]?.phaseName === 'Unassigned') {
            data.cell.styles.textColor = [156, 163, 175];
            data.cell.styles.fontStyle = 'italic';
          }
        }
      );
    }
    this.exportService.savePdf(doc, 'Phase_Allotment_Report.pdf');
  }
}