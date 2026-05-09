import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import * as XLSX from 'xlsx';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

@Component({
  selector: 'app-excel-bulk-mail',
  standalone: false,
  templateUrl: './excel-bulk-mail.component.html',
  styleUrl: './excel-bulk-mail.component.scss',
})
export class ExcelBulkMailComponent implements OnInit {
  bulkMailForm!: FormGroup;
  entiId: any;
  loading = false;
  fileName = '';
  headers: string[] = [];
  excelRows: any[] = [];
  previewIndex = 0;
  previewSubject = '';
  previewBody = '';
  constructor(
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([
      { label: 'Communication', link: '/app/communication/send' },
      { label: 'Bulk Excel Mail' },
    ]);
  }

  ngOnInit(): void {
    this.bulkMailForm = this.fb.group({
      title: ['', Validators.required],
      subject: ['', Validators.required],
      body: ['', Validators.required],
    });

    this.bulkMailForm.valueChanges.subscribe(() => {
      this.refreshPreview();
    });
  }

  onFileSelected(event: any): void {
    const file: File = event?.target?.files?.[0];
    if (!file) return;
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          this.alert.error('Excel sheet not found');
          return;
        }
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });
        if (!rows.length) {
          this.alert.error('Excel file has no data');
          return;
        }
        const normalizedRows = rows.map((r: any) => this.normalizeRowKeys(r));
        const firstRow = normalizedRows[0] || {};
        const headers = Object.keys(firstRow);
        if (!headers.includes('email')) {
          this.alert.error('Excel must contain email column');
          return;
        }
        this.headers = headers;
        this.excelRows = normalizedRows;
        this.previewIndex = 0;
        this.refreshPreview();
        this.alert.success('Excel loaded successfully');
      } catch (err) {
        this.alert.error('Failed to read Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private normalizeRowKeys(row: any): any {
    const out: any = {};
    Object.keys(row || {}).forEach((key) => {
      const normalizedKey = safeTrim(key)
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '');
      if (normalizedKey) {
        out[normalizedKey] = safeTrim(row[key]);
      }
    });
    return out;
  }

  insertKey(key: string, target: 'subject' | 'body'): void {
    const control = this.bulkMailForm.get(target);
    const current = control?.value || '';
    const variable = `{{${key}}}`;
    control?.setValue(`${current} ${variable} `);
    control?.markAsDirty();
  }

  insertFirstKey(target: 'subject' | 'body'): void {
    if (!this.headers.length) return;
    this.insertKey(this.headers[0], target);
  }

  copyKey(key: string, event: MouseEvent): void {
    event.stopPropagation();
    const variable = `{{${key}}}`;
    navigator.clipboard
      ?.writeText(variable)
      .then(() => {
        this.alert.success(`Copied ${variable}`);
      })
      .catch(() => {
        this.alert.error('Copy failed');
      });
  }

  refreshPreview(): void {
    if (!this.excelRows.length || !this.bulkMailForm) {
      this.previewSubject = '';
      this.previewBody = '';
      return;
    }
    const row = this.excelRows[Number(this.previewIndex) || 0] || {};
    this.previewSubject = this.renderTemplate(
      this.bulkMailForm.get('subject')?.value || '',
      row,
    );
    this.previewBody = this.renderTemplate(
      this.bulkMailForm.get('body')?.value || '',
      row,
    );
  }

  private renderTemplate(content: string, row: any): string {
    let output = content || '';
    this.headers.forEach((h) => {
      const value = safeTrim(row[h]) || '-';
      const reg = new RegExp(`{{\\s*${this.escapeRegExp(h)}\\s*}}`, 'g');
      output = output.replace(reg, `<mark>${value}</mark>`);
    });
    return output;
  }

  private renderPlainTemplate(content: string, row: any): string {
    let output = content || '';
    this.headers.forEach((h) => {
      const value = safeTrim(row[h]) || '';
      const reg = new RegExp(`{{\\s*${this.escapeRegExp(h)}\\s*}}`, 'g');
      output = output.replace(reg, value);
    });
    return output;
  }

  private escapeRegExp(value: string): string {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  get validEmailCount(): number {
    return this.excelRows.filter((r) => this.isValidEmail(r.email)).length;
  }

  get invalidEmailCount(): number {
    return this.excelRows.length - this.validEmailCount;
  }

  isValidEmail(email: any): boolean {
    const e = safeTrim(email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  preparePayload(): void {
    if (this.bulkMailForm.invalid) {
      this.bulkMailForm.markAllAsTouched();
      this.alert.error('Please enter title, subject and body');
      return;
    }
    if (!this.excelRows.length) {
      this.alert.error('Please upload Excel file');
      return;
    }
    const validRows = this.excelRows.filter((r) => this.isValidEmail(r.email));
    if (!validRows.length) {
      this.alert.error('No valid email rows found');
      return;
    }
    const v = this.bulkMailForm.value;
    const payload = {
      entiId: this.entiId,
      title: safeTrim(v.title),
      subject: safeTrim(v.subject),
      body: v.body || '',
      totalRows: this.excelRows.length,
      validEmailCount: validRows.length,
      invalidEmailCount: this.invalidEmailCount,
      rows: validRows.map((r) => ({
        ...r,
        email: safeTrim(r.email),
        renderedSubject: this.renderPlainTemplate(v.subject, r),
        renderedBody: this.renderPlainTemplate(v.body, r),
      })),
    };
    console.log('Bulk Excel Mail Payload:', payload);
    this.alert.success('Payload prepared. Check console for backend payload.');
  }

  resetAll(): void {
    this.fileName = '';
    this.headers = [];
    this.excelRows = [];
    this.previewIndex = 0;
    this.previewSubject = '';
    this.previewBody = '';
    this.bulkMailForm.reset({
      title: '',
      subject: '',
      body: '',
    });
  }

  sendBulkMail(): void {
    if (this.bulkMailForm.invalid) {
      this.bulkMailForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }
    if (!this.excelRows.length) {
      this.alert.error('Please upload valid Excel data');
      return;
    }
    const v = this.bulkMailForm.value;
    const payload = {
      entiId: this.entiId,
      userId: localStorage.getItem('userId'),
      title: safeTrim(v.title) || 'Excel Bulk Mail',
      subject: safeTrim(v.subject),
      body: v.body || '',
      emailKey: 'email',
      nameKey: 'name',
      rows: this.excelRows,
    };
    this.loading = true;
    this.commonApi
      .fetchData(payload, 'communication/excel-bulk-mail', 'send')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.alert.success(res?.message || 'Bulk mail queued successfully');
          this.resetAll();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Failed to send bulk mail');
        },
      });
  }
}
