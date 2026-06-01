import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-teacher-assignments',
  standalone: false,
  templateUrl: './teacher-assignments.component.html',
  styles: ``
})
export class TeacherAssignmentsComponent extends BaseReportComponent {
  selectedStaffId = '';
  selectedBatchIds: string[] = [];
  fromDate = '';
  toDate = '';
  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [
    { key: 'slNo', label: '#' },
    { key: 'batchCode', label: 'Batch' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'enabledAtFormatted', label: 'Enabled On' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'completed', label: 'Completed' },
    { key: 'completionPct', label: 'Completion %' }
  ];

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
    this.reportService.generate('reports/teacher', 'assignments', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = (res.data || []).map((r: any, i: number) => ({ slNo: i + 1, ...r }));
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
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[] }): void {
    this.selectedBatchIds = event.ids;
  }

  exportExcel(): void {
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Assignments');
    this.exportService.writeFile(wb, 'Teacher_Assignments_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Teacher Assignments Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Teacher_Assignments_Report.pdf');
  }
}
