// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
// import { AlertService } from '../../../../service/alert/alert.service';

// interface TemplateKey {
//   key: string;
//   label: string;
//   example: string;
// }

// interface TemplateRow {
//   id: string;
//   name: string;
//   channel: 'email' | 'sms' | 'whatsapp';
//   subject?: string;
//   body: string;
//   updatedAt: number;
// }

// @Component({
//   selector: 'app-communication-templates',
//   standalone: false,
//   templateUrl: './templates.component.html',
//   styleUrl: './templates.component.scss'
// })
// export class TemplatesComponent implements OnInit {

//   templateForm!: FormGroup;
//   templates: TemplateRow[] = [];
//   activeTemplateId: string | null = null;
//   mode: 'idle' | 'create' | 'edit' = 'idle';

//   channelOptions = [
//     { label: 'Email', value: 'email' },
//     { label: 'SMS', value: 'sms' },
//     { label: 'WhatsApp', value: 'whatsapp' }
//   ];

//   availableKeys: TemplateKey[] = [
//     { key: '{{studentName}}',   label: 'Student Name',   example: 'Arun Kumar' },
//     { key: '{{admissionNo}}',   label: 'Admission No',   example: 'ADM2024001' },
//     { key: '{{className}}',     label: 'Class Name',     example: 'Class 10' },
//     { key: '{{batchName}}',     label: 'Batch Name',     example: 'Batch A' },
//     { key: '{{parentName}}',    label: 'Parent Name',    example: 'Rajesh Kumar' },
//     { key: '{{feeAmount}}',     label: 'Fee Amount',     example: '₹25,000' },
//     { key: '{{dueDate}}',       label: 'Due Date',       example: '15 May 2026' },
//     { key: '{{examName}}',      label: 'Exam Name',      example: 'Mid-Term Exam' },
//     { key: '{{examDate}}',      label: 'Exam Date',      example: '20 Apr 2026' },
//     { key: '{{result}}',        label: 'Result',         example: '92 / 100' },
//     { key: '{{attendancePct}}', label: 'Attendance %',   example: '94%' },
//     { key: '{{instituteName}}', label: 'Institute Name', example: 'Namith Academy' },
//     { key: '{{teacherName}}',   label: 'Teacher Name',   example: 'Ms. Priya' },
//     { key: '{{subject}}',       label: 'Subject',        example: 'Mathematics' },
//     { key: '{{meetingLink}}',   label: 'Meeting Link',   example: 'https://meet.example/abc' }
//   ];

//   constructor(
//     private fb: FormBuilder,
//     private breadcrumb: BredcrumpService,
//     private alert: AlertService
//   ) {
//     this.breadcrumb.set([{ label: 'Communication', link: '/app/communication/send' }, { label: 'Templates' }]);
//   }

//   ngOnInit(): void {
//     this.initForm();
//     this.loadMockTemplates();
//   }

//   private initForm(): void {
//     this.templateForm = this.fb.group({
//       name: ['', Validators.required],
//       channel: ['email', Validators.required],
//       subject: [''],
//       body: ['', Validators.required]
//     });
//   }

//   private loadMockTemplates(): void {
//     this.templates = [
//       {
//         id: 't1',
//         name: 'Fee Reminder',
//         channel: 'email',
//         subject: 'Fee payment reminder - {{studentName}}',
//         body: `<p>Dear <strong>{{parentName}}</strong>,</p>
// <p>This is a gentle reminder that the fee of <strong>{{feeAmount}}</strong> for <strong>{{studentName}}</strong> ({{admissionNo}}) is due on <strong>{{dueDate}}</strong>.</p>
// <p>Thank you,<br>{{instituteName}}</p>`,
//         updatedAt: Date.now() - 86400000
//       },
//       {
//         id: 't2',
//         name: 'Exam Schedule',
//         channel: 'whatsapp',
//         body: `Hi {{parentName}}, the *{{examName}}* for {{studentName}} ({{className}}) is scheduled on *{{examDate}}*. All the best!\n\n- {{instituteName}}`,
//         updatedAt: Date.now() - 172800000
//       },
//       {
//         id: 't3',
//         name: 'Attendance Alert',
//         channel: 'sms',
//         body: `Dear {{parentName}}, {{studentName}}'s attendance is {{attendancePct}}. Please contact the institute. - {{instituteName}}`,
//         updatedAt: Date.now() - 3 * 86400000
//       }
//     ];
//   }

