import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-teacher-exams',
  standalone: false,
  templateUrl: './teacher-exams.component.html',
  styles: ``
})
export class TeacherExamsComponent extends BaseReportComponent {
  selectedStaffId = '';
  selectedBatchIds: string[] = [];
  fromDate = '';
  toDate = '';
  rows: any[] = [];
  batchBreakdownRows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];
  showBatchBreakdown = false;

  readonly columns = [
    { key: 'examCode', label: 'Code' },
    { key: 'examName', label: 'Name' },
    { key: 'totalMarks', label: 'Marks' },
    { key: 'examStatus', label: 'Status' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'totalCompleted', label: 'Completed' },
    { key: 'overallCompletionPct', label: 'Completion %' },
    { key: 'batchCount', label: 'Batches' }
  ];

  readonly batchColumns = [{ key: 'examCode', label: 'Exam' }, { key: 'batchCode', label: 'Batch' }, { key: 'batchName', label: 'Batch Name' }, { key: 'totalStudents', label: 'Students' }, { key: 'completed', label: 'Completed' }, { key: 'completionPct', label: 'Completion %' }];

  constructor(rs: ReportService, es: ReportExportService, a: AlertService) {
    super(rs, es, a);
  }
  canGenerate(): boolean {
    return !!this.selectedStaffId;
  }

  generate(): void {
    const payload: any = { staffId: this.selectedStaffId };
    if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);
    this.reportService.generate('reports/teacher', 'exams', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any) => ({ ...r, batchCount: (r.batches || []).length }));
        this.batchBreakdownRows = (res.data || []).flatMap((r: any) =>
          (r.batches || []).map((b: any) => ({
            examName: r.examName,
            examCode: r.examCode,
            batchCode: b.batchCode,
            batchName: b.batchName,
            totalStudents: b.totalStudents,
            completed: b.completed,
            completionPct: b.completionPct
          }))
        );
        this.summaryItems = this.reportService.buildSummaryItems(res.summary);
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedStaffId = '';
    this.selectedBatchIds = [];
    this.fromDate = '';
    this.toDate = '';
    this.rows = [];
    this.batchBreakdownRows = [];
    this.summaryItems = [];
    this.showBatchBreakdown = false;
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[] }): void {
    this.selectedBatchIds = event.ids;
  }

  exportExcel(): void {
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Exams');
    if (this.batchBreakdownRows.length) this.exportService.appendSheet(wb, this.batchColumns, this.batchBreakdownRows, 'Batch Breakdown');
    this.exportService.writeFile(wb, 'Teacher_Exams_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Teacher Exams Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Teacher_Exams_Report.pdf');
  }
}
