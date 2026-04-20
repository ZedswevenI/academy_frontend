import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../service/alert/alert.service';

interface TemplateKey {
  key: string;
  label: string;
  example: string;
}

interface TemplateRow {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  body: string;
  updatedAt: number;
}

@Component({
  selector: 'app-communication-templates',
  standalone: false,
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.scss'
})
export class TemplatesComponent implements OnInit {

  templateForm!: FormGroup;
  templates: TemplateRow[] = [];
  activeTemplateId: string | null = null;
  mode: 'idle' | 'create' | 'edit' = 'idle';

  channelOptions = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
    { label: 'WhatsApp', value: 'whatsapp' }
  ];

  availableKeys: TemplateKey[] = [
    { key: '{{studentName}}',   label: 'Student Name',   example: 'Arun Kumar' },
    { key: '{{admissionNo}}',   label: 'Admission No',   example: 'ADM2024001' },
    { key: '{{className}}',     label: 'Class Name',     example: 'Class 10' },
    { key: '{{batchName}}',     label: 'Batch Name',     example: 'Batch A' },
    { key: '{{parentName}}',    label: 'Parent Name',    example: 'Rajesh Kumar' },
    { key: '{{feeAmount}}',     label: 'Fee Amount',     example: '₹25,000' },
    { key: '{{dueDate}}',       label: 'Due Date',       example: '15 May 2026' },
    { key: '{{examName}}',      label: 'Exam Name',      example: 'Mid-Term Exam' },
    { key: '{{examDate}}',      label: 'Exam Date',      example: '20 Apr 2026' },
    { key: '{{result}}',        label: 'Result',         example: '92 / 100' },
    { key: '{{attendancePct}}', label: 'Attendance %',   example: '94%' },
    { key: '{{instituteName}}', label: 'Institute Name', example: 'Namith Academy' },
    { key: '{{teacherName}}',   label: 'Teacher Name',   example: 'Ms. Priya' },
    { key: '{{subject}}',       label: 'Subject',        example: 'Mathematics' },
    { key: '{{meetingLink}}',   label: 'Meeting Link',   example: 'https://meet.example/abc' }
  ];

  constructor(
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private alert: AlertService
  ) {
    this.breadcrumb.set([{ label: 'Communication', link: '/app/communication/send' }, { label: 'Templates' }]);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadMockTemplates();
  }

  private initForm(): void {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      channel: ['email', Validators.required],
      subject: [''],
      body: ['', Validators.required]
    });
  }

  private loadMockTemplates(): void {
    this.templates = [
      {
        id: 't1',
        name: 'Fee Reminder',
        channel: 'email',
        subject: 'Fee payment reminder - {{studentName}}',
        body: `<p>Dear <strong>{{parentName}}</strong>,</p>
<p>This is a gentle reminder that the fee of <strong>{{feeAmount}}</strong> for <strong>{{studentName}}</strong> ({{admissionNo}}) is due on <strong>{{dueDate}}</strong>.</p>
<p>Thank you,<br>{{instituteName}}</p>`,
        updatedAt: Date.now() - 86400000
      },
      {
        id: 't2',
        name: 'Exam Schedule',
        channel: 'whatsapp',
        body: `Hi {{parentName}}, the *{{examName}}* for {{studentName}} ({{className}}) is scheduled on *{{examDate}}*. All the best!\n\n- {{instituteName}}`,
        updatedAt: Date.now() - 172800000
      },
      {
        id: 't3',
        name: 'Attendance Alert',
        channel: 'sms',
        body: `Dear {{parentName}}, {{studentName}}'s attendance is {{attendancePct}}. Please contact the institute. - {{instituteName}}`,
        updatedAt: Date.now() - 3 * 86400000
      }
    ];
  }

  /* ================= LIST ACTIONS ================= */
  newTemplate(): void {
    this.mode = 'create';
    this.activeTemplateId = null;
    this.templateForm.reset({ name: '', channel: 'email', subject: '', body: '' });
  }

  selectTemplate(t: TemplateRow): void {
    this.mode = 'edit';
    this.activeTemplateId = t.id;
    this.templateForm.patchValue({
      name: t.name,
      channel: t.channel,
      subject: t.subject || '',
      body: t.body
    });
  }

  deleteTemplate(t: TemplateRow, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`Delete template "${t.name}"?`)) return;
    this.templates = this.templates.filter(x => x.id !== t.id);
    if (this.activeTemplateId === t.id) {
      this.mode = 'idle';
      this.activeTemplateId = null;
      this.templateForm.reset({ channel: 'email' });
    }
    this.alert.success('Template deleted');
  }

  cancelEdit(): void {
    this.mode = 'idle';
    this.activeTemplateId = null;
    this.templateForm.reset({ channel: 'email' });
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const v = this.templateForm.value;

    if (this.mode === 'create') {
      const row: TemplateRow = {
        id: 't' + Date.now(),
        name: v.name,
        channel: v.channel,
        subject: v.subject,
        body: v.body,
        updatedAt: Date.now()
      };
      this.templates = [row, ...this.templates];
      this.activeTemplateId = row.id;
      this.mode = 'edit';
      this.alert.success('Template created');
    } else if (this.mode === 'edit' && this.activeTemplateId) {
      const id = this.activeTemplateId;
      this.templates = this.templates.map(t =>
        t.id === id
          ? { ...t, name: v.name, channel: v.channel, subject: v.subject, body: v.body, updatedAt: Date.now() }
          : t
      );
      this.alert.success('Template updated');
    }
  }

  /* ================= KEY INSERT ================= */
  insertKey(key: string, target: 'body' | 'subject'): void {
    const current = this.templateForm.get(target)?.value || '';
    this.templateForm.patchValue({ [target]: current + ' ' + key + ' ' });
  }

  copyKey(key: string, event: MouseEvent): void {
    event.stopPropagation();
    navigator.clipboard?.writeText(key).then(() => {
      this.alert.success(`Copied ${key}`);
    }).catch(() => this.alert.error('Copy failed'));
  }

  /* ================= PREVIEW ================= */
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
    this.availableKeys.forEach(k => {
      out = out.split(k.key).join(`<mark>${k.example}</mark>`);
    });
    return out;
  }

  channelBadge(ch: string): string {
    switch (ch) {
      case 'email': return 'bg-primary';
      case 'sms': return 'bg-warning text-dark';
      case 'whatsapp': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }
}
