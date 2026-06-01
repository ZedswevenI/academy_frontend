import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-teacher-tasks',
  standalone: false,
  templateUrl: './teacher-tasks.component.html',
  styles: ``
})
export class TeacherTasksComponent extends BaseReportComponent {
  selectedStaffId = '';
  fromDate = '';
  toDate = '';
  filterStatus = '';
  rows: any[] = [];
  summaryItems: { label: string; value: any }[] = [];

  readonly columns = [{ key: 'slNo', label: '#' }, { key: 'taskName', label: 'Task' }, { key: 'dueDateFormatted', label: 'Due Date' }, { key: 'status', label: 'Status' }, { key: 'isDelayed', label: 'Delayed' }, { key: 'daysOverdue', label: 'Overdue Days' }, { key: 'remarks', label: 'Remarks' }];

  constructor(rs: ReportService, es: ReportExportService, a: AlertService) {
    super(rs, es, a);
  }
  canGenerate(): boolean {
    return !!this.selectedStaffId;
  }

  generate(): void {
    const payload: any = { staffId: this.selectedStaffId };
    if (this.filterStatus) payload.status = this.filterStatus;
    if (this.fromDate) payload.fromDate = this.toEpoch(this.fromDate);
    if (this.toDate) payload.toDate = this.toEpoch(this.toDate);
    this.reportService.generate('reports/teacher', 'tasks', payload).subscribe({
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
    this.fromDate = '';
    this.toDate = '';
    this.filterStatus = '';
    this.rows = [];
    this.summaryItems = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  exportExcel(): void {
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Tasks');
    this.exportService.writeFile(wb, 'Teacher_Tasks_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Teacher Tasks Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Teacher_Tasks_Report.pdf');
  }
}
