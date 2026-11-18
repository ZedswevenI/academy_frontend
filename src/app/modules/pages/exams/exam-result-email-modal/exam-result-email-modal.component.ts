import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { environment } from '../../../../../environments/environments';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

// Shared "Send Result Email" modal — used both from the Exam View screen
// (bulk, whole exam or selected batches/students, no admissionNo) and
// the Student Result screen (single student, admissionNo set). Shows a
// live visual preview of the email + attached Academic Performance Report
// PDF and lets the user download the report in student-wise mode.
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
  @Input() batches: any[] = [];
  @Output() sent = new EventEmitter<any>();

  show = false;
  loading = false;
  previewLoading = false;
  downloadingReport = false;
  previewData: any = null;
  previewError = '';
  tenantId = localStorage.getItem('tenantId') || '';

  selectedBatchIds = new Set<string>();
  batchStudents: {
    admissionNo: string;
    name: string;
    email: string | null;
    batchId: string | null;
    batchName: string | null;
    hasResult: boolean;
  }[] = [];
  batchStudentsLoading = false;
  selectedAdmissionNos = new Set<string>();
  studentSearch = '';

  form!: FormGroup;

  sendTypeOptions = [
    { label: 'Send Now', value: 'NOW' },
    { label: 'Schedule Later', value: 'SCHEDULED' },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: [''],
      note: [''],
      notifyAbsentees: [false],
      sendType: ['NOW', Validators.required],
      scheduledAtInput: [''],
    });
  }

  open(): void {
    this.tenantId = localStorage.getItem('tenantId') || this.tenantId;
    this.selectedBatchIds.clear();
    (this.batches || []).forEach((b) => {
      if (b?.batchId) this.selectedBatchIds.add(String(b.batchId));
    });
    this.batchStudents = [];
    this.selectedAdmissionNos.clear();
    this.studentSearch = '';
    this.form.reset({
      title: '',
      note: '',
      notifyAbsentees: false,
      sendType: 'NOW',
      scheduledAtInput: '',
    });
    this.show = true;
    if (!this.admissionNo && this.selectedBatchIds.size > 0) {
      this.loadBatchStudents();
    }
    this.loadPreview();
  }

  close(): void {
    this.show = false;
  }

  get allBatchesSelected(): boolean {
    return (
      (this.batches?.length || 0) > 0 &&
      this.selectedBatchIds.size === this.batches.length
    );
  }

  toggleBatchSelection(batchId: string): void {
    const id = safeTrim(batchId);
    if (!id) return;
    if (this.selectedBatchIds.has(id)) {
      this.selectedBatchIds.delete(id);
    } else {
      this.selectedBatchIds.add(id);
    }
    this.loadBatchStudents();
    this.loadPreview();
  }

  toggleSelectAllBatches(): void {
    if (this.allBatchesSelected) {
      this.selectedBatchIds.clear();
    } else {
      (this.batches || []).forEach((b) => {
        if (b?.batchId) this.selectedBatchIds.add(String(b.batchId));
      });
    }
    this.loadBatchStudents();
    this.loadPreview();
  }

  get filteredBatchStudents() {
    const q = this.studentSearch.trim().toLowerCase();
    if (!q) return this.batchStudents;
    return this.batchStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        (s.batchName || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q),
    );
  }

  get allStudentsSelected(): boolean {
    return (
      this.batchStudents.length > 0 &&
      this.selectedAdmissionNos.size === this.batchStudents.length
    );
  }

  loadBatchStudents(): void {
    const batchIds = Array.from(this.selectedBatchIds);
    this.batchStudents = [];
    this.selectedAdmissionNos.clear();
    this.studentSearch = '';
    if (!batchIds.length || !this.examId || !this.tenantId) return;

    this.batchStudentsLoading = true;
    this.commonApi
      .fetchData(
        { entiId: this.tenantId, examId: this.examId, batchIds },
        'communication',
        'exam-result/batch-students',
      )
      .subscribe({
        next: (res: any) => {
          this.batchStudentsLoading = false;
          this.batchStudents = Array.isArray(res?.data) ? res.data : [];
          this.batchStudents.forEach((s) =>
            this.selectedAdmissionNos.add(s.admissionNo),
          );
        },
        error: () => {
          this.batchStudentsLoading = false;
          this.batchStudents = [];
        },
      });
  }

  toggleStudentSelection(admNo: string): void {
    if (this.selectedAdmissionNos.has(admNo)) {
      this.selectedAdmissionNos.delete(admNo);
    } else {
      this.selectedAdmissionNos.add(admNo);
    }
  }

  toggleSelectAllStudents(): void {
    if (this.allStudentsSelected) {
      this.selectedAdmissionNos.clear();
    } else {
      this.batchStudents.forEach((s) =>
        this.selectedAdmissionNos.add(s.admissionNo),
      );
    }
  }

  loadPreview(): void {
    if (!this.examId || !this.tenantId) return;
    this.previewLoading = true;
    this.previewError = '';
    const payload: any = {
      entiId: this.tenantId,
      examId: this.examId,
    };
    if (this.admissionNo) {
      payload.admissionNo = this.admissionNo;
    } else if (this.selectedBatchIds.size > 0) {
      payload.batchIds = Array.from(this.selectedBatchIds);
    }
    this.commonApi
      .fetchData(payload, 'communication', 'exam-result/preview')
      .subscribe({
        next: (res: any) => {
          this.previewLoading = false;
          this.previewData = res?.data || null;
        },
        error: (err: any) => {
          this.previewLoading = false;
          this.previewData = null;
          this.previewError =
            err?.error?.message || 'Unable to load performance report preview';
        },
      });
  }

  downloadPerformanceReport(): void {
    if (this.downloadingReport || !this.examId) return;
    this.downloadingReport = true;
    const payload: any = {
      entiId: this.tenantId,
      examId: this.examId,
    };
    if (this.admissionNo) {
      payload.admissionNo = this.admissionNo;
    } else if (this.selectedBatchIds.size > 0) {
      payload.batchIds = Array.from(this.selectedBatchIds);
    }

    this.http
      .post(`${environment.baseURL}/communication/exam-result/report-pdf`, payload, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob: Blob) => {
          this.downloadingReport = false;
          const filename =
            this.previewData?.reportData?.filename ||
            'Academic_Performance_Report.pdf';
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err: any) => {
          this.downloadingReport = false;
          this.alert.error(
            err?.error?.message || 'Failed to download performance report',
          );
        },
      });
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
    } else if (this.batches?.length) {
      if (!this.selectedBatchIds.size) {
        this.alert.error('Please select at least one batch');
        return;
      }
      if (!this.allBatchesSelected) {
        payload.batchIds = Array.from(this.selectedBatchIds);
      }
      if (this.batchStudents.length) {
        if (!this.selectedAdmissionNos.size) {
          this.alert.error('Please select at least one student');
          return;
        }
        if (this.selectedAdmissionNos.size < this.batchStudents.length) {
          payload.admissionNos = Array.from(this.selectedAdmissionNos);
        }
      }
    }
    if (safeTrim(v.title)) payload.title = safeTrim(v.title);
    if (safeTrim(v.note)) payload.note = safeTrim(v.note);

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