//   newTemplate(): void {
//     this.mode = 'create';
//     this.activeTemplateId = null;
//     this.templateForm.reset({ name: '', channel: 'email', subject: '', body: '' });
//   }

//   selectTemplate(t: TemplateRow): void {
//     this.mode = 'edit';
//     this.activeTemplateId = t.id;
//     this.templateForm.patchValue({
//       name: t.name,
//       channel: t.channel,
//       subject: t.subject || '',
//       body: t.body
//     });
//   }

//   deleteTemplate(t: TemplateRow, event: MouseEvent): void {
//     event.stopPropagation();
//     if (!confirm(`Delete template "${t.name}"?`)) return;
//     this.templates = this.templates.filter(x => x.id !== t.id);
//     if (this.activeTemplateId === t.id) {
//       this.mode = 'idle';
//       this.activeTemplateId = null;
//       this.templateForm.reset({ channel: 'email' });
//     }
//     this.alert.success('Template deleted');
//   }

//   cancelEdit(): void {
//     this.mode = 'idle';
//     this.activeTemplateId = null;
//     this.templateForm.reset({ channel: 'email' });
//   }

//   saveTemplate(): void {
//     if (this.templateForm.invalid) {
//       this.templateForm.markAllAsTouched();
//       this.alert.error('Please fill all required fields');
//       return;
//     }

//     const v = this.templateForm.value;

//     if (this.mode === 'create') {
//       const row: TemplateRow = {
//         id: 't' + Date.now(),
//         name: v.name,
//         channel: v.channel,
//         subject: v.subject,
//         body: v.body,
//         updatedAt: Date.now()
//       };
//       this.templates = [row, ...this.templates];
//       this.activeTemplateId = row.id;
//       this.mode = 'edit';
//       this.alert.success('Template created');
//     } else if (this.mode === 'edit' && this.activeTemplateId) {
//       const id = this.activeTemplateId;
//       this.templates = this.templates.map(t =>
//         t.id === id
//           ? { ...t, name: v.name, channel: v.channel, subject: v.subject, body: v.body, updatedAt: Date.now() }
//           : t
//       );
//       this.alert.success('Template updated');
//     }
//   }

//   insertKey(key: string, target: 'body' | 'subject'): void {
//     const current = this.templateForm.get(target)?.value || '';
//     this.templateForm.patchValue({ [target]: current + ' ' + key + ' ' });
//   }

//   copyKey(key: string, event: MouseEvent): void {
//     event.stopPropagation();
//     navigator.clipboard?.writeText(key).then(() => {
//       this.alert.success(`Copied ${key}`);
//     }).catch(() => this.alert.error('Copy failed'));
//   }

//   get previewBody(): string {
//     const body = this.templateForm.get('body')?.value || '';
//     return this.replaceKeys(body);
//   }

//   get previewSubject(): string {
//     const subj = this.templateForm.get('subject')?.value || '';
//     return this.replaceKeys(subj);
//   }

//   private replaceKeys(text: string): string {
//     let out = text || '';
//     this.availableKeys.forEach(k => {
//       out = out.split(k.key).join(`<mark>${k.example}</mark>`);
//     });
//     return out;
//   }

//   channelBadge(ch: string): string {
//     switch (ch) {
//       case 'email': return 'bg-primary';
//       case 'sms': return 'bg-warning text-dark';
//       case 'whatsapp': return 'bg-success';
//       default: return 'bg-secondary';
//     }
//   }

//   formatDate(ts: number): string {
//     if (!ts) return '-';
//     return new Date(ts).toLocaleString('en-IN', {
//       day: '2-digit', month: 'short', year: 'numeric',
//       hour: '2-digit', minute: '2-digit', hour12: true
//     });
//   }
// }

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

interface TemplateKey {
  key: string;
  label: string;
  example: string;
}

interface TemplateRow {
  templateId: string;
  name: string;
  category?: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  body: string;
  status?: string;
  updatedAt: number;
}

