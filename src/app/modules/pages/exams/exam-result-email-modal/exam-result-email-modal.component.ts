import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

// Shared "Send Result Email" modal — used both from the Exam View screen
// (bulk, whole exam or one batch, no admissionNo) and the Student Result
// screen (single student, admissionNo set). The email content itself is
// fixed server-side (communication/exam-result/send no longer accepts a
// template/subject/body) — this modal only controls WHO gets it and
// whether absent students get the absence-notice variant.
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
  // Already-loaded batch list ({batchId, label}) from the host screen, used
  // for the optional "limit to one batch" dropdown in bulk mode — avoids a
  // duplicate fetch of the same exam/batch list the host already has.
  @Input() batches: any[] = [];
  @Output() sent = new EventEmitter<any>();

  show = false;
  loading = false;
  tenantId = localStorage.getItem('tenantId') || '';

  form!: FormGroup;

  sendTypeOptions = [
    { label: 'Send Now', value: 'NOW' },
    { label: 'Schedule Later', value: 'SCHEDULED' },
  ];

  constructor(
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: [''],
      batchId: [''],
      notifyAbsentees: [false],
      sendType: ['NOW', Validators.required],
      scheduledAtInput: [''],
    });
  }

  open(): void {
    this.form.reset({
      title: '',
      batchId: '',
      notifyAbsentees: false,
      sendType: 'NOW',
      scheduledAtInput: '',
    });
    this.show = true;
  }

  close(): void {
    this.show = false;
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
      notifyAbsentees: !!v.notifyAbsentees,
      sendType: safeTrim(v.sendType) || 'NOW',
    };
    if (this.admissionNo) {
      payload.admissionNo = this.admissionNo;
    } else if (safeTrim(v.batchId)) {
      payload.batchId = safeTrim(v.batchId);
    }
    if (safeTrim(v.title)) payload.title = safeTrim(v.title);

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
              `Targeted ${d.totalTargeted ?? 0} — ${d.queuedMarksCount ?? 0} result emails, ${d.queuedAbsentCount ?? 0} absence notices queued`,
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
