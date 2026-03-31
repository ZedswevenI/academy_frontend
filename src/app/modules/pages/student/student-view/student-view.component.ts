// import { Component, OnInit } from '@angular/core';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
// import { ActivatedRoute, Router } from '@angular/router';
// import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
// import { AlertService } from '../../../../service/alert/alert.service';
// import { forkJoin } from 'rxjs';
// import { finalize } from 'rxjs/operators';

// const safeTrim = (v: any) =>
//   v === undefined || v === null ? '' : String(v).trim();

// @Component({
//   selector: 'app-student-view',
//   standalone: false,
//   templateUrl: './student-view.component.html',
//   styleUrl: './student-view.component.scss',
// })
// export class StudentViewComponent implements OnInit {
//   loading = false;
//   entiId: any;
//   studentId = '';
//   student: any = null;
//   columnsArray = [
//     { key: 'date', label: 'Date', sortable: false },
//     { key: 'period', label: 'Period', sortable: false },
//     { key: 'topic', label: 'Topic', sortable: false },
//     { key: 'status', label: 'Status', sortable: false },
//   ];
//   dataArray: any[] = [];
//   attendanceSummary: any = null;
//   totalRecords = 0;

//   // ── Assignments (no API yet — dummy data) ────────────────────────────────
//   columnsArray1 = [
//     { key: 'title', label: 'Title', sortable: false },
//     { key: 'sub', label: 'Subject', sortable: false },
//     { key: 'due', label: 'Due Date', sortable: false },
//     { key: 'status', label: 'Status', sortable: false },
//   ];
//   dataArray1: any[] = [];
//   assignmentData: any[] = [
//     {
//       title: 'Kinematics Worksheet',
//       sub: 'Physics',
//       due: '10/01/2025',
//       status: 'Completed',
//     },
//     {
//       title: 'Mole Concept Practice',
//       sub: 'Chemistry',
//       due: '12/01/2025',
//       status: 'Pending',
//     },
//     {
//       title: 'Quadratic Equations',
//       sub: 'Mathematics',
//       due: '15/01/2025',
//       status: 'Completed',
//     },
//     {
//       title: "Newton's Laws Assignment",
//       sub: 'Physics',
//       due: '18/01/2025',
//       status: 'Overdue',
//     },
//     {
//       title: 'Periodic Table Test',
//       sub: 'Chemistry',
//       due: '20/01/2025',
//       status: 'Pending',
//     },
//   ];
//   totalRecords1 = 0;

//   // ── Exam Results (no API yet — dummy data) ───────────────────────────────
//   columnsArray2 = [
//     { key: 'exam', label: 'Exam', sortable: false },
//     { key: 'date', label: 'Date', sortable: false },
//     { key: 'score', label: 'Score', sortable: false },
//     { key: 'res', label: 'Result', sortable: false },
//   ];
//   dataArray2: any[] = [];
//   examData: any[] = [
//     {
//       exam: 'JEE Weekly Test 1',
//       date: '25/01/2025',
//       score: '78%',
//       res: 'Pass',
//     },
//     {
//       exam: 'JEE Weekly Test 2',
//       date: '01/02/2025',
//       score: '86%',
//       res: 'Pass',
//     },
//   ];
//   totalRecords2 = 0;

//   // ── PTM (no API yet — dummy data) ────────────────────────────────────────
//   columnsArray3 = [
//     { key: 'date', label: 'Date', sortable: false },
//     { key: 'teach', label: 'Teacher', sortable: false },
//     { key: 'avg', label: 'Average Score', sortable: false },
//     { key: 'discussion', label: 'Key Discussion', sortable: false },
//     { key: 'next', label: 'Next PTM', sortable: false },
//   ];
//   dataArray3 = [
//     {
//       date: '15-Jan-2026',
//       teach: 'Mr. Suresh (Physics)',
//       avg: '78%',
//       discussion: 'Needs improvement in numerical problem solving',
//       next: '25-Feb-2026',
//     },
//     {
//       date: '05-Dec-2025',
//       teach: 'Ms. Kavitha (Maths)',
//       avg: '82%',
//       discussion: 'Good progress, focus on speed and accuracy',
//       next: '15-Jan-2026',
//     },
//   ];

//   // ── Feedback / Remarks (API: student/remark/list) ────────────────────────
//   columnsArray4 = [
//     { key: 'date', label: 'Date', sortable: false },
//     { key: 'type', label: 'Type', sortable: false },
//     { key: 'remark', label: 'Remark', sortable: false },
//     { key: 'reportedByParent', label: 'Reported By Parent', sortable: false },
//   ];
//   dataArray4: any[] = [];

