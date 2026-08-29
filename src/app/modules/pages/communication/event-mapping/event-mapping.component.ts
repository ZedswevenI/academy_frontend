import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { PermissionService } from '../../../../shared/permission.service';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

@Component({
  selector: 'app-event-mapping',
  standalone: false,
  templateUrl: './event-mapping.component.html',
  styleUrl: './event-mapping.component.scss',
})
export class EventMappingComponent implements OnInit {
  loading = false;
  entiId: any;

  mappingForm!: FormGroup;
  mappings: any[] = [];
  templates: any[] = [];

  mode: 'create' | 'edit' = 'create';
  activeConfigId = '';

  channelOptions = [{ label: 'Email', value: 'email' }];

  statusOptions = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  eventOptions = [
    { label: 'Admission Confirmed', value: 'ADMISSION_CONFIRMED' },
    { label: 'Student Profile Created', value: 'STUDENT_PROFILE_CREATED' },
    { label: 'Admission Rejected', value: 'ADMISSION_REJECTED' },
    { label: 'Admission Under Review', value: 'ADMISSION_UNDER_REVIEW' },
    { label: 'Batch Assigned', value: 'BATCH_ASSIGNED' },
    { label: 'Batch Changed', value: 'BATCH_CHANGED' },
    { label: 'Academic Year Promotion', value: 'ACADEMIC_YEAR_PROMOTION' },
    { label: 'Payment Received', value: 'PAYMENT_RECEIVED' },
    { label: 'Cheque Cleared', value: 'CHEQUE_CLEARED' },
    { label: 'Cheque Failed / Bounced', value: 'CHEQUE_FAILED' },
    { label: 'Cheque Extension Approved', value: 'CHEQUE_EXTENSION_APPROVED' },
    { label: 'Cheque Extension Rejected', value: 'CHEQUE_EXTENSION_REJECTED' },
    { label: 'Daily Absence Alert', value: 'DAILY_ABSENCE_ALERT' },
    { label: 'Repeated Absence Warning', value: 'REPEATED_ABSENCE_WARNING' },
    { label: 'Assignment Result Published', value: 'ASSIGNMENT_RESULT_PUBLISHED' },
    { label: 'Exam Result Published', value: 'EXAM_RESULT_PUBLISHED' },
    { label: 'Circular Published', value: 'CIRCULAR_PUBLISHED' },
    { label: 'Study Material Uploaded', value: 'STUDY_MATERIAL_UPLOADED' },
    { label: 'Package Enabled', value: 'PACKAGE_ENABLED' },
    { label: 'Package Revoked', value: 'PACKAGE_REVOKED' },
    { label: 'Feedback Form Assigned', value: 'FEEDBACK_FORM_ASSIGNED' },
    { label: 'Feedback Not Submitted Reminder', value: 'FEEDBACK_NOT_SUBMITTED_REMINDER' },
  ];

  templateOptions: any[] = [{ label: 'Select', value: '' }];

  constructor(
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
    private permissionService: PermissionService
  ) {
    this.entiId = localStorage.getItem('tenantId');

    this.breadcrumb.set([
      { label: 'Communication', link: '/app/communication/send' },
      { label: 'Event Mapping' },
    ]);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadTemplates();
    this.loadMappings();
  }

  private initForm(): void {
    this.mappingForm = this.fb.group({
      eventCode: ['', Validators.required],
      channel: ['email', Validators.required],
      templateId: ['', Validators.required],
      status: ['ACTIVE', Validators.required],
    });
  }

  loadTemplates(): void {
    this.commonApi
      .fetchData(
        { entiId: this.entiId },
        'communication/template',
        'list'
      )
      .subscribe({
        next: (res: any) => {
          this.templates = res?.data || [];
          this.prepareTemplateOptions();
        },
        error: (err: any) => {
          this.templates = [];
          this.alert.error(err?.error?.message || 'Failed to load templates');
        },
      });
  }

