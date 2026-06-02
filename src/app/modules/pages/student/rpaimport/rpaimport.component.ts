import { Component, EventEmitter, Output } from '@angular/core';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

type ImportRow = { admissionNo: string; studentRpa: string };
type ImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  matched: number;
  unmatched: number;
  updated: number;
};

@Component({
  selector: 'app-rpaimport',
  standalone: false,
  templateUrl: './rpaimport.component.html',
  styleUrl: './rpaimport.component.scss',
})
export class RpaimportComponent {
  tenantId = localStorage.getItem('tenantId') || '';
  fileName = '';
  parseLoading = false;
  parsedRows: ImportRow[] = [];
  parseErrors: string[] = [];
  selectedFile: File | null = null;
  submitting = false;
  summary: ImportSummary | null = null;
  unmatchedList: { admissionNo: string; studentRpa: string; reason: string }[] =
    [];
  step: 'upload' | 'preview' | 'done' = 'upload';

  @Output() imported = new EventEmitter<void>();

  constructor(
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {}

  reset(): void {
    this.fileName = '';
    this.parseLoading = false;
    this.parsedRows = [];
    this.parseErrors = [];
    this.selectedFile = null;
    this.submitting = false;
    this.summary = null;
    this.unmatchedList = [];
    this.step = 'upload';
  }

  downloadSample(): void {
    const wb = XLSX.utils.book_new();
    const data = [
      { 'Enrollment No': '9020642590040', 'Student RPA': 'AIR2000' },
      { 'Enrollment No': '9020642590041', 'Student RPA': 'AIR8520S' },
      { 'Enrollment No': '9020642590042', 'Student RPA': 'AIR8965230' },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data),
      'RPA Import',
    );
    XLSX.writeFile(wb, 'rpa_import_sample.xlsx');
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.parsedRows = [];
    this.parseErrors = [];
    this.selectedFile = null;
    this.fileName = '';
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      this.alert.error('Only .xlsx or .xls files allowed');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.selectedFile = file;
    this.fileName = file.name;
    this.parseLoading = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), {
          type: 'array',
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
        const errors: string[] = [];
        const rows: ImportRow[] = [];
        const seen = new Set<string>();
        if (!raw.length) {
          errors.push('File is empty');
        }
        raw.forEach((r, idx) => {
          const rowNo = idx + 2;
          const admissionNo = String(
            r['Admission No'] ||
            r['EnrollmentNo'] ||
            r['enrollmentno'] ||
            r['enrollment no'] ||
            r['Enrollment No'] ||
            r['EnrollmentNo'] ||
              r['admissionNo'] ||
              r['ADMISSION NO'] ||
              r['admission_no'] ||
              '',
          ).trim();
          const studentRpa = String(
            r['RPA ID'] ||
            r['student Rpa'] ||
            r['studentRPA'] ||
            r['student RPA'] ||
            r['Student RPA'] ||
              r['studentRpa'] ||
              r['RPA Id'] ||
              r['rpaId'] ||
              r['RPA_ID'] ||
              '',
          ).trim();
          if (!admissionNo && !studentRpa) return;
          if (!admissionNo) {
            errors.push(`Row ${rowNo}: Admission No is empty`);
            return;
          }
          if (!studentRpa) {
            errors.push(`Row ${rowNo} (${admissionNo}): RPA ID is empty`);
            return;
          }
          if (seen.has(admissionNo.toLowerCase())) {
            errors.push(
              `Row ${rowNo}: Duplicate Admission No "${admissionNo}"`,
            );
            return;
          }
          seen.add(admissionNo.toLowerCase());
          rows.push({ admissionNo, studentRpa });
        });
        this.parsedRows = rows;
        this.parseErrors = errors;
        this.parseLoading = false;
        if (errors.length) {
          this.alert.error(`${errors.length} validation error(s) found`);
        } else if (rows.length) {
          this.step = 'preview';
        }
      } catch {
        this.alert.error('Failed to parse Excel file');
        this.selectedFile = null;
        this.fileName = '';
        this.parseLoading = false;
        (event.target as HTMLInputElement).value = '';
      }
    };
    reader.onerror = () => {
      this.alert.error('Failed to read file');
      this.parseLoading = false;
    };
    reader.readAsArrayBuffer(file);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.parsedRows = [];
    this.parseErrors = [];
    this.step = 'upload';
  }

  submit(): void {
    if (!this.parsedRows.length || this.parseErrors.length) return;
    this.submitting = true;
    this.commonApi
      .fetchData(
        { entiId: this.tenantId, rows: this.parsedRows },
        'student',
        'rpa-import',
      )
      .subscribe({
        next: (res: any) => {
          this.submitting = false;
          this.summary = res.summary;
          this.unmatchedList = res.unmatchedList || [];
          this.step = 'done';
          if (res.summary?.updated > 0) {
            this.imported.emit();
          }
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Import failed');
          this.submitting = false;
        },
      });
  }
}
