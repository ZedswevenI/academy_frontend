import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

interface TemplateRow {
  templateId: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
}

// Shared "Send Result Email" modal — used both from the Exam View screen
// (bulk, all participants, no admissionNo) and the Student Result screen
// (single student, admissionNo set). The backend (communication/exam-result/send)
// handles both modes off the same payload shape, differing only in whether
// admissionNo is present.
@Component({
  selector: 'app-exam-result-email-modal',
  standalone: false,
  templateUrl: './exam-result-email-modal.component.html',
  styleUrl: './exam-result-email-modal.component.scss',
})
export class ExamResultEmailModalComponent implements OnInit {
  @Input() examId = '';
  @Input() examName = '';
  @Input() admissionNo = '';
  @Output() sent = new EventEmitter<any>();

  show = false;
  loading = false;
  tenantId = localStorage.getItem('tenantId') || '';

  form!: FormGroup;
  templates: TemplateRow[] = [];
  templateOptions: any[] = [{ label: 'Select', value: '' }];

  sendTypeOptions = [
    { label: 'Send Now', value: 'NOW' },
    { label: 'Schedule Later', value: 'SCHEDULED' },
  ];

  contentModeOptions = [
    { label: 'Use Template', value: 'TEMPLATE' },
    { label: 'Ad-hoc Message', value: 'ADHOC' },
  ];

  availableKeys = [
    { key: '{{studentName}}', example: 'Arun Kumar' },
    { key: '{{parentName}}', example: 'Rajesh Kumar' },
    { key: '{{admissionNo}}', example: 'ADM2024001' },
    { key: '{{classNo}}', example: '10' },
    { key: '{{batchCode}}', example: 'JEE-2026-A' },
    { key: '{{centerName}}', example: 'Chennai Center' },
    { key: '{{programName}}', example: 'JEE Foundation' },
    { key: '{{academicYear}}', example: '2026-2027' },
    { key: '{{examName}}', example: 'Mid-Term Exam' },
    { key: '{{examCode}}', example: '100037' },
    { key: '{{totalMarks}}', example: '180' },
    { key: '{{obtainedMarks}}', example: '116' },
    { key: '{{percentage}}', example: '64.44' },
    { key: '{{marksTable}}', example: '(auto-built subject-wise marks table)' },
  ];

  constructor(
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: [''],
      contentMode: ['TEMPLATE', Validators.required],
      templateId: ['', Validators.required],
      subject: [''],
      body: [''],
      sendType: ['NOW', Validators.required],
      scheduledAtInput: [''],
    });
    this.form.get('contentMode')?.valueChanges.subscribe((mode) => {
      this.applyContentModeValidators(mode);
    });
  }

  private applyContentModeValidators(mode: string): void {
    const templateCtrl = this.form.get('templateId');
    const subjectCtrl = this.form.get('subject');
    const bodyCtrl = this.form.get('body');
    if (mode === 'TEMPLATE') {
      templateCtrl?.setValidators([Validators.required]);
      subjectCtrl?.clearValidators();
      bodyCtrl?.clearValidators();
    } else {
      templateCtrl?.clearValidators();
      subjectCtrl?.setValidators([Validators.required]);
      bodyCtrl?.setValidators([Validators.required]);
    }
    templateCtrl?.updateValueAndValidity({ emitEvent: false });
    subjectCtrl?.updateValueAndValidity({ emitEvent: false });
    bodyCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  open(): void {
    this.form.reset({
      title: '',
      contentMode: 'TEMPLATE',
      templateId: '',
      subject: '',
      body: '',
      sendType: 'NOW',
      scheduledAtInput: '',
    });
    this.show = true;
    if (!this.templates.length) this.loadTemplates();
  }

  close(): void {
    this.show = false;
  }

  private loadTemplates(): void {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'communication', 'template/list')
      .subscribe({
        next: (res: any) => {
          this.templates = (res?.data || [])
            .filter(
              (t: any) =>
                safeTrim(t?.channel) === 'email' &&
                safeTrim(t?.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
            )
            .map((t: any) => ({
              templateId: safeTrim(t?.templateId),
              name: safeTrim(t?.name),
              channel: safeTrim(t?.channel || 'email'),
              subject: safeTrim(t?.subject || ''),
              body: t?.body || '',
            }));
          this.templateOptions = [
            { label: 'Select', value: '' },
            ...this.templates.map((t) => ({ label: t.name, value: t.templateId })),
          ];
        },
        error: () => {},
      });
  }

  get selectedTemplate(): TemplateRow | null {
    const id = this.form?.get('templateId')?.value;
    return this.templates.find((t) => t.templateId === id) || null;
  }

  get previewSubject(): string {
    return this.replaceKeys(this.selectedTemplate?.subject || '');
  }

  get previewBody(): string {
    return this.replaceKeys(this.selectedTemplate?.body || '');
  }

  private replaceKeys(text: string): string {
    let out = text || '';
    this.availableKeys.forEach((k) => {
      out = out.split(k.key).join(`<mark>${k.example}</mark>`);
    });
    return out;
  }

  private scheduledInputToEpoch(): number {
    const v = safeTrim(this.form.get('scheduledAtInput')?.value);
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  submit(): void {
    if (this.loading) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const v = this.form.getRawValue();
    const payload: any = {
      entiId: this.tenantId,
      examId: this.examId,
      sendType: safeTrim(v.sendType) || 'NOW',
    };
    if (this.admissionNo) payload.admissionNo = this.admissionNo;
    if (safeTrim(v.title)) payload.title = safeTrim(v.title);

    if (v.contentMode === 'TEMPLATE') {
      payload.templateId = safeTrim(v.templateId);
    } else {
      payload.subject = v.subject;
      payload.body = v.body;
    }

    if (payload.sendType === 'SCHEDULED') {
      const scheduledAt = this.scheduledInputToEpoch();
      if (!scheduledAt || scheduledAt <= Date.now()) {
        this.alert.error('Please select a valid future schedule date');
        return;
      }
      payload.scheduledAt = scheduledAt;
    }

    this.loading = true;
    this.commonApi
      .fetchData(payload, 'communication', 'exam-result/send')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          const d = res?.data || {};
          this.alert.success(
            res?.message ||
              `Queued for ${d.totalRecipients ?? 0} recipients (${d.validEmailCount ?? 0} valid, ${d.missingEmailCount ?? 0} missing)`,
          );
          this.sent.emit(d);
          this.close();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(
            err?.error?.message || 'Failed to send exam result email',
          );
        },
      });
  }
}