//   // ── Package / Payments (API: student/finance/summary → receipts) ─────────
//   columnsArray5 = [
//     { key: 'receiptNo', label: 'Receipt No', sortable: false },
//     { key: 'date', label: 'Date', sortable: false },
//     { key: 'mode', label: 'Mode', sortable: false },
//     { key: 'amount', label: 'Amount', sortable: false },
//     { key: 'status', label: 'Status', sortable: false },
//   ];
//   dataArray5: any[] = [];

//   // ── Performance (no API yet — dummy data) ────────────────────────────────
//   columnsArray6 = [
//     { key: 'date', label: 'Date', sortable: false },
//     { key: 'exam', label: 'Exam', sortable: false },
//     { key: 'phy', label: 'Physics', sortable: false },
//     { key: 'mat', label: 'Maths', sortable: false },
//     { key: 'bio', label: 'Biology', sortable: false },
//     { key: 'chem', label: 'Chemistry', sortable: false },
//   ];
//   dataArray6 = [
//     {
//       date: '05-Jan-2026',
//       exam: 'Unit Test - 3',
//       phy: 72,
//       mat: 85,
//       bio: 78,
//       chem: 80,
//     },
//     {
//       date: '20-Dec-2025',
//       exam: 'Monthly Test - December',
//       phy: 68,
//       mat: 82,
//       bio: 75,
//       chem: 77,
//     },
//   ];

//   constructor(
//     private breadcrump: BredcrumpService,
//     private router: Router,
//     private commonApi: CommonapiService,
//     private alert: AlertService,
//     private route: ActivatedRoute,
//   ) {
//     this.breadcrump.set([
//       { label: 'Student', link: '/app/student' },
//       { label: 'View' },
//     ]);
//   }

//   ngOnInit(): void {
//     this.entiId = localStorage.getItem('tenantId');
//     this.studentId = safeTrim(this.route.snapshot.paramMap.get('id'));

//     if (!this.studentId) {
//       this.alert.error('Student ID missing');
//       this.router.navigate(['/app/student']);
//       return;
//     }

//     // seed dummy paginated data
//     this.loadAssData({ page: 1, pageSize: 5 });
//     this.loadExamData({ page: 1, pageSize: 5 });

//     this.loadStudentData();
//   }

//   // ── Main loader — forkJoin all APIs at once ───────────────────────────────
//   loadStudentData() {
//     this.loading = true;

//     const payload = { entiId: this.entiId, studentId: this.studentId };

//     forkJoin({
//       profile: this.commonApi.fetchData(payload, 'student', 'view'),
//       finance: this.commonApi.fetchData(payload, 'student', 'finance/summary'),
//       academic: this.commonApi.fetchData(
//         payload,
//         'student',
//         'academic/summary',
//       ),
//       attendance: this.commonApi.fetchData(
//         { entiId: this.entiId, studentNo: this.studentId },
//         'student',
//         'getattendance/report',
//       ),
//     })
//       .pipe(finalize(() => (this.loading = false)))
//       .subscribe({
//         next: (results: any) => {
//           // ── Profile + Program ────────────────────────────────────────
//           const p = results.profile?.data || {};
//           const f = results.finance?.data || {};
//           const a = results.academic?.data || {};

//           this.student = {
//             basic: p.basic || {},
//             program: p.program || {},
//             fees: f || {},
//             attendance: a.attendance || {},
//             assignments: a.assignments || {},
//             exams: a.exams || {},
//           };

//           // ── Attendance Report ────────────────────────────────────────
//           const attData = results.attendance?.data || {};
//           this.attendanceSummary = attData.summary || null;
//           this.totalRecords = (attData.details || []).length;
//           this.dataArray = (attData.details || []).map((r: any) => ({
//             date: r.date ? this.fmtEpoch(r.date) : '—',
//             period: r.periodNo != null ? `Period ${r.periodNo}` : '—',
//             topic: r.topicTaught || '—',
//             status: r.status || '—',
//           }));

//           // ── Finance: receipts → Payments tab ────────────────────────
//           this.dataArray5 = (f.receipts || []).map((r: any) => ({
//             receiptNo: r.receiptNo || '—',
//             date: r.date ? this.fmtEpoch(r.date) : '—',
//             mode: r.mode || '—',
//             amount:
//               r.amount != null
//                 ? `Rs.${Number(r.amount).toLocaleString('en-IN')}`
//                 : '—',
//             status: r.status || '—',
//           }));