@Component({
  selector: 'app-communication-templates',
  standalone: false,
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.scss',
})
export class TemplatesComponent implements OnInit {
  templateForm!: FormGroup;
  templates: TemplateRow[] = [];
  activeTemplateId: string | null = null;
  mode: 'idle' | 'create' | 'edit' = 'idle';
  loading = false;
  entiId: any;
  channelOptions = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
    { label: 'WhatsApp', value: 'whatsapp' },
  ];
  availableKeys: TemplateKey[] = [
    { key: '{{studentName}}', label: 'Student Name', example: 'Arun Kumar' },
    { key: '{{parentName}}', label: 'Parent Name', example: 'Rajesh Kumar' },
    { key: '{{admissionNo}}', label: 'Admission No', example: 'ADM2024001' },
    {
      key: '{{studentEmail}}',
      label: 'Student Email',
      example: 'student@example.com',
    },
    { key: '{{studentPhone}}', label: 'Student Phone', example: '9876543210' },
    { key: '{{classNo}}', label: 'Class No', example: '10' },
    { key: '{{batchCode}}', label: 'Batch Code', example: 'JEE-2026-A' },
    { key: '{{centerName}}', label: 'Center Name', example: 'Chennai Center' },
    {
      key: '{{programName}}',
      label: 'Program Name',
      example: 'JEE Foundation',
    },
    { key: '{{academicYear}}', label: 'Academic Year', example: '2026-2027' },

    // future/event keys
    { key: '{{feeAmount}}', label: 'Fee Amount', example: '₹25,000' },
    { key: '{{dueDate}}', label: 'Due Date', example: '15 May 2026' },
    { key: '{{examName}}', label: 'Exam Name', example: 'Mid-Term Exam' },
    { key: '{{examDate}}', label: 'Exam Date', example: '20 Apr 2026' },
    { key: '{{result}}', label: 'Result', example: '92 / 100' },
    { key: '{{attendancePct}}', label: 'Attendance %', example: '94%' },
    {
      key: '{{instituteName}}',
      label: 'Institute Name',
      example: 'Namith Academy',
    },
    { key: '{{teacherName}}', label: 'Teacher Name', example: 'Ms. Priya' },
    { key: '{{subject}}', label: 'Subject', example: 'Mathematics' },
    {
      key: '{{meetingLink}}',
      label: 'Meeting Link',
      example: 'https://meet.example/abc',
    },
  ];
  imageUploading = false;
  lastUploadedImageUrl = '';
  tableRows = 3;
  tableCols = 2;

  constructor(
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([
      { label: 'Communication', link: '/app/communication/send' },
      { label: 'Templates' },
    ]);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadTemplates();
  }

  private initForm(): void {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      channel: ['email', Validators.required],
      subject: [''],
      body: ['', Validators.required],
    });
  }

  loadTemplates(): void {
    this.loading = true;
    this.commonApi
      .fetchData({ entiId: this.entiId }, 'communication', 'template/list')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.templates = (res?.data || []).map((t: any) =>
            this.mapTemplate(t),
          );
        },
        error: (err: any) => {
          this.loading = false;
          this.templates = [];
          this.alert.error(err?.error?.message || 'Failed to load templates');
        },
      });
  }

  private mapTemplate(t: any): TemplateRow {
    return {
      templateId: safeTrim(t?.templateId),
      name: safeTrim(t?.name),
      category: safeTrim(t?.category || 'GENERAL'),
      channel: safeTrim(t?.channel || 'email') as any,
      subject: safeTrim(t?.subject),
      body: t?.body || '',
      status: safeTrim(t?.status || 'ACTIVE'),
      updatedAt: t?.updatedAt ? new Date(t.updatedAt).getTime() : Date.now(),
    };
  }

  newTemplate(): void {
    this.mode = 'create';
    this.activeTemplateId = null;
    this.lastUploadedImageUrl = '';
    this.imageUploading = false;
    this.templateForm.reset({
      name: '',
      channel: 'email',
      subject: '',
      body: '',
    });
  }

  selectTemplate(t: TemplateRow): void {
    this.mode = 'edit';
    this.activeTemplateId = t.templateId;
    this.templateForm.patchValue({
      name: t.name,
      channel: t.channel,
      subject: t.subject || '',
      body: t.body || '',
    });
  }

  deleteTemplate(t: TemplateRow, event: MouseEvent): void {
    event.stopPropagation();

    if (!confirm(`Delete template "${t.name}"?`)) return;

    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.entiId,
          templateId: t.templateId,
        },
        'communication',
        'template/delete',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.alert.success(res?.message || 'Template deleted');
          if (this.activeTemplateId === t.templateId) {
            this.cancelEdit();
          }
          this.loadTemplates();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Delete failed');
        },
      });
  }

  cancelEdit(): void {
    this.mode = 'idle';
    this.activeTemplateId = null;
    this.templateForm.reset({ channel: 'email' });
    this.lastUploadedImageUrl = '';
    this.imageUploading = false;
  }

  saveTemplate(): void {
    if (this.loading) return;
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }
    const v = this.templateForm.getRawValue();
    if (safeTrim(v.channel) !== 'email') {
      this.alert.error('Only Email channel is supported now');
      return;
    }
    const bodyHtml = v.body || '';
    if (this.hasUnsafeEditorImages(bodyHtml)) {
      this.alert.error(
        'Please remove images added directly inside editor. Use Insert Image button only.',
      );
      return;
    }
    const payload: any = {
      entiId: this.entiId,
      name: safeTrim(v.name),
      channel: safeTrim(v.channel),
      subject: safeTrim(v.subject) || null,
      body: v.body || '',
      category: 'GENERAL',
    };
    if (this.mode === 'edit') {
      payload.templateId = this.activeTemplateId;
    }
    const endpoint =
      this.mode === 'create' ? 'template/create' : 'template/update';
    this.loading = true;
    this.commonApi.fetchData(payload, 'communication', endpoint).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alert.success(
          res?.message ||
            (this.mode === 'create' ? 'Template created' : 'Template updated'),
        );
        const saved = this.mapTemplate(res?.data || {});
        this.activeTemplateId = saved.templateId || this.activeTemplateId;
        this.mode = 'edit';
        this.loadTemplates();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Save failed');
      },
    });
  }

  insertKey(key: string, target: 'body' | 'subject'): void {
    const current = this.templateForm.get(target)?.value || '';
    this.templateForm.patchValue({ [target]: current + ' ' + key + ' ' });
  }

  copyKey(key: string, event: MouseEvent): void {
    event.stopPropagation();
    navigator.clipboard
      ?.writeText(key)
      .then(() => this.alert.success(`Copied ${key}`))
      .catch(() => this.alert.error('Copy failed'));
  }

  get previewBody(): string {
    const body = this.templateForm.get('body')?.value || '';
    return this.replaceKeys(body);
  }

  get previewSubject(): string {
    const subj = this.templateForm.get('subject')?.value || '';
    return this.replaceKeys(subj);
  }

  private replaceKeys(text: string): string {
    let out = text || '';
    this.availableKeys.forEach((k) => {
      out = out.split(k.key).join(`<mark>${k.example}</mark>`);
    });
    return out;
  }

  channelBadge(ch: string): string {
    switch (ch) {
      case 'email':
        return 'bg-primary';
      case 'sms':
        return 'bg-warning text-dark';
      case 'whatsapp':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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
    const imageHtml = `
    <p style="margin:10px 0;">
      <img src="${imageUrl}" alt="Email Image" style="max-width:220px;height:auto;display:block;" />
    </p>
  `;
    this.appendToBody(imageHtml);
  }

  insertEmailTable(): void {
    const rows = Math.min(Math.max(Number(this.tableRows) || 1, 1), 20);
    const cols = Math.min(Math.max(Number(this.tableCols) || 1, 1), 8);
    const width = Math.floor(100 / cols);
    const headerRow = `
    <tr>
      ${Array.from(
        { length: cols },
        (_, i) => `
          <td style="border:1px solid #000;padding:4px;width:${width}%;font-weight:600;background:#f7f7f7;">
            Header ${i + 1}
          </td>
        `,
      ).join('')}
    </tr>
  `;
    const bodyRows = Array.from(
      { length: rows - 1 },
      () => `
      <tr>
        ${Array.from(
          { length: cols },
          () => `
            <td style="border:1px solid #000;padding:4px;width:${width}%;">&nbsp;</td>
          `,
        ).join('')}
      </tr>
    `,
    ).join('');
    const tableHtml = `
    <table cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0;">
      ${headerRow}
      ${bodyRows}
    </table>
    <p></p>
  `;
    this.appendToBody(tableHtml);
  }

  private appendToBody(html: string): void {
    const control = this.templateForm.get('body');
    const currentBody = control?.value || '';
    control?.setValue(`${currentBody}${html}`);
    control?.markAsDirty();
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
}
