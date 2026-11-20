import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { environment } from '../../../../../environments/environments';

@Component({
  selector: 'app-school-performance-modal',
  standalone: false,
  templateUrl: './school-performance-modal.component.html',
})
export class SchoolPerformanceModalComponent implements OnInit {
  @Input() batchId = '';
  @Input() batchCode = '';
  @Input() academicYear = '';
  @Output() sent = new EventEmitter<any>();

  show = false;
  loading = false;
  examsLoading = false;
  previewLoading = false;
  downloadingZip = false;
  previewData: any = null;
  previewError = '';
  tenantId = localStorage.getItem('tenantId') || '';

  fromDate = '';
  toDate = '';
  examDropdownOpen = false;
  selectedExamIds = new Set<string>();
  exams: { examId: string; examName: string; examDate: number | null }[] = [];

  students: {
    studentId: string;
    admissionNo: string;
    name: string;
    email: string | null;
    examIds: string[];
    hasRecord: boolean;
  }[] = [];
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
      sendType: ['NOW', Validators.required],
      scheduledAtInput: [''],
    });
  }

  open(): void {
    this.tenantId = localStorage.getItem('tenantId') || this.tenantId;
    this.fromDate = '';
    this.toDate = '';
    this.examDropdownOpen = false;
    this.selectedExamIds.clear();
    this.studentSearch = '';
    this.exams = [];
    this.students = [];
    this.selectedAdmissionNos.clear();
    this.previewData = null;
    this.previewError = '';
    this.form.reset({
      title: '',
      note: '',
      sendType: 'NOW',
      scheduledAtInput: '',
    });
    this.show = true;
    this.loadExamsAndStudents();
  }

  close(): void {
    this.show = false;
  }

  onDateRangeChange(): void {
    this.selectedExamIds.clear();
    this.loadExamsAndStudents();
  }

  get examDropdownLabel(): string {
    if (!this.exams.length) return 'No exams in date range';
    if (this.selectedExamIds.size === 0) return 'Select Exam(s)';
    if (this.selectedExamIds.size === this.exams.length) {
      return `All Exams (${this.exams.length})`;
    }
    if (this.selectedExamIds.size === 1) {
      const id = Array.from(this.selectedExamIds)[0];
      return this.exams.find((e) => e.examId === id)?.examName || '1 exam selected';
    }
    return `${this.selectedExamIds.size} of ${this.exams.length} selected`;
  }

  get allExamsSelected(): boolean {
    return (
      this.exams.length > 0 &&
      this.selectedExamIds.size === this.exams.length
    );
  }

  toggleExamSelection(examId: string): void {
    if (this.selectedExamIds.has(examId)) {
      this.selectedExamIds.delete(examId);
    } else {
      this.selectedExamIds.add(examId);
    }
    this.syncSelectedStudentsToVisible();
    this.loadPreview();
  }

  toggleSelectAllExams(): void {
    if (this.allExamsSelected) {
      this.selectedExamIds.clear();
    } else {
      this.exams.forEach((e) => this.selectedExamIds.add(e.examId));
    }
    this.syncSelectedStudentsToVisible();
    this.loadPreview();
  }

  clearFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.examDropdownOpen = false;
    this.selectedExamIds.clear();
    this.loadExamsAndStudents();
  }

  loadExamsAndStudents(): void {
    if (!this.tenantId || !this.batchId) return;
    this.examsLoading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          batchId: this.batchId,
          academicYear: this.academicYear || undefined,
          fromDate: this.fromDate || undefined,
          toDate: this.toDate || undefined,
        },
        'communication',
        'student-performance/school-exams',
      )
      .subscribe({
        next: (res: any) => {
          this.examsLoading = false;
          this.exams = Array.isArray(res?.data?.exams) ? res.data.exams : [];
          this.students = Array.isArray(res?.data?.students) ? res.data.students : [];
          this.selectedExamIds.clear();
          this.exams.forEach((e) => this.selectedExamIds.add(e.examId));
          this.syncSelectedStudentsToVisible();
          this.loadPreview();
        },
        error: () => {
          this.examsLoading = false;
          this.exams = [];
          this.students = [];
        },
      });
  }

  private studentMatchesExamFilter(s: any): boolean {
    if (!this.exams.length) return false;
    if (!this.selectedExamIds.size) return false;
    return (
      Array.isArray(s.examIds) &&
      s.examIds.some((id: string) => this.selectedExamIds.has(id))
    );
  }

  private syncSelectedStudentsToVisible(): void {
    this.selectedAdmissionNos.clear();
    for (const s of this.students) {
      if (this.studentMatchesExamFilter(s)) {
        this.selectedAdmissionNos.add(s.admissionNo);
      }
    }
  }

  get filteredStudents() {
    const q = this.studentSearch.trim().toLowerCase();
    return this.students.filter((s) => {
      if (q) {
        const hit =
          s.name.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }

  get allStudentsSelected(): boolean {
    return (
      this.students.length > 0 &&
      this.selectedAdmissionNos.size === this.students.length
    );
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
      this.students.forEach((s) => this.selectedAdmissionNos.add(s.admissionNo));
    }
  }

  loadPreview(): void {
    if (!this.tenantId || !this.batchId) return;
    this.previewLoading = true;
    this.previewError = '';
    const admNos = Array.from(this.selectedAdmissionNos);
    const examIds = Array.from(this.selectedExamIds);
    if (!examIds.length) {
      this.previewLoading = false;
      this.previewData = null;
      this.previewError = 'Please select at least one exam.';
      return;
    }
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          batchId: this.batchId,
          admissionNos: admNos.length ? admNos : undefined,
          academicYear: this.academicYear || undefined,
          reportType: 'school',
          examIds,
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
            err?.error?.message || 'Unable to load school performance preview';
        },
      });
  }

  downloadZip(): void {
    const admissionNos = Array.from(this.selectedAdmissionNos);
    const examIds = Array.from(this.selectedExamIds);
    if (!examIds.length) {
      this.alert.error('Please select at least one exam');
      return;
    }
    if (!admissionNos.length) {
      this.alert.error('Please select at least one student');
      return;
    }
    this.downloadingZip = true;
    const token = localStorage.getItem('token') || '';
    this.http
      .post(
        `${environment.baseURL}/communication/student-performance/report-zip`,
        {
          entiId: this.tenantId,
          batchId: this.batchId,
          academicYear: this.academicYear || undefined,
          reportType: 'school',
          admissionNos,
          examIds,
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
          this.downloadingZip = false;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `School_Performance_${this.batchCode || this.batchId}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.downloadingZip = false;
          this.alert.error('Failed to download school performance ZIP');
        },
      });
  }

  submit(): void {
    const admissionNos = Array.from(this.selectedAdmissionNos);
    const examIds = Array.from(this.selectedExamIds);
    if (!examIds.length) {
      this.alert.error('Please select at least one exam');
      return;
    }
    if (!admissionNos.length) {
      this.alert.error('Please select at least one student');
      return;
    }
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

    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          userId: localStorage.getItem('userId') || undefined,
          batchId: this.batchId,
          admissionNos,
          academicYear: this.academicYear || undefined,
          reportType: 'school',
          examIds,
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
            this.alert.success(res.message || 'School performance emails queued');
            this.sent.emit(res.data);
            this.close();
          } else {
            this.alert.error(res?.message || 'Failed to send emails');
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Failed to send emails');
        },
      });
  }
}
