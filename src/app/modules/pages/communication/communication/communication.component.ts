// import { Component } from '@angular/core';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { filter } from 'rxjs';
// import { Router } from '@angular/router';
// import { AlertService } from '../../../../service/alert/alert.service';

// interface TemplateRow {
//   id: string;
//   name: string;
//   channel: 'email' | 'sms' | 'whatsapp';
//   subject?: string;
//   body: string;
// }

// @Component({
//   selector: 'app-communication',
//   standalone: false,
//   templateUrl: './communication.component.html',
//   styleUrl: './communication.component.scss'
// })
// export class CommunicationComponent {

//   communicationForm!: FormGroup;

//   templates: TemplateRow[] = [
//     {
//       id: 't1',
//       name: 'Fee Reminder',
//       channel: 'email',
//       subject: 'Fee payment reminder - {{studentName}}',
//       body: `<p>Dear <strong>{{parentName}}</strong>,</p>
// <p>This is a gentle reminder that the fee of <strong>{{feeAmount}}</strong> for <strong>{{studentName}}</strong> ({{admissionNo}}) is due on <strong>{{dueDate}}</strong>.</p>
// <p>Thank you,<br>{{instituteName}}</p>`
//     },
//     {
//       id: 't2',
//       name: 'Exam Schedule',
//       channel: 'whatsapp',
//       body: `Hi {{parentName}}, the *{{examName}}* for {{studentName}} ({{className}}) is scheduled on *{{examDate}}*. All the best!\n\n- {{instituteName}}`
//     },
//     {
//       id: 't3',
//       name: 'Attendance Alert',
//       channel: 'sms',
//       body: `Dear {{parentName}}, {{studentName}}'s attendance is {{attendancePct}}. Please contact the institute. - {{instituteName}}`
//     }
//   ];

//   templateOptions = this.templates.map(t => ({ label: t.name + ' (' + t.channel + ')', value: t.id }));

//   availableKeys = [
//     { key: '{{studentName}}',   example: 'Arun Kumar' },
//     { key: '{{admissionNo}}',   example: 'ADM2024001' },
//     { key: '{{className}}',     example: 'Class 10' },
//     { key: '{{batchName}}',     example: 'Batch A' },
//     { key: '{{parentName}}',    example: 'Rajesh Kumar' },
//     { key: '{{feeAmount}}',     example: '₹25,000' },
//     { key: '{{dueDate}}',       example: '15 May 2026' },
//     { key: '{{examName}}',      example: 'Mid-Term Exam' },
//     { key: '{{examDate}}',      example: '20 Apr 2026' },
//     { key: '{{result}}',        example: '92 / 100' },
//     { key: '{{attendancePct}}', example: '94%' },
//     { key: '{{instituteName}}', example: 'Namith Academy' },
//     { key: '{{teacherName}}',   example: 'Ms. Priya' },
//     { key: '{{subject}}',       example: 'Mathematics' },
//     { key: '{{meetingLink}}',   example: 'https://meet.example/abc' }
//   ];

//   class_options = [
//     { label: 'Class 6', value: 'Class 6' },
//     { label: 'Class 7', value: 'Class 7' },
//     { label: 'Class 8', value: 'Class 8' },
//     { label: 'Class 9', value: 'Class 9' },
//     { label: 'Class 10', value: 'Class 10' },
//     { label: 'Class 11', value: 'Class 11' },
//     { label: 'Class 12', value: 'Class 12' }
//   ];
//   batch_options = [
//     { label: 'Batch A', value: 'Batch A' },
//     { label: 'Batch B', value: 'Batch B' },
//     { label: 'Batch C', value: 'Batch C' }
//   ]
//   student_options = [
//     { label: 'Arun Kumar', value: 'Arun Kumar' },
//     { label: 'Divya Sharma', value: 'Divya Sharma' },
//     { label: 'Rahul Verma', value: 'Rahul Verma' },
//     { label: 'Sneha Patel', value: 'Sneha Patel' },
//     { label: 'Karthik R', value: 'Karthik R' }
//   ];

//   constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router, private alertService: AlertService) {
//     this.breadcrump.set([{ label: 'Communiation', link: '/app/communication' }, {label: 'Create'}]);
//   }

//   ngOnInit() {
//     this.communicationForm = this.fb.group({
//       filter: ['', [Validators.required]],
//       templateId: ['', [Validators.required]],
//       whatsapp: [false],
//       mail: [false],
//       sms: [false]
//     });

//     const controls = ['whatsapp', 'mail', 'sms'];

//     controls.forEach(ctrl => {
//       this.communicationForm.get(ctrl)?.valueChanges.subscribe(val => {
//         if (val) {
//           controls.forEach(other => {
//             if (other !== ctrl) {
//               this.communicationForm.get(other)?.setValue(false, { emitEvent: false });
//             }
//           });
//         }
//       });
//     });
//     this.communicationForm.get('templateId')?.valueChanges.subscribe(id => {
//       const t = this.selectedTemplate;
//       if (!t) return;
//       this.communicationForm.patchValue({
//         whatsapp: t.channel === 'whatsapp',
//         mail: t.channel === 'email',
//         sms: t.channel === 'sms'
//       }, { emitEvent: false });
//     });
//   }

