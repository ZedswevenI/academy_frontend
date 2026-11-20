import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { environment } from '../../../../../environments/environments';

@Component({
  selector: 'app-performance-email-modal',
  standalone: false,
  templateUrl: './performance-email-modal.component.html',
})
export class PerformanceEmailModalComponent implements OnInit {
  @Input() studentId = '';
  @Input() admissionNo = '';
  @Input() studentName = '';
  @Input() academicYear = '';
  @Input() defaultReportType: 'z7i' | 'school' = 'z7i';
  @Output() sent = new EventEmitter<any>();

  show = false;
  loading = false;
  previewLoading = false;
  downloadingReport = false;
  previewData: any = null;
  previewError = '';
  tenantId = localStorage.getItem('tenantId') || '';

  reportType: 'z7i' | 'school' = 'z7i';
  fromDate = '';
  toDate = '';
  examDropdownOpen = false;
  selectedExamIds = new Set<string>();
  allExams: { examId: string; examName: string; dateTs: number | null }[] = [];
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
      sendType: ['NOW', Validators.required],
      scheduledAtInput: [''],
    });
  }

  open(type?: 'z7i' | 'school'): void {
    this.tenantId = localStorage.getItem('tenantId') || this.tenantId;
    this.reportType = type || this.defaultReportType || 'z7i';
    this.fromDate = '';
    this.toDate = '';
    this.examDropdownOpen = false;
    this.selectedExamIds.clear();
    this.allExams = [];
    this.form.reset({
      title: '',
      note: '',
      sendType: 'NOW',
      scheduledAtInput: '',
    });
    this.show = true;
    this.loadStudentExams();
  }

  close(): void {
    this.show = false;
  }

  setReportType(type: 'z7i' | 'school'): void {
    if (this.reportType === type) return;
    this.reportType = type;
    this.selectedExamIds.clear();
    this.allExams = [];
    this.loadStudentExams();
  }

  get examsInDateRange(): { examId: string; examName: string; dateTs: number | null }[] {
    const fromTs = this.fromDate ? new Date(this.fromDate).setHours(0, 0, 0, 0) : null;
    const toTs = this.toDate ? new Date(this.toDate).setHours(23, 59, 59, 999) : null;
    return (this.allExams || []).filter((e) => {
      if (fromTs !== null && (e.dateTs === null || e.dateTs < fromTs)) return false;
      if (toTs !== null && (e.dateTs === null || e.dateTs > toTs)) return false;
      return true;
    });
  }

  get examDropdownLabel(): string {
    const list = this.examsInDateRange;
    if (!list.length) return 'No exams in date range';
    const selectedCount = list.filter((e) => this.selectedExamIds.has(e.examId)).length;
    if (selectedCount === 0) return 'Select Exam(s)';
    if (selectedCount === list.length) return `All Exams (${list.length})`;
    if (selectedCount === 1) {
      const one = list.find((e) => this.selectedExamIds.has(e.examId));
      return one?.examName || '1 exam selected';
    }
    return `${selectedCount} of ${list.length} selected`;
  }

  get allExamsSelected(): boolean {
    const list = this.examsInDateRange;
    return list.length > 0 && list.every((e) => this.selectedExamIds.has(e.examId));
  }

  toggleExamSelection(examId: string): void {
    if (this.selectedExamIds.has(examId)) {
      this.selectedExamIds.delete(examId);
    } else {
      this.selectedExamIds.add(examId);
    }
    this.loadPreview();
  }

  toggleSelectAllExams(): void {
    const list = this.examsInDateRange;
    if (this.allExamsSelected) {
      list.forEach((e) => this.selectedExamIds.delete(e.examId));
    } else {
      list.forEach((e) => this.selectedExamIds.add(e.examId));
    }
    this.loadPreview();
  }

  onDateRangeChange(): void {
    const valid = new Set(this.examsInDateRange.map((e) => e.examId));
    this.selectedExamIds.clear();
    valid.forEach((id) => this.selectedExamIds.add(id));
    this.loadPreview();
  }

  clearFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.examDropdownOpen = false;
    this.selectedExamIds.clear();
    this.allExams.forEach((e) => this.selectedExamIds.add(e.examId));
    this.loadPreview();
  }

  private loadStudentExams(): void {
    if (!this.tenantId || !this.studentId) {
      this.loadPreview();
      return;
    }
    const endpoint =
      this.reportType === 'school' ? 'student/school-list' : 'student/mock-list';
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: this.studentId,
          academicYear: this.academicYear || undefined,
          page: 1,
          limit: 100,
        },
        'performance',
        endpoint,
      )
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          this.allExams = rows.map((r: any) => ({
            examId: String(r.examId || r.examName || ''),
            examName: String(r.examName || r.examId || 'Exam'),
            dateTs:
              this.reportType === 'school'
                ? r.examDate
                  ? Number(r.examDate)
                  : null
                : r.syncedAt
                  ? Number(r.syncedAt)
                  : null,
          }));
          this.selectedExamIds.clear();
          this.examsInDateRange.forEach((e) => this.selectedExamIds.add(e.examId));
          this.loadPreview();
        },
        error: () => {
          this.allExams = [];
          this.loadPreview();
        },
      });
  }

  loadPreview(): void {
    if (!this.tenantId || (!this.studentId && !this.admissionNo)) return;
    const examIds = Array.from(this.selectedExamIds);
    if (this.allExams.length > 0 && !examIds.length) {
      this.previewLoading = false;
      this.previewData = null;
      this.previewError = 'Please select at least one exam.';
      return;
    }
    this.previewLoading = true;
    this.previewError = '';
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: this.studentId || undefined,
          admissionNo: this.admissionNo || undefined,
          academicYear: this.academicYear || undefined,
          reportType: this.reportType,
          examIds: examIds.length ? examIds : undefined,
          fromDate: this.fromDate || undefined,
          toDate: this.toDate || undefined,
        },
        'communication',
        'student-performance/preview',
      )
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

  downloadReport(): void {
    if (!this.tenantId || (!this.studentId && !this.admissionNo)) return;
    const examIds = Array.from(this.selectedExamIds);
    this.downloadingReport = true;
    const token = localStorage.getItem('token') || '';
    this.http
      .post(
        `${environment.baseURL}/communication/student-performance/report-pdf`,
        {
          entiId: this.tenantId,
          studentId: this.studentId || undefined,
          admissionNo: this.admissionNo || undefined,
          academicYear: this.academicYear || undefined,
          reportType: this.reportType,
          examIds: examIds.length ? examIds : undefined,
          fromDate: this.fromDate || undefined,
          toDate: this.toDate || undefined,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          responseType: 'blob',
        },
      )
      .subscribe({
        next: (blob: Blob) => {
          this.downloadingReport = false;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download =
            this.previewData?.reportData?.filename ||
            `${(this.studentName || 'Student').replace(/[^A-Za-z0-9_-]/g, '_')}_${this.admissionNo || this.studentId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.downloadingReport = false;
          this.alert.error('Failed to download performance report');
        },
      });
  }

  submit(): void {
    if (!this.tenantId || (!this.studentId && !this.admissionNo)) return;
    const val = this.form.value;
    let scheduledAt: number | null = null;
    if (val.sendType === 'SCHEDULED') {
      if (!val.scheduledAtInput) {
        this.alert.error('Please select a scheduled date and time');
        return;
      }
      scheduledAt = new Date(val.scheduledAtInput).getTime();
      if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
        this.alert.error('Scheduled time must be in the future');
        return;
      }
    }

    const examIds = Array.from(this.selectedExamIds);
    if (this.allExams.length > 0 && !examIds.length) {
      this.alert.error('Please select at least one exam');
      return;
    }
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          userId: localStorage.getItem('userId') || undefined,
          studentId: this.studentId || undefined,
          admissionNo: this.admissionNo || undefined,
          academicYear: this.academicYear || undefined,
          reportType: this.reportType,
          examIds: examIds.length ? examIds : undefined,
          fromDate: this.fromDate || undefined,
          toDate: this.toDate || undefined,
          title: val.title?.trim() || undefined,
          note: val.note?.trim() || '',
          sendType: val.sendType,
          scheduledAt,
        },
        'communication',
        'student-performance/send',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success(res.message || 'Performance email queued');
            this.sent.emit(res.data);
            this.close();
          } else {
            this.alert.error(res?.message || 'Failed to send performance email');
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(
            err?.error?.message || 'Failed to send performance email',
          );
        },
      });
  }
}
