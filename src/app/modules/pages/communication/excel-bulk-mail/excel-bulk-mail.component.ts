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
  imageUploading = false;
  lastUploadedImageUrl = '';
  tableRows = 2;
  tableCols = 2;
  private previewTimer: any;

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
    // this.bulkMailForm.valueChanges.subscribe(() => {
    //   this.refreshPreview();
    // });
    this.bulkMailForm.valueChanges.subscribe(() => {
      clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(() => this.refreshPreview(), 300);
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
    const bodyHtml = v.body || '';
    if (this.hasUnsafeEditorImages(bodyHtml)) {
      this.alert.error(
        'Please remove images added directly inside editor. Use Insert Image button only.',
      );
      return;
    }
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

  onEmailImageSelected(event: any): void {
    const file: File = event?.target?.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.alert.error('Only PNG, JPG, JPEG, WEBP images are allowed');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.alert.error('Image size should not exceed 2MB');
      event.target.value = '';
      return;
    }
    const formData = new FormData();
    formData.append('files', file);
    formData.append('entiId', this.entiId || '');
    this.imageUploading = true;
    this.commonApi
      .uploadImage(formData, 'communication/email-asset', 'upload')
      .subscribe({
        next: (res: any) => {
          this.imageUploading = false;
          const url = safeTrim(res?.data?.url);
          if (!url) {
            this.alert.error('Image uploaded but URL missing');
            return;
          }
          this.lastUploadedImageUrl = url;
          this.insertImageToBody(url);
          this.alert.success('Image inserted successfully');
          event.target.value = '';
        },
        error: (err: any) => {
          this.imageUploading = false;
          this.alert.error(err?.error?.message || 'Image upload failed');
          event.target.value = '';
        },
      });
  }

  private insertImageToBody(imageUrl: string): void {
    const control = this.bulkMailForm.get('body');
    const currentBody = control?.value || '';
    const imageHtml = `
    <p style="margin: 10px 0;">
      <img src="${imageUrl}" alt="Email Image" style="max-width: 220px; height: auto; display: block;" />
    </p>
  `;
    control?.setValue(`${currentBody}${imageHtml}`);
    control?.markAsDirty();
    this.refreshPreview();
  }

  // insertEmailTable(): void {
  //   const rows = 3;
  //   const cols = 2;
  //   const width = Math.floor(100 / cols);
  //   const headerRow = `
  //   <tr>
  //     ${Array.from(
  //       { length: cols },
  //       (_, i) => `
  //       <td style="border:1px solid #000;padding:4px;width:${width}%;font-weight:600;background:#f7f7f7;">
  //         Header ${i + 1}
  //       </td>
  //     `,
  //     ).join('')}
  //   </tr>
  // `;
  //   const bodyRows = Array.from(
  //     { length: rows - 1 },
  //     () => `
  //   <tr>
  //     ${Array.from(
  //       { length: cols },
  //       () => `
  //       <td style="border:1px solid #000;padding:4px;width:${width}%;">&nbsp;</td>
  //     `,
  //     ).join('')}
  //   </tr>
  // `,
  //   ).join('');
  //   const tableHtml = `
  //   <table cellpadding="0" cellspacing="0" border="0"
  //     style="border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0;">
  //     ${headerRow}
  //     ${bodyRows}
  //   </table>
  //   <p></p>
  // `;
  //   this.appendToBody(tableHtml);
  // }

  insertEmailTable(): void {
    const rows = Math.min(Math.max(Number(this.tableRows) || 1, 1), 20);
    const cols = Math.min(Math.max(Number(this.tableCols) || 1, 1), 8);
    const width = Math.floor(100 / cols);
    const tableRowsHtml = Array.from({ length: rows }, (_, rowIndex) => {
      const cells = Array.from({ length: cols }, (_, colIndex) => {
        const isHeader = rowIndex === 0;
        return `
        <td width="${width}%"
          style="border:1px solid #000;padding:4px;width:${width}%;${isHeader ? 'font-weight:600;background:#f7f7f7;' : ''}">
          ${isHeader ? `Header ${colIndex + 1}` : '&nbsp;'}
        </td>
      `;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    const tableHtml = `
    <table cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0;">
      ${tableRowsHtml}
    </table>
    <p></p>
  `;

    this.appendToBody(tableHtml);
  }

  private appendToBody(html: string): void {
    const control = this.bulkMailForm.get('body');
    const currentBody = control?.value || '';
    control?.setValue(`${currentBody}${html}`);
    control?.markAsDirty();
    this.refreshPreview();
  }

  private hasUnsafeEditorImages(html: string): boolean {
    const body = html || '';
    return (
      body.includes('src="data:image') ||
      body.includes("src='data:image") ||
      body.includes('src="blob:') ||
      body.includes("src='blob:")
    );
  }

  private renderTemplate(content: string, row: any): string {
    let output = (content || '').slice(0, 20000);
    this.headers.forEach((h) => {
      const value = safeTrim(row[h]) || '-';
      const reg = new RegExp(`{{\\s*${this.escapeRegExp(h)}\\s*}}`, 'g');
      output = output.replace(reg, `<mark>${value}</mark>`);
    });
    return output;
  }
}
