import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

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

  // ── Attendance (API: student/getattendance/report) ───────────────────────
  columnsArray = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'period', label: 'Period', sortable: false },
    { key: 'topic', label: 'Topic', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];
  dataArray: any[] = [];
  attendanceSummary: any = null;
  totalRecords = 0;

  // ── Assignments (no API yet — dummy data) ────────────────────────────────
  columnsArray1 = [
    { key: 'title', label: 'Title', sortable: false },
    { key: 'sub', label: 'Subject', sortable: false },
    { key: 'due', label: 'Due Date', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];
  dataArray1: any[] = [];
  assignmentData: any[] = [
    {
      title: 'Kinematics Worksheet',
      sub: 'Physics',
      due: '10/01/2025',
      status: 'Completed',
    },
    {
      title: 'Mole Concept Practice',
      sub: 'Chemistry',
      due: '12/01/2025',
      status: 'Pending',
    },
    {
      title: 'Quadratic Equations',
      sub: 'Mathematics',
      due: '15/01/2025',
      status: 'Completed',
    },
    {
      title: "Newton's Laws Assignment",
      sub: 'Physics',
      due: '18/01/2025',
      status: 'Overdue',
    },
    {
      title: 'Periodic Table Test',
      sub: 'Chemistry',
      due: '20/01/2025',
      status: 'Pending',
    },
  ];
  totalRecords1 = 0;

  // ── Exam Results (no API yet — dummy data) ───────────────────────────────
  columnsArray2 = [
    { key: 'exam', label: 'Exam', sortable: false },
    { key: 'date', label: 'Date', sortable: false },
    { key: 'score', label: 'Score', sortable: false },
    { key: 'res', label: 'Result', sortable: false },
  ];
  dataArray2: any[] = [];
  examData: any[] = [
    {
      exam: 'JEE Weekly Test 1',
      date: '25/01/2025',
      score: '78%',
      res: 'Pass',
    },
    {
      exam: 'JEE Weekly Test 2',
      date: '01/02/2025',
      score: '86%',
      res: 'Pass',
    },
  ];
  totalRecords2 = 0;

  // ── PTM (no API yet — dummy data) ────────────────────────────────────────
  columnsArray3 = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'teach', label: 'Teacher', sortable: false },
    { key: 'avg', label: 'Average Score', sortable: false },
    { key: 'discussion', label: 'Key Discussion', sortable: false },
    { key: 'next', label: 'Next PTM', sortable: false },
  ];
  dataArray3 = [
    {
      date: '15-Jan-2026',
      teach: 'Mr. Suresh (Physics)',
      avg: '78%',
      discussion: 'Needs improvement in numerical problem solving',
      next: '25-Feb-2026',
    },
    {
      date: '05-Dec-2025',
      teach: 'Ms. Kavitha (Maths)',
      avg: '82%',
      discussion: 'Good progress, focus on speed and accuracy',
      next: '15-Jan-2026',
    },
  ];

  // ── Feedback / Remarks (API: student/remark/list) ────────────────────────
  columnsArray4 = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'remark', label: 'Remark', sortable: false },
    { key: 'reportedByParent', label: 'Reported By Parent', sortable: false },
  ];
  dataArray4: any[] = [];

  // ── Package / Payments (API: student/finance/summary → receipts) ─────────
  columnsArray5 = [
    { key: 'receiptNo', label: 'Receipt No', sortable: false },
    { key: 'date', label: 'Date', sortable: false },
    { key: 'mode', label: 'Mode', sortable: false },
    { key: 'amount', label: 'Amount', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];
  dataArray5: any[] = [];

  // ── Performance (no API yet — dummy data) ────────────────────────────────
  columnsArray6 = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'exam', label: 'Exam', sortable: false },
    { key: 'phy', label: 'Physics', sortable: false },
    { key: 'mat', label: 'Maths', sortable: false },
    { key: 'bio', label: 'Biology', sortable: false },
    { key: 'chem', label: 'Chemistry', sortable: false },
  ];
  dataArray6 = [
    {
      date: '05-Jan-2026',
      exam: 'Unit Test - 3',
      phy: 72,
      mat: 85,
      bio: 78,
      chem: 80,
    },
    {
      date: '20-Dec-2025',
      exam: 'Monthly Test - December',
      phy: 68,
      mat: 82,
      bio: 75,
      chem: 77,
    },
  ];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private route: ActivatedRoute,
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

    // seed dummy paginated data
    this.loadAssData({ page: 1, pageSize: 5 });
    this.loadExamData({ page: 1, pageSize: 5 });

    this.loadStudentData();
  }

  // ── Main loader — forkJoin all APIs at once ───────────────────────────────
  loadStudentData() {
    this.loading = true;

    const payload = { entiId: this.entiId, studentId: this.studentId };

    forkJoin({
      profile: this.commonApi.fetchData(payload, 'student', 'view'),
      finance: this.commonApi.fetchData(payload, 'student', 'finance/summary'),
      academic: this.commonApi.fetchData(
        payload,
        'student',
        'academic/summary',
      ),
      attendance: this.commonApi.fetchData(
        { entiId: this.entiId, studentNo: this.studentId },
        'student',
        'getattendance/report',
      ),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (results: any) => {
          // ── Profile + Program ────────────────────────────────────────
          const p = results.profile?.data || {};
          const f = results.finance?.data || {};
          const a = results.academic?.data || {};

          this.student = {
            basic: p.basic || {},
            program: p.program || {},
            fees: f || {},
            attendance: a.attendance || {},
            assignments: a.assignments || {},
            exams: a.exams || {},
          };

          // ── Attendance Report ────────────────────────────────────────
          const attData = results.attendance?.data || {};
          this.attendanceSummary = attData.summary || null;
          this.totalRecords = (attData.details || []).length;
          this.dataArray = (attData.details || []).map((r: any) => ({
            date: r.date ? this.fmtEpoch(r.date) : '—',
            period: r.periodNo != null ? `Period ${r.periodNo}` : '—',
            topic: r.topicTaught || '—',
            status: r.status || '—',
          }));

          // ── Finance: receipts → Payments tab ────────────────────────
          this.dataArray5 = (f.receipts || []).map((r: any) => ({
            receiptNo: r.receiptNo || '—',
            date: r.date ? this.fmtEpoch(r.date) : '—',
            mode: r.mode || '—',
            amount:
              r.amount != null
                ? `Rs.${Number(r.amount).toLocaleString('en-IN')}`
                : '—',
            status: r.status || '—',
          }));

          // ── Remarks (needs admissionNo from profile) ─────────────────
          if (p.basic?.admissionNo) {
            this.loadRemarks(p.basic.admissionNo);
          }
        },
        error: (err: any) => {
          this.alert.error(
            err?.error?.message || 'Failed to load student details',
          );
        },
      });
  }

  // ── Remarks — separate call (needs admissionNo) ───────────────────────────
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
        error: () => {
          /* silent — non-critical */
        },
      });
  }

  // ── Assignments dummy pagination ──────────────────────────────────────────
  loadAssData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.assignmentData];

    if (req.search) {
      const v = req.search.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(v)),
      );
    }
    if (req.sortKey) {
      filtered.sort((a, b) => {
        const x = a[req.sortKey!],
          y = b[req.sortKey!];
        return req.sortDirection === 'asc'
          ? String(x).localeCompare(String(y))
          : String(y).localeCompare(String(x));
      });
    }

    this.totalRecords1 = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    this.dataArray1 = filtered.slice(start, start + req.pageSize);
  }

  // ── Exam dummy pagination ─────────────────────────────────────────────────
  loadExamData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.examData];

    if (req.search) {
      const v = req.search.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(v)),
      );
    }
    if (req.sortKey) {
      filtered.sort((a, b) => {
        const x = a[req.sortKey!],
          y = b[req.sortKey!];
        return req.sortDirection === 'asc'
          ? String(x).localeCompare(String(y))
          : String(y).localeCompare(String(x));
      });
    }

    this.totalRecords2 = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    this.dataArray2 = filtered.slice(start, start + req.pageSize);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  fmtEpoch(epoch: any): string {
    if (!epoch) return '—';
    return new Date(Number(epoch)).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
