import { Component } from '@angular/core';
import { BaseReportComponent } from '../../base-report.component';
import { ReportService, SubjectOption } from '../../report.service';
import { ReportExportService } from '../../report-export.service';
import { AlertService } from '../../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-assignment-report',
  standalone: false,
  templateUrl: './assignment-report.component.html',
  styles: ``,
})
export class AssignmentReportComponent extends BaseReportComponent {
  view: 'batch' | 'student' = 'batch';
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  selectedAdmissionNos: string[] = [];
  filterSubjectId = '';
  subjectOptions: SubjectOption[] = [];

  batchResults: any[] = [];
  studentResults: any[] = [];

  constructor(
    reportService: ReportService,
    exportService: ReportExportService,
    alert: AlertService,
  ) {
    super(reportService, exportService, alert);
  }

  protected override onInit(): void {
    this.reportService
      .loadAllSubjects()
      .subscribe((opts) => (this.subjectOptions = opts));
  }

  canGenerate(): boolean {
    if (!this.selectedBatchIds.length) return false;
    if (this.view === 'student' && !this.selectedAdmissionNos.length)
      return false;
    return true;
  }

  generate(): void {
    const payload: any = { batchIds: this.selectedBatchIds, view: this.view };
    if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
    if (this.view === 'student')
      payload.admissionNos = this.selectedAdmissionNos;
    this.reportService
      .generate('reports/batch', 'assignment-report', payload)
      .subscribe({
        next: (res: any) => {
          this.onSuccess(res);
          if (res.view === 'batch') {
            this.batchResults = res.batches || [];
            this.studentResults = [];
          } else {
            this.studentResults = res.students || [];
            this.batchResults = [];
          }
        },
        error: (err: any) => this.onError(err),
      });
  }

  onViewChange(v: 'batch' | 'student'): void {
    this.view = v;
    this.selectedAdmissionNos = [];
    this.batchResults = [];
    this.studentResults = [];
  }

  reset(): void {
    this.view = 'batch';
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.selectedAdmissionNos = [];
    this.filterSubjectId = '';
    this.batchResults = [];
    this.studentResults = [];
    this.dataLoaded = false;
    this.reportData = null;
    this.touched = false;
  }

  onBatchChange(event: { ids: string[]; codes: string[] }): void {
    this.selectedBatchIds = event.ids;
    this.selectedBatchCodes = event.codes;
  }

  onStudentChange(event: { admissionNos: string[] }): void {
    this.selectedAdmissionNos = event.admissionNos;
  }

  override get hasData(): boolean {
    return (
      this.dataLoaded &&
      (this.batchResults.length > 0 || this.studentResults.length > 0)
    );
  }

  exportExcel(): void {
    if (!this.hasData) return;
    const wb = XLSX.utils.book_new();
    if (this.view === 'batch') {
      for (const batch of this.batchResults) {
        const headers = [
          'S.No',
          'Enrollment No',
          'Student Name',
          ...batch.columns.map((c: any) => c.colLabel),
          'SGPA',
          'GSGPA',
        ];
        const keys = [
          'slNo',
          'admissionNo',
          'studentName',
          ...batch.columns.map((c: any) => c.colKey),
          'SGPA',
          'GSGPA',
        ];
        const allRows = [...batch.students, batch.batchAverage];
        const rows = allRows.map((row: any) =>
          keys.reduce((obj: any, key, idx) => {
            obj[headers[idx]] = row[key] ?? '';
            return obj;
          }, {}),
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          batch.batchCode.substring(0, 31),
        );
      }
    } else {
      for (const stu of this.studentResults) {
        const headers = [
          'Test Code',
          'Subject',
          'Topic',
          'Sub Topic',
          'Category',
          'Sub Category',
          'CGPA',
          'Status',
        ];
        const keys = [
          'testCode',
          'subjectName',
          'topicName',
          'subTopicName',
          'categoryName',
          'subCategoryName',
          'cgpa',
          'status',
        ];
        const rows = stu.tests.map((t: any) =>
          keys.reduce((obj: any, key, idx) => {
            obj[headers[idx]] = t[key] ?? '';
            return obj;
          }, {}),
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          (stu.admissionNo || stu.studentName || 'Student').substring(0, 31),
        );
      }
    }
    this.exportService.writeFile(wb, 'Assignment_Report.xlsx');
  }

  exportPdf(): void {
    if (!this.hasData) return;
    const doc = this.exportService.newPdf();
    if (this.view === 'batch') {
      let isFirst = true;
      for (const batch of this.batchResults) {
        if (!isFirst) doc.addPage();
        isFirst = false;
        const headers = [
          'S.No',
          'Enrollment No',
          'Student Name',
          ...batch.columns.map((c: any) => c.colLabel),
          'SGPA',
          'GSGPA',
        ];
        const keys = [
          'slNo',
          'admissionNo',
          'studentName',
          ...batch.columns.map((c: any) => c.colKey),
          'SGPA',
          'GSGPA',
        ];
        let y = this.exportService.addPdfHeader(doc, 'Assignment Report', [
          {
            label: 'Batch',
            value: `${batch.batchCode} - ${batch.batchName || ''}`,
          },
        ]);
        const allRows = [...batch.students, batch.batchAverage];
        const cols = headers.map((label: string, i: number) => ({
          key: keys[i],
          label,
        }));
        this.exportService.addTable(
          doc,
          cols,
          allRows,
          y,
          [59, 130, 246],
          [249, 250, 251],
          (data: any) => {
            if (
              data.section === 'body' &&
              data.row.index === allRows.length - 1
            ) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        );
      }
    } else {
      let isFirst = true;
      for (const stu of this.studentResults) {
        if (!isFirst) doc.addPage();
        isFirst = false;
        const cols = [
          { key: 'testCode', label: 'Test Code' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'topicName', label: 'Topic' },
          { key: 'subTopicName', label: 'Sub Topic' },
          { key: 'categoryName', label: 'Category' },
          { key: 'subCategoryName', label: 'Sub Category' },
          { key: 'cgpa', label: 'CGPA' },
          { key: 'status', label: 'Status' },
        ];
        let y = this.exportService.addPdfHeader(doc, 'Assignment Report', [
          {
            label: 'Student',
            value: `${stu.studentName} (${stu.admissionNo})`,
          },
          { label: 'Batch', value: stu.batchCode || '' },
        ]);
        this.exportService.addTable(doc, cols, stu.tests, y);
      }
    }
    this.exportService.savePdf(doc, 'Assignment_Report.pdf');
  }
}
