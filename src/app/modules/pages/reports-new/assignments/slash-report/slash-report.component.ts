import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService, SubjectOption } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-slash-report',
  standalone: false,
  templateUrl: './slash-report.component.html',
  styles: ``
})
export class SlashReportComponent  extends BaseReportComponent {

  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  filterSubjectId = '';
  selectedTopicIds: string[] = [];

  subjectOptions: SubjectOption[] = [];
  topicOptions: any[] = [];
  topicsLoading = false;

  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'batchCode',   label: 'Batch' },
    { key: 'admissionNo', label: 'Enrollment No' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'topicName',   label: 'Topic' },
    { key: 'report',      label: 'Available/Completed/Not Completed' }
  ];

  constructor(reportService: ReportService, exportService: ReportExportService, alert: AlertService) {
    super(reportService, exportService, alert);
  }

  protected override onInit(): void {
    this.reportService.loadAllSubjects().subscribe(opts => this.subjectOptions = opts);
  }

  canGenerate(): boolean { return this.selectedBatchIds.length > 0; }

  generate(): void {
    const payload: any = { batchIds: this.selectedBatchIds };
    if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
    if (this.selectedTopicIds.length) payload.topicIds = this.selectedTopicIds;
    this.reportService.generate('reports/batch', 'slash-detail', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = res.data || [];
        this.summaryItems = this.reportService.buildSummaryItems(res.summary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedBatchIds = []; this.selectedBatchCodes = [];
    this.filterSubjectId = ''; this.selectedTopicIds = [];
    this.topicOptions = []; this.rows = []; this.summaryItems = [];
    this.dataLoaded = false; this.reportData = null; this.touched = false;
  }

  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids; this.selectedBatchCodes = event.codes;
  }

  onSubjectChange(subjectId: string): void {
    this.filterSubjectId = subjectId; this.selectedTopicIds = []; this.topicOptions = [];
    if (subjectId && this.selectedBatchIds.length) {
      this.topicsLoading = true;
      this.reportService.loadTopics(subjectId).subscribe({
        next: (opts) => { this.topicOptions = opts; this.topicsLoading = false; },
        error: () => this.topicsLoading = false
      });
    }
  }

  isTopicSelected(id: string): boolean { return this.selectedTopicIds.includes(id); }

  toggleTopic(id: string): void {
    if (this.isTopicSelected(id)) this.selectedTopicIds = this.selectedTopicIds.filter(t => t !== id);
    else this.selectedTopicIds = [...this.selectedTopicIds, id];
  }

  toggleAllTopics(): void {
    if (this.selectedTopicIds.length === this.topicOptions.length) this.selectedTopicIds = [];
    else this.selectedTopicIds = this.topicOptions.map(t => t.value);
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheetsByGroup(wb, this.columns, this.rows, 'batchCode', 'batchName');
    this.exportService.writeFile(wb, 'Slash_Report.xlsx');
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
      if (!isFirst) doc.addPage(); isFirst = false;
      const batchName = batchRows[0]?.batchName || '';
      let y = this.exportService.addPdfHeader(doc, 'Slash Report', [
        { label: 'Batch', value: `${bc}${batchName ? ' - ' + batchName : ''}` }
      ]);
      this.exportService.addTable(doc, this.columns, batchRows, y);
    }
    this.exportService.savePdf(doc, 'Slash_Report.pdf');
  }
}