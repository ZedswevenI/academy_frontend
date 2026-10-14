import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

interface TemplateRow {
  templateId: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
}

@Component({
  selector: 'app-send-batch',
  standalone: false,
  templateUrl: './send-batch.component.html',
  styleUrl: './send-batch.component.scss',
})
export class SendBatchComponent implements OnInit {
  sendBatchForm!: FormGroup;
  loading = false;
  tenantId: any;

  // Batch multi-select
  batches: any[] = [];
  selectedBatchCodes: string[] = [];
  selectAllBatches = false;

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
    { key: '{{studentEmail}}', example: 'student@example.com' },
    { key: '{{studentPhone}}', example: '9876543210' },
    { key: '{{classNo}}', example: '10' },
    { key: '{{batchCode}}', example: 'JEE-2026-A' },
    { key: '{{centerName}}', example: 'Chennai Center' },
    { key: '{{programName}}', example: 'JEE Foundation' },
    { key: '{{academicYear}}', example: '2026-2027' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
    private backNav: BackNavigationService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([
      { label: 'Communication', link: '/app/communication/send' },
      { label: 'Send to Batch' },
    ]);
  }

  ngOnInit(): void {
    this.sendBatchForm = this.fb.group({
      title: [''],
      contentMode: ['TEMPLATE', Validators.required],
      templateId: ['', Validators.required],
      subject: [''],
      body: [''],
      sendType: ['NOW', Validators.required],
      scheduledAtInput: [''],
    });

    this.sendBatchForm.get('contentMode')?.valueChanges.subscribe((mode) => {
      this.applyContentModeValidators(mode);
    });

    this.loadBatches();
    this.loadTemplates();
  }

  private applyContentModeValidators(mode: string): void {
    const templateCtrl = this.sendBatchForm.get('templateId');
    const subjectCtrl = this.sendBatchForm.get('subject');
    const bodyCtrl = this.sendBatchForm.get('body');
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

  private loadBatches(): void {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.batches = res?.data?.rows || res?.data || [];
        },
        error: () => {},
      });
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
    const id = this.sendBatchForm?.get('templateId')?.value;
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

  isBatchSelected(code: string): boolean {
    return this.selectedBatchCodes.includes(code);
  }

  toggleBatch(code: string, checked: boolean): void {
    if (checked) {
      this.selectedBatchCodes = [...this.selectedBatchCodes, code];
    } else {
      this.selectedBatchCodes = this.selectedBatchCodes.filter((c) => c !== code);
      this.selectAllBatches = false;
    }
    this.selectAllBatches = this.selectedBatchCodes.length === this.batches.length;
  }

  toggleAllBatches(checked: boolean): void {
    this.selectAllBatches = checked;
    this.selectedBatchCodes = checked ? this.batches.map((b) => b.batchCode) : [];
  }

  private scheduledInputToEpoch(): number {
    const v = safeTrim(this.sendBatchForm.get('scheduledAtInput')?.value);
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/communication/send' });
  }

  onSubmit(): void {
    if (this.loading) return;
    if (!this.selectedBatchCodes.length) {
      this.alert.error('Please select at least one batch');
      return;
    }
    if (this.sendBatchForm.invalid) {
      this.sendBatchForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const v = this.sendBatchForm.getRawValue();
    const payload: any = {
      entiId: this.tenantId,
      batchCodes: this.selectedBatchCodes,
      sendType: safeTrim(v.sendType) || 'NOW',
    };
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
    this.commonApi.fetchData(payload, 'communication', 'send/batch').subscribe({
      next: (res: any) => {
        this.loading = false;
        const d = res?.data || {};
        this.alert.success(
          res?.message ||
            `Queued for ${d.totalRecipients ?? 0} recipients (${d.validEmailCount ?? 0} valid, ${d.missingEmailCount ?? 0} missing)`,
        );
        if (d.campaignId) {
          this.router.navigate(['/app/communication/sent-logs'], {
            queryParams: { campaignId: d.campaignId },
          });
        } else {
          this.router.navigate(['/app/communication/sent-logs']);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Failed to send batch communication');
      },
    });
  }
}