//           // ── Remarks (needs admissionNo from profile) ─────────────────
//           if (p.basic?.admissionNo) {
//             this.loadRemarks(p.basic.admissionNo);
//           }
//         },
//         error: (err: any) => {
//           this.alert.error(
//             err?.error?.message || 'Failed to load student details',
//           );
//         },
//       });
//   }

//   // ── Remarks — separate call (needs admissionNo) ───────────────────────────
//   loadRemarks(admissionNo: string) {
//     if (!admissionNo) return;
//     this.commonApi
//       .fetchData({ entiId: this.entiId, admissionNo }, 'student', 'remark/list')
//       .subscribe({
//         next: (res: any) => {
//           this.dataArray4 = (res?.data || []).map((r: any) => ({
//             date: r.dateOfIncident ? this.fmtEpoch(r.dateOfIncident) : '—',
//             type: r.type || '—',
//             remark: r.remark || '—',
//             reportedByParent: r.reportedByParent ? 'Yes' : 'No',
//           }));
//         },
//         error: () => {
//           /* silent — non-critical */
//         },
//       });
//   }

//   // ── Assignments dummy pagination ──────────────────────────────────────────
//   loadAssData(req: {
//     page: number;
//     pageSize: number;
//     search?: string;
//     sortKey?: string;
//     sortDirection?: 'asc' | 'desc';
//   }) {
//     let filtered = [...this.assignmentData];

//     if (req.search) {
//       const v = req.search.toLowerCase();
//       filtered = filtered.filter((row) =>
//         Object.values(row).some((val) => String(val).toLowerCase().includes(v)),
//       );
//     }
//     if (req.sortKey) {
//       filtered.sort((a, b) => {
//         const x = a[req.sortKey!],
//           y = b[req.sortKey!];
//         return req.sortDirection === 'asc'
//           ? String(x).localeCompare(String(y))
//           : String(y).localeCompare(String(x));
//       });
//     }

//     this.totalRecords1 = filtered.length;
//     const start = (req.page - 1) * req.pageSize;
//     this.dataArray1 = filtered.slice(start, start + req.pageSize);
//   }

//   // ── Exam dummy pagination ─────────────────────────────────────────────────
//   loadExamData(req: {
//     page: number;
//     pageSize: number;
//     search?: string;
//     sortKey?: string;
//     sortDirection?: 'asc' | 'desc';
//   }) {
//     let filtered = [...this.examData];

//     if (req.search) {
//       const v = req.search.toLowerCase();
//       filtered = filtered.filter((row) =>
//         Object.values(row).some((val) => String(val).toLowerCase().includes(v)),
//       );
//     }
//     if (req.sortKey) {
//       filtered.sort((a, b) => {
//         const x = a[req.sortKey!],
//           y = b[req.sortKey!];
//         return req.sortDirection === 'asc'
//           ? String(x).localeCompare(String(y))
//           : String(y).localeCompare(String(x));
//       });
//     }

//     this.totalRecords2 = filtered.length;
//     const start = (req.page - 1) * req.pageSize;
//     this.dataArray2 = filtered.slice(start, start + req.pageSize);
//   }

//   // ── Helpers ───────────────────────────────────────────────────────────────
//   getInitials(name: string): string {
//     if (!name) return '?';
//     const parts = name.trim().split(' ');
//     const first = parts[0]?.[0] ?? '';
//     const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
//     return (first + last).toUpperCase();
//   }