//   get selectedTemplate(): TemplateRow | null {
//     const id = this.communicationForm?.get('templateId')?.value;
//     return this.templates.find(t => t.id === id) || null;
//   }

//   get previewSubject(): string {
//     return this.replaceKeys(this.selectedTemplate?.subject || '');
//   }

//   get previewBody(): string {
//     const body = this.selectedTemplate?.body || '';
//     if (this.selectedTemplate && this.selectedTemplate.channel !== 'email') {
//       return this.replaceKeys(body).replace(/\n/g, '<br>');
//     }
//     return this.replaceKeys(body);
//   }

//   private replaceKeys(text: string): string {
//     let out = text || '';
//     this.availableKeys.forEach(k => {
//       out = out.split(k.key).join(`<mark>${k.example}</mark>`);
//     });
//     return out;
//   }

//   channelBadgeClass(ch: string): string {
//     switch (ch) {
//       case 'email': return 'bg-primary';
//       case 'sms': return 'bg-warning text-dark';
//       case 'whatsapp': return 'bg-success';
//       default: return 'bg-secondary';
//     }
//   }

//   onSubmit() {
//     this.alertService.success('Record saved successfully!');
//   }
// }

import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

interface TemplateRow {
  templateId: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  body: string;
}

@Component({
  selector: 'app-communication',
  standalone: false,
  templateUrl: './communication.component.html',
  styleUrl: './communication.component.scss',
})
export class CommunicationComponent {
  communicationForm!: FormGroup;
  loading = false;
  entiId: any;
  templates: TemplateRow[] = [];
  templateOptions: any[] = [{ label: 'Select', value: '' }];
  recipientPreview: any = null;
  sendTypeOptions = [
    { label: 'Send Now', value: 'NOW' },
    { label: 'Schedule Later', value: 'SCHEDULED' },
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
    { key: '{{feeAmount}}', example: '₹25,000' },
    { key: '{{dueDate}}', example: '15 May 2026' },
    { key: '{{examName}}', example: 'Mid-Term Exam' },
    { key: '{{examDate}}', example: '20 Apr 2026' },
    { key: '{{result}}', example: '92 / 100' },
    { key: '{{attendancePct}}', example: '94%' },
    { key: '{{instituteName}}', example: 'ZEDSWEVEN I PRIVATE LIMITED' },
    { key: '{{teacherName}}', example: 'Ms. Priya' },
    { key: '{{subject}}', example: 'Mathematics' },
    { key: '{{meetingLink}}', example: 'https://meet.example/abc' },
  ];
  batch_options: any[] = [{ label: 'Select', value: '' }];
  student_options: any[] = [{ label: 'Select', value: '' }];

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private alertService: AlertService,
    private commonApi: CommonapiService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrump.set([
      { label: 'Communiation', link: '/app/communication' },
      { label: 'Create' },
    ]);
  }

  ngOnInit() {
    this.communicationForm = this.fb.group({
      title: ['', [Validators.required]],
      filter: ['', [Validators.required]],
      templateId: ['', [Validators.required]],
      sendType: ['NOW', [Validators.required]],
      scheduledAtInput: [''],
      whatsapp: [false],
      mail: [true],
      sms: [false],
    });
    this.setupChannelToggle();
    this.loadReferenceData();
    this.communicationForm.get('templateId')?.valueChanges.subscribe(() => {
      const t = this.selectedTemplate;
      if (!t) return;
      this.communicationForm.patchValue(
        {
          whatsapp: t.channel === 'whatsapp',
          mail: t.channel === 'email',
          sms: t.channel === 'sms',
        },
        { emitEvent: false },
      );
    });
    this.communicationForm.get('filter')?.valueChanges.subscribe(() => {
      this.recipientPreview = null;
    });
  }

  private setupChannelToggle() {
    const controls = ['whatsapp', 'mail', 'sms'];
    controls.forEach((ctrl) => {
      this.communicationForm.get(ctrl)?.valueChanges.subscribe((val) => {
        if (val) {
          controls.forEach((other) => {
            if (other !== ctrl) {
              this.communicationForm.get(other)?.setValue(false, {
                emitEvent: false,
              });
            }
          });
        }
      });
    });
  }

  private loadReferenceData() {
    forkJoin({
      templates: this.commonApi
        .fetchData({ entiId: this.entiId }, 'communication', 'template/list')
        .pipe(catchError(() => of({ data: [] }))),
      batches: this.commonApi
        .fetchData(
          { entiId: this.entiId, list: 'full' },
          'batch',
          'list?list=full',
        )
        .pipe(catchError(() => of({ data: [] }))),
      students: this.commonApi
        .fetchData({ entiId: this.entiId }, 'student', 'list?list=full')
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe(({ templates, batches, students }: any) => {
      this.templates = (templates?.data || [])
        .filter((t: any) => safeTrim(t?.channel) === 'email')
        .map((t: any) => ({
          templateId: safeTrim(t?.templateId),
          name: safeTrim(t?.name),
          channel: safeTrim(t?.channel || 'email') as any,
          subject: safeTrim(t?.subject || ''),
          body: t?.body || '',
        }));
      this.templateOptions = [
        { label: 'Select', value: '' },
        ...this.templates.map((t: any) => ({
          label: `${t.name} (${t.channel})`,
          value: t.templateId,
        })),
      ];
      const batchRows = batches?.data?.rows || batches?.data || [];
      this.batch_options = [
        { label: 'Select', value: '' },
        ...batchRows.map((b: any) => ({
          label: `${safeTrim(b?.batchName || '-')} (${safeTrim(b?.batchCode || '-')})`,
          value: safeTrim(b?.batchId),
        })),
      ];
      const studentRows = students?.data?.rows || students?.data || [];
      this.student_options = [
        { label: 'Select', value: '' },
        ...studentRows.map((s: any) => ({
          label: `${safeTrim(s?.student?.name || '-')} (${safeTrim(s?.admissionNo || '-')})`,
          value: safeTrim(s?.studentId),
        })),
      ];
    });
  }

  get selectedTemplate(): TemplateRow | null {
    const id = this.communicationForm?.get('templateId')?.value;
    return this.templates.find((t) => t.templateId === id) || null;
  }

  get previewSubject(): string {
    return this.replaceKeys(this.selectedTemplate?.subject || '');
  }

  get previewBody(): string {
    const body = this.selectedTemplate?.body || '';
    return this.replaceKeys(body);
  }

  private replaceKeys(text: string): string {
    let out = text || '';
    this.availableKeys.forEach((k) => {
      out = out.split(k.key).join(`<mark>${k.example}</mark>`);
    });
    return out;
  }

  channelBadgeClass(ch: string): string {
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

  private buildFilters(): any {
    const raw = this.communicationForm.get('filter')?.value;
    const filters: any = {};
    if (!raw) return filters;
    if (typeof raw === 'object') {
      const batchVal =
        raw.batchId ||
        raw.batch ||
        raw.value1 ||
        raw.option1 ||
        raw.selected1 ||
        raw.label1;
      const studentVal =
        raw.studentId ||
        raw.student ||
        raw.value2 ||
        raw.option2 ||
        raw.selected2 ||
        raw.label2;
      if (batchVal) filters.batchId = safeTrim(batchVal);
      if (studentVal) filters.studentId = safeTrim(studentVal);
      return filters;
    }
    const val = safeTrim(raw);
    if (this.batch_options.some((b: any) => safeTrim(b.value) === val)) {
      filters.batchId = val;
      return filters;
    }
    if (this.student_options.some((s: any) => safeTrim(s.value) === val)) {
      filters.studentId = val;
      return filters;
    }
    return filters;
  }

  private scheduledInputToEpoch(): number {
    const v = safeTrim(this.communicationForm.get('scheduledAtInput')?.value);
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  previewRecipients() {
    const filters = this.buildFilters();
    if (!Object.keys(filters).length) {
      this.alertService.error('Please select class, batch or student');
      return;
    }
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.entiId,
          filters,
        },
        'communication',
        'recipients/preview',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.recipientPreview = res?.data || null;
          this.alertService.success(
            res?.message || 'Recipients preview loaded',
          );
        },
        error: (err: any) => {
          this.loading = false;
          this.recipientPreview = null;
          this.alertService.error(
            err?.error?.message || 'Failed to preview recipients',
          );
        },
      });
  }

  onSubmit() {
    if (this.loading) return;
    if (this.communicationForm.invalid) {
      this.communicationForm.markAllAsTouched();
      this.alertService.error('Please fill all required fields');
      return;
    }
    const v = this.communicationForm.getRawValue();
    if (!v.mail) {
      this.alertService.error('Only Email channel is supported now');
      return;
    }
    const filters = this.buildFilters();
    if (!Object.keys(filters).length) {
      this.alertService.error('Please select class, batch or student');
      return;
    }
    const payload: any = {
      entiId: this.entiId,
      title: safeTrim(v.title),
      templateId: safeTrim(v.templateId),
      filters,
      sendType: safeTrim(v.sendType) || 'NOW',
    };
    if (payload.sendType === 'SCHEDULED') {
      const scheduledAt = this.scheduledInputToEpoch();
      if (!scheduledAt || scheduledAt <= Date.now()) {
        this.alertService.error('Please select a valid future schedule date');
        return;
      }
      payload.scheduledAt = scheduledAt;
    }
    this.loading = true;
    this.commonApi.fetchData(payload, 'communication', 'send').subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alertService.success(
          res?.message || 'Communication queued successfully',
        );
        this.router.navigate(['/app/communication/sent-logs']);
      },
      error: (err: any) => {
        this.loading = false;
        this.alertService.error(err?.error?.message || 'Communication failed');
      },
    });
  }
}
