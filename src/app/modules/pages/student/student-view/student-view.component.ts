import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

@Component({
  selector: 'app-student-view',
  standalone: false,
  templateUrl: './student-view.component.html',
  styleUrl: './student-view.component.scss',
})
export class StudentViewComponent implements OnInit {
  loading = false;
  entiId: any;
  studentId = '';
  student: any = null;
  photoUrl: string | null = null;
  activeViewTab: 'program' | 'attendance' | 'assignments' | 'late' | 'remarks' =
    'program';
  showEditModal = false;
  editLoading = false;
  editForm!: FormGroup;
  columnsArray = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'period', label: 'Period', sortable: false },
    { key: 'subject', label: 'Subject', sortable: false },
    { key: 'topic', label: 'Topic', sortable: false },
    { key: 'feedback', label: 'Feedback', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];
  dataArray: any[] = [];
  attendanceSummary: any = null;
  totalRecords = 0;
  columnsArray1 = [
    { key: 'testNo', label: 'Test No', sortable: false },
    { key: 'testCode', label: 'Test Code', sortable: false },
    { key: 'subject', label: 'Subject', sortable: false },
    { key: 'topic', label: 'Topic', sortable: false },
    { key: 'subTopic', label: 'Sub Topic', sortable: false },
    { key: 'marks', label: 'Marks', sortable: false },
    { key: 'completedAt', label: 'Date', sortable: false },
  ];
  dataArray1: any[] = [];
  topicSummary: { [topic: string]: { total: number; completed: number } } = {};
  columnsArray4 = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'remark', label: 'Remark', sortable: false },
    { key: 'reportedByParent', label: 'Reported By Parent', sortable: false },
  ];
  dataArray4: any[] = [];
  showRemarkForm = false;
  remarkLoading = false;
  remarkTypes = ['ACADEMIC', 'BEHAVIOUR', 'ATTENDANCE', 'HEALTH', 'OTHER'];
  newRemark = {
    type: 'ACADEMIC',
    dateOfIncident: '',
    remark: '',
    reportedByParent: true,
  };
  columnsLate = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'periodNo', label: 'Period', sortable: false },
    { key: 'entryType', label: 'Type', sortable: false },
    { key: 'delay', label: 'Delay (min)', sortable: false },
    { key: 'reason', label: 'Reason', sortable: false },
  ];
  lateEntries: any[] = [];
  lateLoading = false;
  columnsArray5 = [
    { key: 'receiptNo', label: 'Receipt No', sortable: false },
    { key: 'date', label: 'Date', sortable: false },
    { key: 'mode', label: 'Mode', sortable: false },
    { key: 'amount', label: 'Amount', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];
  dataArray5: any[] = [];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
  ) {
    this.breadcrump.set([
      { label: 'Student', link: '/app/student' },
      { label: 'View' },
    ]);
  }

  ngOnInit(): void {
    this.entiId = localStorage.getItem('tenantId');
    this.studentId = safeTrim(this.route.snapshot.paramMap.get('id'));
    if (!this.studentId) {
      this.alert.error('Student ID missing');
      this.router.navigate(['/app/student']);
      return;
    }
    this.initEditForm();
    this.loadStudentData();
  }

  private initEditForm() {
    this.editForm = this.fb.group({
      name: ['', [Validators.required]],
      phone: [''],
      phone1: [''],
      phone2: [''],
      email: [''],
      email1: [''],
      email2: [''],
      parentName: [''],
      parentPhone: [''],
      addressLine1: [''],
      city: [''],
      gender: [''],
      dob: [''],
    });
  }

  openEditProfile() {
    const b = this.student?.basic || {};
    this.editForm.patchValue({
      name: b.name || '',
      phone: b.mobile || '',
      phone1: b.phone1 || '',
      phone2: b.phone2 || '',
      email: b.email || '',
      email1: b.email1 || '',
      email2: b.email2 || '',
      parentName: b.parentName || '',
      parentPhone: b.parentMobile || '',
      addressLine1: b.addressLine1 || '',
      city: b.city || '',
      gender: b.gender || '',
      dob: b.dob ? this.epochToDateInput(b.dob) : '',
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  saveProfile() {
    if (this.editLoading) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    const payload: any = {
      entiId: this.entiId,
      studentId: this.studentId,
      name: safeTrim(v.name),
      phone: safeTrim(v.phone) || null,
      phone1: safeTrim(v.phone1) || null,
      phone2: safeTrim(v.phone2) || null,
      email: safeTrim(v.email) || null,
      email1: safeTrim(v.email1) || null,
      email2: safeTrim(v.email2) || null,
      parentName: safeTrim(v.parentName) || null,
      parentMobile: safeTrim(v.parentPhone) || null,
      addressLine1: safeTrim(v.addressLine1) || null,
      city: safeTrim(v.city) || null,
      gender: safeTrim(v.gender) || null,
      dob: v.dob ? new Date(`${v.dob}T00:00:00`).getTime() : null,
    };
    this.editLoading = true;
    this.commonApi
      .fetchData(payload, 'student', 'basic-details/update')
      .subscribe({
        next: () => {
          this.editLoading = false;
          this.alert.success('Profile updated');
          this.closeEditModal();
          this.loadStudentData();
        },
        error: (err: any) => {
          this.editLoading = false;
          this.alert.error(err?.error?.message || 'Update failed');
        },
      });
  }

  // ── Main loader ───────────────────────────────────────────────────────────
  loadStudentData() {
    this.loading = true;
    const payload = { entiId: this.entiId, studentId: this.studentId };

    forkJoin({
      profile: this.commonApi.fetchData(payload, 'student', 'view'),
      finance: this.commonApi.fetchData(payload, 'student', 'finance/summary'),
      attendance: this.commonApi.fetchData(
        { entiId: this.entiId, studentNo: this.studentId },
        'student',
        'getattendance/report',
      ),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (results: any) => {
          const p = results.profile?.data || {};
          const f = results.finance?.data || {};
          this.student = {
            basic: p.basic || {},
            program: p.program || {},
            fees: f || {},
          };
          this.photoUrl = p.basic?.photoUrl || null;
          const attData = results.attendance?.data || {};
          this.attendanceSummary = attData.summary || null;
          this.totalRecords = (attData.details || []).length;
          this.dataArray = (attData.details || []).map((r: any) => ({
            date: r.date ? this.fmtEpoch(r.date) : '—',
            period: r.periodNo != null ? `Period ${r.periodNo}` : '—',
            subject: r.subjectName || '—',
            topic: r.topicTaught || '—',
            feedback: r.feedback || '—',
            status: r.status || '—',
          }));
          this.dataArray5 = (f.receipts || []).map((r: any) => ({
            receiptNo: r.receiptNo || '—',
            date: r.date ? this.fmtEpoch(r.date) : '—',
            mode: r.mode || '—',
            amount:
              r.amount != null
                ? `₹${Number(r.amount).toLocaleString('en-IN')}`
                : '—',
            status: r.status || '—',
          }));
          if (p.basic?.admissionNo) {
            this.loadRemarks(p.basic.admissionNo);
            this.loadAssignmentResults(p.basic.admissionNo);
          }
          this.loadLateEntries();
        },
        error: (err: any) => {
          this.alert.error(
            err?.error?.message || 'Failed to load student details',
          );
        },
      });
  }

  loadRemarks(admissionNo: string) {
    if (!admissionNo) return;
    this.commonApi
      .fetchData({ entiId: this.entiId, admissionNo }, 'student', 'remark/list')
      .subscribe({
        next: (res: any) => {
          this.dataArray4 = (res?.data || []).map((r: any) => ({
            date: r.dateOfIncident ? this.fmtEpoch(r.dateOfIncident) : '—',
            type: r.type || '—',
            remark: r.remark || '—',
            reportedByParent: r.reportedByParent ? 'Yes' : 'No',
          }));
        },
        error: () => {},
      });
  }

  toggleRemarkForm() {
    this.showRemarkForm = !this.showRemarkForm;
  }

  submitRemark() {
    if (this.remarkLoading) return;
    if (!safeTrim(this.newRemark.remark)) {
      this.alert.error('Remark is required');
      return;
    }
    if (!this.newRemark.dateOfIncident) {
      this.alert.error('Date is required');
      return;
    }
    const admissionNo = safeTrim(this.student?.basic?.admissionNo);
    if (!admissionNo) return;
    const payload = {
      entiId: this.entiId,
      admissionNo,
      type: this.newRemark.type,
      dateOfIncident: new Date(
        `${this.newRemark.dateOfIncident}T00:00:00`,
      ).getTime(),
      remark: safeTrim(this.newRemark.remark),
      reportedByParent: this.newRemark.reportedByParent,
    };
    this.remarkLoading = true;
    this.commonApi.fetchData(payload, 'student', 'remark/add').subscribe({
      next: () => {
        this.remarkLoading = false;
        this.alert.success('Remark added');
        this.showRemarkForm = false;
        this.newRemark = {
          type: 'ACADEMIC',
          dateOfIncident: '',
          remark: '',
          reportedByParent: true,
        };
        this.loadRemarks(admissionNo);
      },
      error: (err: any) => {
        this.remarkLoading = false;
        this.alert.error(err?.error?.message || 'Failed to add remark');
      },
    });
  }

  loadAssignmentResults(admissionNo: string) {
    this.commonApi
      .fetchData(
        { entiId: this.entiId, admissionNo },
        'assignment',
        'result/list/student',
      )
      .subscribe({
        next: (res: any) => {
          const rows = res?.data || [];
          this.dataArray1 = rows.map((r: any) => ({
            testNo: r.testNo || '—',
            testCode: r.testCode || '—',
            subject: r.subjectId || '—',
            topic: r.topicId || '—',
            subTopic: r.subTopicId || '—',
            marks: r.answers
              ? `${r.answers.filter((a: any) => a.isCorrect).length}/${r.answers.length}`
              : '—',
            completedAt: r.completedAt ? this.fmtEpoch(r.completedAt) : '—',
          }));
          const summary: {
            [topic: string]: { total: number; completed: number };
          } = {};
          for (const r of rows) {
            const topic = safeTrim(r.topicId || 'Unknown');
            if (!summary[topic]) summary[topic] = { total: 0, completed: 0 };
            summary[topic].total++;
            if (r.status === 'completed') summary[topic].completed++;
          }
          this.topicSummary = summary;
        },
        error: () => {
          this.dataArray1 = [];
          this.topicSummary = {};
        },
      });
  }

  get topicSummaryKeys(): string[] {
    return Object.keys(this.topicSummary);
  }

  loadLateEntries() {
    this.lateLoading = true;
    this.commonApi
      .fetchData(
        { entiId: this.entiId, studentNo: this.studentId },
        'timetable',
        'late-entry/list/student',
      )
      .subscribe({
        next: (res: any) => {
          this.lateLoading = false;
          this.lateEntries = (res?.data || []).map((r: any) => ({
            date: r.date ? this.fmtEpoch(r.date) : '—',
            periodNo: r.periodNo != null ? `Period ${r.periodNo}` : '—',
            entryType: r.entryType || 'LATE',
            delay: r.delayMinutes ?? '—',
            reason: r.reason || '—',
          }));
        },
        error: () => {
          this.lateLoading = false;
          this.lateEntries = [];
        },
      });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (
      parts[0]?.[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')
    ).toUpperCase();
  }

  fmtEpoch(epoch: any): string {
    if (!epoch) return '—';
    return new Date(Number(epoch)).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private epochToDateInput(ms: any): string {
    const n = Number(ms);
    if (!n) return '';
    const d = new Date(n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  exportToExcel() {
    if (!this.student) {
      this.alert.error('No student data to export');
      return;
    }
    const wb = XLSX.utils.book_new();
    const b = this.student.basic || {};
    const p = this.student.program || {};
    const f = this.student.fees || {};
    const profileRows = [
      { Field: 'Name', Value: b.name || '—' },
      { Field: 'Admission No', Value: b.admissionNo || '—' },
      { Field: 'Status', Value: b.status || '—' },
      { Field: 'Mobile', Value: b.mobile || '—' },
      { Field: 'Email', Value: b.email || '—' },
      { Field: 'Mother Mobile', Value: b.phone1 || '—' },
      { Field: 'Alternate Mobile', Value: b.phone2 || '—' },
      { Field: 'Mother Email', Value: b.email1 || '—' },
      { Field: 'Alternate Email', Value: b.email2 || '—' },
      { Field: 'Parent Name', Value: b.parentName || '—' },
      { Field: 'Parent Mobile', Value: b.parentMobile || '—' },
      { Field: 'Gender', Value: b.gender || '—' },
      { Field: 'DOB', Value: b.dob ? this.fmtEpoch(b.dob) : '—' },
      { Field: 'Address', Value: b.addressLine1 || '—' },
      { Field: 'City', Value: b.city || '—' },
      { Field: 'Program', Value: p.programName || '—' },
      { Field: 'Batch', Value: p.batchName || '—' },
      { Field: 'Center', Value: p.centerName || '—' },
      { Field: 'Academic Year', Value: p.academicYear || '—' },
      {
        Field: 'Joining Date',
        Value: p.joiningDate ? this.fmtEpoch(p.joiningDate) : '—',
      },
      { Field: 'Mentor', Value: p.mentorName || '—' },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(profileRows),
      'Profile',
    );
    const financeRows = [
      { Field: 'Total Amount', Value: f.totalAmount ?? 0 },
      { Field: 'Paid Amount', Value: f.paidAmount ?? 0 },
      { Field: 'Outstanding Amount', Value: f.outstandingAmount ?? 0 },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(financeRows),
      'Finance',
    );
    if (this.dataArray.length) {
      const attRows = this.dataArray.map((r: any) => ({
        Date: r.date,
        Period: r.period,
        Subject: r.subject,
        Topic: r.topic,
        Feedback: r.feedback,
        Status: r.status,
      }));
      if (this.attendanceSummary) {
        const s = this.attendanceSummary;
        attRows.unshift({
          Date: `Total: ${s.totalPeriods}`,
          Period: `Present: ${s.present}`,
          Subject: `Absent: ${s.absent}`,
          Topic: `Late: ${s.late}`,
          Feedback: `Percentage: ${s.attendancePercentage}%`,
          Status: '',
        });
      }
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(attRows),
        'Attendance',
      );
    }
    if (this.dataArray1.length) {
      const assRows = this.dataArray1.map((r: any) => ({
        'Test No': r.testNo,
        'Test Code': r.testCode,
        Subject: r.subject,
        Topic: r.topic,
        'Sub Topic': r.subTopic,
        Marks: r.marks,
        Date: r.completedAt,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(assRows),
        'Assignments',
      );
    }
    if (this.dataArray4.length) {
      const remRows = this.dataArray4.map((r: any) => ({
        Date: r.date,
        Type: r.type,
        Remark: r.remark,
        'Reported By Parent': r.reportedByParent,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(remRows),
        'Remarks',
      );
    }
    if (this.lateEntries.length) {
      const lateRows = this.lateEntries.map((r: any) => ({
        Date: r.date,
        Period: r.periodNo,
        Type: r.entryType,
        'Delay (min)': r.delay,
        Reason: r.reason,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(lateRows),
        'Late Entries',
      );
    }
    if (this.dataArray5.length) {
      const payRows = this.dataArray5.map((r: any) => ({
        'Receipt No': r.receiptNo,
        Date: r.date,
        Mode: r.mode,
        Amount: r.amount,
        Status: r.status,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(payRows),
        'Payments',
      );
    }
    const fileName = `Student_${b.admissionNo || b.name || 'Export'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}