//   fmtEpoch(epoch: any): string {
//     if (!epoch) return '—';
//     return new Date(Number(epoch)).toLocaleDateString('en-GB', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     });
//   }
// }

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

  // ── Photo ──────────────────────────────────────────────────────────────────
  photoUrl: string | null = null;
  activeViewTab: 'program' | 'attendance' | 'assignments' | 'late' | 'remarks' = 'program';

  // ── Edit Profile ──────────────────────────────────────────────────────────
  showEditModal = false;
  editLoading = false;
  editForm!: FormGroup;

  // ── Attendance ────────────────────────────────────────────────────────────
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

  // ── Assignment Results ────────────────────────────────────────────────────
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

  // topic-wise summary
  topicSummary: { [topic: string]: { total: number; completed: number } } = {};

  // ── Remarks ───────────────────────────────────────────────────────────────
  columnsArray4 = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'remark', label: 'Remark', sortable: false },
    { key: 'reportedByParent', label: 'Reported By Parent', sortable: false },
  ];
  dataArray4: any[] = [];

  // Add Remark
  showRemarkForm = false;
  remarkLoading = false;
  remarkTypes = ['ACADEMIC', 'BEHAVIOUR', 'ATTENDANCE', 'HEALTH', 'OTHER'];
  newRemark = { type: 'ACADEMIC', dateOfIncident: '', remark: '', reportedByParent: true };

  // ── Late Entries ──────────────────────────────────────────────────────────
  columnsLate = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'periodNo', label: 'Period', sortable: false },
    { key: 'entryType', label: 'Type', sortable: false },
    { key: 'delay', label: 'Delay (min)', sortable: false },
    { key: 'reason', label: 'Reason', sortable: false },
  ];
  lateEntries: any[] = [];
  lateLoading = false;

  // ── Payments ──────────────────────────────────────────────────────────────
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

  // ── Edit form ─────────────────────────────────────────────────────────────
  private initEditForm() {
    this.editForm = this.fb.group({
      name: ['', [Validators.required]],
      phone: [''],
      email: [''],
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
      email: b.email || '',
      parentName: b.parentName || '',
      parentPhone: b.parentMobile || '',
      addressLine1: b.addressLine1 || '',
      city: b.city || '',
      gender: b.gender || '',
      dob: b.dob ? this.epochToDateInput(b.dob) : '',
    });
    this.showEditModal = true;
  }

  closeEditModal() { this.showEditModal = false; }

  saveProfile() {
    if (this.editLoading) return;
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const v = this.editForm.value;
    const payload: any = {
      entiId: this.entiId,
      studentId: this.studentId,
      name: safeTrim(v.name),
      phone: safeTrim(v.phone) || null,
      email: safeTrim(v.email) || null,
      parentName: safeTrim(v.parentName) || null,
      parentMobile: safeTrim(v.parentPhone) || null,
      addressLine1: safeTrim(v.addressLine1) || null,
      city: safeTrim(v.city) || null,
      gender: safeTrim(v.gender) || null,
      dob: v.dob ? new Date(`${v.dob}T00:00:00`).getTime() : null,
    };
    this.editLoading = true;
    this.commonApi.fetchData(payload, 'student', 'basic-details/update').subscribe({
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
        'student', 'getattendance/report'
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

          // Photo
          this.photoUrl = p.basic?.photoUrl || null;

          // Attendance
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

          // Finance receipts
          this.dataArray5 = (f.receipts || []).map((r: any) => ({
            receiptNo: r.receiptNo || '—',
            date: r.date ? this.fmtEpoch(r.date) : '—',
            mode: r.mode || '—',
            amount: r.amount != null ? `₹${Number(r.amount).toLocaleString('en-IN')}` : '—',
            status: r.status || '—',
          }));

          // Load secondary data after profile is available
          if (p.basic?.admissionNo) {
            this.loadRemarks(p.basic.admissionNo);
            this.loadAssignmentResults(p.basic.admissionNo);
          }
          this.loadLateEntries();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed to load student details');
        },
      });
  }

  // ── Remarks ───────────────────────────────────────────────────────────────
  loadRemarks(admissionNo: string) {
    if (!admissionNo) return;
    this.commonApi.fetchData({ entiId: this.entiId, admissionNo }, 'student', 'remark/list')
      .subscribe({
        next: (res: any) => {
          this.dataArray4 = (res?.data || []).map((r: any) => ({
            date: r.dateOfIncident ? this.fmtEpoch(r.dateOfIncident) : '—',
            type: r.type || '—',
            remark: r.remark || '—',
            reportedByParent: r.reportedByParent ? 'Yes' : 'No',
          }));
        },
        error: () => { },
      });
  }

  toggleRemarkForm() { this.showRemarkForm = !this.showRemarkForm; }

  submitRemark() {
    if (this.remarkLoading) return;
    if (!safeTrim(this.newRemark.remark)) { this.alert.error('Remark is required'); return; }
    if (!this.newRemark.dateOfIncident) { this.alert.error('Date is required'); return; }

    const admissionNo = safeTrim(this.student?.basic?.admissionNo);
    if (!admissionNo) return;

    const payload = {
      entiId: this.entiId,
      admissionNo,
      type: this.newRemark.type,
      dateOfIncident: new Date(`${this.newRemark.dateOfIncident}T00:00:00`).getTime(),
      remark: safeTrim(this.newRemark.remark),
      reportedByParent: this.newRemark.reportedByParent,
    };

    this.remarkLoading = true;
    this.commonApi.fetchData(payload, 'student', 'remark/add').subscribe({
      next: () => {
        this.remarkLoading = false;
        this.alert.success('Remark added');
        this.showRemarkForm = false;
        this.newRemark = { type: 'ACADEMIC', dateOfIncident: '', remark: '', reportedByParent: true };
        this.loadRemarks(admissionNo);
      },
      error: (err: any) => {
        this.remarkLoading = false;
        this.alert.error(err?.error?.message || 'Failed to add remark');
      },
    });
  }

  // ── Assignment Results ────────────────────────────────────────────────────
  loadAssignmentResults(admissionNo: string) {
    this.commonApi.fetchData(
      { entiId: this.entiId, admissionNo },
      'assignment', 'result/list/student'
    ).subscribe({
      next: (res: any) => {
        const rows = res?.data || [];

        // Flat table rows
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

        // Topic-wise summary
        const summary: { [topic: string]: { total: number; completed: number } } = {};
        for (const r of rows) {
          const topic = safeTrim(r.topicId || 'Unknown');
          if (!summary[topic]) summary[topic] = { total: 0, completed: 0 };
          summary[topic].total++;
          if (r.status === 'completed') summary[topic].completed++;
        }
        this.topicSummary = summary;
      },
      error: () => { this.dataArray1 = []; this.topicSummary = {}; },
    });
  }

  get topicSummaryKeys(): string[] { return Object.keys(this.topicSummary); }

  // ── Late Entries ──────────────────────────────────────────────────────────
  loadLateEntries() {
    this.lateLoading = true;
    this.commonApi.fetchData(
      { entiId: this.entiId, studentNo: this.studentId },
      'timetable', 'late-entry/list/student'
    ).subscribe({
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
      error: () => { this.lateLoading = false; this.lateEntries = []; },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (parts[0]?.[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  fmtEpoch(epoch: any): string {
    if (!epoch) return '—';
    return new Date(Number(epoch)).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  private epochToDateInput(ms: any): string {
    const n = Number(ms);
    if (!n) return '';
    const d = new Date(n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ── Excel Export ─────────────────────────────────────────────────────────
  exportToExcel() {
    if (!this.student) {
      this.alert.error('No student data to export');
      return;
    }

    const wb = XLSX.utils.book_new();
    const b = this.student.basic || {};
    const p = this.student.program || {};
    const f = this.student.fees || {};

    // Sheet 1: Profile
    const profileRows = [
      { Field: 'Name', Value: b.name || '—' },
      { Field: 'Admission No', Value: b.admissionNo || '—' },
      { Field: 'Status', Value: b.status || '—' },
      { Field: 'Mobile', Value: b.mobile || '—' },
      { Field: 'Email', Value: b.email || '—' },
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
      { Field: 'Joining Date', Value: p.joiningDate ? this.fmtEpoch(p.joiningDate) : '—' },
      { Field: 'Mentor', Value: p.mentorName || '—' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profileRows), 'Profile');

    // Sheet 2: Finance
    const financeRows = [
      { Field: 'Total Amount', Value: f.totalAmount ?? 0 },
      { Field: 'Paid Amount', Value: f.paidAmount ?? 0 },
      { Field: 'Outstanding Amount', Value: f.outstandingAmount ?? 0 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financeRows), 'Finance');

    // Sheet 3: Attendance
    if (this.dataArray.length) {
      const attRows = this.dataArray.map((r: any) => ({
        Date: r.date,
        Period: r.period,
        Subject: r.subject,
        Topic: r.topic,
        Feedback: r.feedback,
        Status: r.status,
      }));
      // Add summary row at top
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attRows), 'Attendance');
    }

    // Sheet 4: Assignments
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assRows), 'Assignments');
    }

    // Sheet 5: Remarks
    if (this.dataArray4.length) {
      const remRows = this.dataArray4.map((r: any) => ({
        Date: r.date,
        Type: r.type,
        Remark: r.remark,
        'Reported By Parent': r.reportedByParent,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(remRows), 'Remarks');
    }

    // Sheet 6: Late Entries
    if (this.lateEntries.length) {
      const lateRows = this.lateEntries.map((r: any) => ({
        Date: r.date,
        Period: r.periodNo,
        Type: r.entryType,
        'Delay (min)': r.delay,
        Reason: r.reason,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lateRows), 'Late Entries');
    }

    // Sheet 7: Payments
    if (this.dataArray5.length) {
      const payRows = this.dataArray5.map((r: any) => ({
        'Receipt No': r.receiptNo,
        Date: r.date,
        Mode: r.mode,
        Amount: r.amount,
        Status: r.status,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payRows), 'Payments');
    }

    const fileName = `Student_${b.admissionNo || b.name || 'Export'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}