  loadMappings(): void {
    this.loading = true;

    this.commonApi
      .fetchData(
        { entiId: this.entiId },
        'communication/event-config',
        'list'
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.mappings = res?.data || [];
        },
        error: (err: any) => {
          this.loading = false;
          this.mappings = [];
          this.alert.error(err?.error?.message || 'Failed to load event mappings');
        },
      });
  }

  prepareTemplateOptions(): void {
    this.templateOptions = [
      { label: 'Select', value: '' },
      ...this.templates
        .filter((t: any) => safeTrim(t?.channel).toLowerCase() === 'email')
        .map((t: any) => ({
          label: safeTrim(t?.name || t?.templateName || '-'),
          value: safeTrim(t?.templateId),
        })),
    ];
  }

  newMapping(): void {
    this.mode = 'create';
    this.activeConfigId = '';

    this.mappingForm.reset({
      eventCode: '',
      channel: 'email',
      templateId: '',
      status: 'ACTIVE',
    });

    this.prepareTemplateOptions();
  }

  editMapping(row: any): void {
    // event-row div's (click) opens this same form and bypasses the pencil
    // icon's *appHasPermission gate — check here too.
    if (!this.permissionService.hasPermission('communicationEvent:edit')) return;
    this.mode = 'edit';
    this.activeConfigId = safeTrim(row?.configId || row?._id);

    this.mappingForm.patchValue({
      eventCode: safeTrim(row?.eventCode),
      channel: 'email',
      templateId: safeTrim(row?.templateId),
      status: row?.enabled === false ? 'INACTIVE' : 'ACTIVE',
    });

    this.prepareTemplateOptions();
  }

  saveMapping(): void {
    if (this.loading) return;

    if (this.mappingForm.invalid) {
      this.mappingForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const v = this.mappingForm.value;
    const eventCode = safeTrim(v.eventCode).toUpperCase();
    const selectedEvent = this.eventOptions.find((e) => e.value === eventCode);

    const payload = {
      entiId: this.entiId,
      eventCode,
      eventName: selectedEvent?.label || eventCode,
      sourceModule: this.getSourceModule(eventCode),
      channel: 'email',
      templateId: safeTrim(v.templateId),
      enabled: safeTrim(v.status).toUpperCase() === 'ACTIVE',
    };

    this.loading = true;

    this.commonApi
      .fetchData(payload, 'communication/event-config', 'save')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.alert.success(res?.message || 'Event mapping saved');
          this.newMapping();
          this.loadMappings();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Failed to save mapping');
        },
      });
  }

  deleteMapping(row: any): void {
    const configId = safeTrim(row?.configId || row?._id);

    if (!configId) {
      this.alert.error('Config ID missing');
      return;
    }

    if (!confirm(`Delete mapping for ${row?.eventCode}?`)) return;

    this.loading = true;

    this.commonApi
      .fetchData(
        { entiId: this.entiId, configId },
        'communication/event-config',
        'delete'
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.alert.success(res?.message || 'Mapping deleted');

          if (this.activeConfigId === configId) {
            this.newMapping();
          }

          this.loadMappings();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Failed to delete mapping');
        },
      });
  }

  getSourceModule(eventCode: string): string {
    const code = safeTrim(eventCode).toUpperCase();

    if (code.startsWith('ADMISSION') || code === 'STUDENT_PROFILE_CREATED') {
      return 'ADMISSION';
    }

    if (code.startsWith('BATCH') || code === 'ACADEMIC_YEAR_PROMOTION') {
      return 'BATCH';
    }

    if (code.includes('PAYMENT') || code.includes('CHEQUE')) {
      return 'ACCOUNTS';
    }

    if (code.includes('ABSENCE') || code.includes('ATTENDANCE')) {
      return 'ATTENDANCE';
    }

    if (code.includes('ASSIGNMENT') || code.includes('EXAM')) {
      return 'ASSIGNMENT';
    }

    if (code.includes('CIRCULAR')) {
      return 'CIRCULAR';
    }

    if (code.includes('STUDY_MATERIAL')) {
      return 'STUDY_MATERIAL';
    }

    if (code.includes('PACKAGE')) {
      return 'LIBRARY';
    }

    if (code.includes('FEEDBACK')) {
      return 'FEEDBACK';
    }

    return 'GENERAL';
  }

  getEventLabel(code: string): string {
    return this.eventOptions.find((e) => e.value === code)?.label || code || '-';
  }

  getTemplateName(row: any): string {
    if (row?.templateName) return row.templateName;

    const template = this.templates.find(
      (t: any) => safeTrim(t?.templateId) === safeTrim(row?.templateId)
    );

    return template?.name || '-';
  }

  channelBadge(channel: string): string {
    switch (safeTrim(channel).toLowerCase()) {
      case 'email':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  statusBadge(statusOrEnabled: any): string {
    const active =
      typeof statusOrEnabled === 'boolean'
        ? statusOrEnabled
        : safeTrim(statusOrEnabled).toUpperCase() === 'ACTIVE';

    return active ? 'bg-success' : 'bg-secondary';
  }

  formatStatus(row: any): string {
    return row?.enabled === false ? 'Inactive' : 'Active';
  }

  formatChannel(channel: string): string {
    const ch = safeTrim(channel).toLowerCase();
    return ch ? ch.charAt(0).toUpperCase() + ch.slice(1) : '-';
  }

  formatDate(ts: any): string {
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
}