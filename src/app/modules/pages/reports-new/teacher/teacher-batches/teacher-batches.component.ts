import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';

@Component({
  selector: 'app-teacher-batches',
  standalone: false,
  templateUrl: './teacher-batches.component.html',
  styles: ``
})
export class TeacherBatchesComponent extends BaseReportComponent {
  selectedStaffId = '';
  filterStatus = '';
  rows: any[] = [];

  readonly columns = [
    { key: 'batchCode', label: 'Batch Code' },
    { key: 'batchName', label: 'Batch' },
    { key: 'programName', label: 'Program' },
    { key: 'subjectName', label: 'Subject' },
    { key: 'academicYear', label: 'Year' },
    { key: 'studentCount', label: 'Students' },
    { key: 'isClassTeacher', label: 'Class Teacher' },
    { key: 'status', label: 'Status' }
  ];

  constructor(rs: ReportService, es: ReportExportService, a: AlertService) {
    super(rs, es, a);
  }

  canGenerate(): boolean {
    return !!this.selectedStaffId;
  }

  generate(): void {
    const payload: any = { staffId: this.selectedStaffId };
    if (this.filterStatus) payload.status = this.filterStatus;
    this.reportService.generate('reports/teacher', 'batches', payload).subscribe({
      next: (res: any) => {
        this.onSuccess(res);
        this.rows = res.data || [];
      },
      error: (err: any) => this.onError(err)
    });
  }

  reset(): void {
    this.selectedStaffId = '';
    this.filterStatus = '';
    this.rows = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  exportExcel(): void {
    const wb = this.exportService.newWorkbook();
    this.exportService.appendSheet(wb, this.columns, this.rows, 'Teacher Batches');
    this.exportService.writeFile(wb, 'Teacher_Batches_Report.xlsx');
  }

  exportPdf(): void {
    const doc = this.exportService.newPdf();
    let y = this.exportService.addPdfHeader(doc, 'Teacher Batches Report', [{ label: 'Generated', value: new Date().toLocaleDateString('en-IN') }]);
    this.exportService.addTable(doc, this.columns, this.rows, y);
    this.exportService.savePdf(doc, 'Teacher_Batches_Report.pdf');
  }
}
