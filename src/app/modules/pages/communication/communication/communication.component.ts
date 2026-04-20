import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter } from 'rxjs';
import { Router } from '@angular/router';
import { AlertService } from '../../../../service/alert/alert.service';

interface TemplateRow {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  body: string;
}

@Component({
  selector: 'app-communication',
  standalone: false,
  templateUrl: './communication.component.html',
  styleUrl: './communication.component.scss'
})
export class CommunicationComponent {

  communicationForm!: FormGroup;

  templates: TemplateRow[] = [
    {
      id: 't1',
      name: 'Fee Reminder',
      channel: 'email',
      subject: 'Fee payment reminder - {{studentName}}',
      body: `<p>Dear <strong>{{parentName}}</strong>,</p>
<p>This is a gentle reminder that the fee of <strong>{{feeAmount}}</strong> for <strong>{{studentName}}</strong> ({{admissionNo}}) is due on <strong>{{dueDate}}</strong>.</p>
<p>Thank you,<br>{{instituteName}}</p>`
    },
    {
      id: 't2',
      name: 'Exam Schedule',
      channel: 'whatsapp',
      body: `Hi {{parentName}}, the *{{examName}}* for {{studentName}} ({{className}}) is scheduled on *{{examDate}}*. All the best!\n\n- {{instituteName}}`
    },
    {
      id: 't3',
      name: 'Attendance Alert',
      channel: 'sms',
      body: `Dear {{parentName}}, {{studentName}}'s attendance is {{attendancePct}}. Please contact the institute. - {{instituteName}}`
    }
  ];

  templateOptions = this.templates.map(t => ({ label: t.name + ' (' + t.channel + ')', value: t.id }));

  availableKeys = [
    { key: '{{studentName}}',   example: 'Arun Kumar' },
    { key: '{{admissionNo}}',   example: 'ADM2024001' },
    { key: '{{className}}',     example: 'Class 10' },
    { key: '{{batchName}}',     example: 'Batch A' },
    { key: '{{parentName}}',    example: 'Rajesh Kumar' },
    { key: '{{feeAmount}}',     example: '₹25,000' },
    { key: '{{dueDate}}',       example: '15 May 2026' },
    { key: '{{examName}}',      example: 'Mid-Term Exam' },
    { key: '{{examDate}}',      example: '20 Apr 2026' },
    { key: '{{result}}',        example: '92 / 100' },
    { key: '{{attendancePct}}', example: '94%' },
    { key: '{{instituteName}}', example: 'Namith Academy' },
    { key: '{{teacherName}}',   example: 'Ms. Priya' },
    { key: '{{subject}}',       example: 'Mathematics' },
    { key: '{{meetingLink}}',   example: 'https://meet.example/abc' }
  ];

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' }
  ];
  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]
  student_options = [
    { label: 'Arun Kumar', value: 'Arun Kumar' },
    { label: 'Divya Sharma', value: 'Divya Sharma' },
    { label: 'Rahul Verma', value: 'Rahul Verma' },
    { label: 'Sneha Patel', value: 'Sneha Patel' },
    { label: 'Karthik R', value: 'Karthik R' }
  ];

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router, private alertService: AlertService) {
    this.breadcrump.set([{ label: 'Communiation', link: '/app/communication' }, {label: 'Create'}]);
  }

  ngOnInit() {
    this.communicationForm = this.fb.group({
      filter: ['', [Validators.required]],
      templateId: ['', [Validators.required]],
      whatsapp: [false],
      mail: [false],
      sms: [false]
    });

    const controls = ['whatsapp', 'mail', 'sms'];

    controls.forEach(ctrl => {
      this.communicationForm.get(ctrl)?.valueChanges.subscribe(val => {
        if (val) {
          controls.forEach(other => {
            if (other !== ctrl) {
              this.communicationForm.get(other)?.setValue(false, { emitEvent: false });
            }
          });
        }
      });
    });

    // Auto-tick the channel matching the selected template
    this.communicationForm.get('templateId')?.valueChanges.subscribe(id => {
      const t = this.selectedTemplate;
      if (!t) return;
      this.communicationForm.patchValue({
        whatsapp: t.channel === 'whatsapp',
        mail: t.channel === 'email',
        sms: t.channel === 'sms'
      }, { emitEvent: false });
    });
  }

  get selectedTemplate(): TemplateRow | null {
    const id = this.communicationForm?.get('templateId')?.value;
    return this.templates.find(t => t.id === id) || null;
  }

  get previewSubject(): string {
    return this.replaceKeys(this.selectedTemplate?.subject || '');
  }

  get previewBody(): string {
    const body = this.selectedTemplate?.body || '';
    // For non-email channels keep plain text newlines, else render as HTML
    if (this.selectedTemplate && this.selectedTemplate.channel !== 'email') {
      return this.replaceKeys(body).replace(/\n/g, '<br>');
    }
    return this.replaceKeys(body);
  }

  private replaceKeys(text: string): string {
    let out = text || '';
    this.availableKeys.forEach(k => {
      out = out.split(k.key).join(`<mark>${k.example}</mark>`);
    });
    return out;
  }

  channelBadgeClass(ch: string): string {
    switch (ch) {
      case 'email': return 'bg-primary';
      case 'sms': return 'bg-warning text-dark';
      case 'whatsapp': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  onSubmit() {
    this.alertService.success('Record saved successfully!');

    // const { whatsapp, mail, sms } = this.communicationForm.value;

    // if (whatsapp) {
    //   this.router.navigate(['/app/communication/whatsApp']);
    // }
    // else if (mail) {
    //   this.router.navigate(['/app/communication/email']);
    // }
    // else if (sms) {
    //   this.router.navigate(['/app/communication/message']);
    // }
    // else {
    //   alert('Please select one communication option');
    // }
  }
}
