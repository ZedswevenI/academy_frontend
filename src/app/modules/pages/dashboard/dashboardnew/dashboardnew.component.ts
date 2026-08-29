import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import * as XLSX from 'xlsx';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { DashboardService } from '../dashboard.service';
import { PermissionService } from '../../../../shared/permission.service';

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  delta: number;
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'red' | 'teal';
  sub: string;
  trend: number[];
  route?: string;
  scrollTo?: string;
  byBatch?: { batchCode: string; count: number }[];
  showBatchHover?: boolean;
  permissionKey: string;
}

interface ActivityItem {
  activityId: string;
  activityName: string;
  batchCode: string;
  startDate: number;
  endDate: number;
  status: string;
  remarks: string | null;
  centerCode: string | null;
}

interface PtmItem {
  ptmId?: string;
  student: string;
  parent: string;
  batch: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Confirmed' | 'Pending' | 'Cancelled';
}

interface Performer {
  name: string;
  batch: string;
  score: number;
  avatar: string;
}

interface StaffDept {
  name: string;
  count: number;
  total: number;
  color: string;
}

interface UserRow {
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Invited' | 'Inactive';
  avatar: string;
  tone: 'blue' | 'green' | 'amber' | 'violet';
}

interface InactiveUser {
  userId: string;
  name: string;
  email: string;
  roleLabel: string;
  centerName: string | null;
  lastLoginAt: string | null;
  neverLoggedIn: boolean;
  daysSinceLogin: number | null;
  avatar: string;
}

interface AbsentStudent {
  studentId: string;
  admissionNo: string;
  remarks: string | null;
  studentName: string;
  batchCode: string;
  batchName: string;
  date: number;
  attendanceId?: string;
  studentPhone?: string | null;
  studentPhone1?: string | null;
  studentPhone2?: string | null;
  parentPhone?: string | null;
}

interface PeriodAbsentStudent {
  studentId: string;
  admissionNo: string;
  studentName: string;
  remarks: string | null;
  batchCode: string;
  date: number;
  periodNo: number;
  subjectId: string;
  facultyId: string;
  attendanceId?: string;
  studentPhone?: string | null;
  studentPhone1?: string | null;
  studentPhone2?: string | null;
  parentPhone?: string | null;
}

@Component({
  selector: 'app-dashboardnew',
  standalone: false,
  templateUrl: './dashboardnew.component.html',
  styleUrl: './dashboardnew.component.scss',
})
export class DashboardnewComponent implements OnInit, OnDestroy {
  @ViewChild('staffDeptSection') staffDeptSectionRef!: ElementRef;
  today = new Date();
  private destroy$ = new Subject<void>();
  loading = true;
  error: string | null = null;
  selectedPeriod: 'week' | 'month' | 'quarter' = 'week';
  username: any = '';
  attendanceType: 'school' | 'period' = 'school';
  attendanceBatchCode = '';
  attendanceBatches: string[] = [];
  examType: 'mock' | 'school' = 'mock';
  examFilter: 'all' | 'toppers' | 'average' | 'below' = 'all';
  assignFilter: 'all' | 'toppers' | 'average' | 'below' = 'all';
  rawMockExam: any[] = [];
  rawSchoolExam: any[] = [];
  rawAssignment: any[] = [];

  private get entiId(): string {
    try {
      const direct = localStorage.getItem('tenantId');
      if (direct) return direct;
      const user = JSON.parse(
        localStorage.getItem('user') ||
          localStorage.getItem('authUser') ||
          '{}',
      );
      return user?.entiId || user?.tenantId || '';
    } catch {
      return '';
    }
  }

  kpis: KpiCard[] = [
    {
      label: 'Active Batches',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-layer-group',
      tone: 'blue',
      sub: 'Loading...',
      trend: [],
      route: '/app/batch',
      permissionKey: 'dashboard:viewActiveBatches',
    },
    {
      label: 'Total Students',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-user-graduate',
      tone: 'green',
      sub: 'Loading...',
      trend: [],
      byBatch: [],
      showBatchHover: false,
      permissionKey: 'dashboard:viewTotalStudents',
    },
    {
      label: 'Total Staff',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-chalkboard-user',
      tone: 'violet',
      sub: 'Loading...',
      trend: [],
      scrollTo: 'staffDeptSection',
      permissionKey: 'dashboard:viewTotalStaff',
    },
    {
      label: 'System Users',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-users',
      tone: 'amber',
      sub: 'Loading...',
      trend: [],
      route: '/app/org-master/users',
      permissionKey: 'dashboard:viewSystemUsers',
    },
    {
      label: 'Today Absentees',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-user-slash',
      tone: 'red',
      sub: 'Loading...',
      trend: [],
      permissionKey: 'dashboard:viewTodayAbsentees',
    },
    {
      label: 'Total Questions',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-circle-question',
      tone: 'teal',
      sub: 'Loading...',
      trend: [],
      permissionKey: 'dashboard:viewTotalQuestions',
    },
  ];

  get visibleKpis(): KpiCard[] {
    return this.kpis.filter((k) => this.permissionService.hasPermission(k.permissionKey));
  }

  performers: Performer[] = [];
  staffDepts: StaffDept[] = [];
  recentUsers: UserRow[] = [];
  inactiveUsers: InactiveUser[] = [];
  inactiveUsersCount = 0;
  ptms: PtmItem[] = [];
  upcomingActivities: ActivityItem[] = [];
todayAbsentList: AbsentStudent[] = [];
todayPeriodAbsentList: PeriodAbsentStudent[] = [];
todayAbsentCount = 0;
activeAbsentTab: 'school' | 'period' = 'school';

remarksModalOpen = false;
remarksModalTab: 'school' | 'period' = 'school';
remarksModalStudent: AbsentStudent | PeriodAbsentStudent | null = null;
remarksModalText = '';
remarksSaving = false;
remarksError: string | null = null;

  attendanceLineData: ChartData<'line'> = { labels: [], datasets: [] };
  attendanceLineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          afterBody: (items: any[]) => {
            const raw = items[0]?.raw as any;
            if (raw?.markedBatches !== undefined) {
              return [
                `Marked: ${raw.markedBatches} batches`,
                `Not marked: ${raw.notMarkedBatches} batches`,
              ];
            }
            return [];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 0,
        max: 100,
        ticks: {
          font: { size: 11 },
          color: '#94A3B8',
          callback: (v) => v + '%',
        },
        grid: { color: 'rgba(148,163,184,0.12)' },
      },
      x: {
        ticks: { font: { size: 11 }, color: '#94A3B8' },
        grid: { display: false },
      },
    },
  };

  // Exam performance charts
  examBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  assignBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { font: { size: 11 }, color: '#94A3B8' },
        grid: { color: 'rgba(148,163,184,0.12)' },
      },
      x: {
        ticks: { font: { size: 11 }, color: '#94A3B8' },
        grid: { display: false },
      },
    },
  };

  // Program pie chart
  programPieData: ChartData<'pie'> = { labels: [], datasets: [] };
  programPieOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 12,
          font: { size: 11 },
          color: '#475569',
        },
      },
    },
  };

  private readonly CHART_COLORS = [
    'rgba(37,99,235,0.85)',
    'rgba(99,102,241,0.85)',
    'rgba(16,185,129,0.85)',
    'rgba(245,158,11,0.85)',
    'rgba(239,68,68,0.85)',
    'rgba(139,92,246,0.85)',
    'rgba(14,165,233,0.85)',
    'rgba(236,72,153,0.85)',
  ];
  private readonly DEPT_COLORS = [
    '#2563EB',
    '#10B981',
    '#8B5CF6',
    '#F59E0B',
    '#EF4444',
    '#0EA5E9',
    '#EC4899',
    '#14B8A6',
  ];

  constructor(
    private breadcrump: BredcrumpService,
    private dashboardService: DashboardService,
    private el: ElementRef,
    private permissionService: PermissionService,
  ) {
    this.breadcrump.set([{ label: 'Dashboard' }]);
    this.username = localStorage.getItem('name');
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    if (!this.entiId) {
      this.error = 'Tenant not found. Please log in again.';
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = null;
    this.dashboardService
      .getSummary(this.entiId, this.selectedPeriod)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.status) {
            this.error = res?.message || 'Failed to load dashboard';
            return;
          }
          const d = res.data;
          this.buildKpis(d.kpis);
          this.buildAttendanceChart(d.attendanceTrend);
          this.attendanceBatches = d.attendanceTrend?.batches || [];
          this.buildProgramChart(d.studentsByProgram);
          this.buildExamCharts(d.batchPerformance);
          this.buildStaffDepts(d.staffByDepartment);
          this.buildRecentUsers(d.recentUsers);
          this.buildInactiveUsers(d.inactiveUsers);
          this.buildPtms(d.upcomingPtms?.data || []);
          this.buildActivities(d.upcomingActivities?.data || []);
        },
        error: (err: any) => {
          this.error = err?.error?.message || 'Failed to load dashboard.';
        },
      });
  }

  onPeriodChange(period: 'week' | 'month' | 'quarter'): void {
    this.selectedPeriod = period;
    this.loadAttendanceTrend();
  }

  onAttendanceTypeChange(): void {
    this.loadAttendanceTrend();
  }

  onAttendanceBatchChange(): void {
    this.loadAttendanceTrend();
  }

  private loadAttendanceTrend(): void {
    this.dashboardService
      .getAttendanceTrend(
        this.entiId,
        this.selectedPeriod,
        this.attendanceType,
        this.attendanceBatchCode,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.status) this.buildAttendanceChart(res.data);
        },
      });
  }

  private buildKpis(kpis: any): void {
    if (!kpis) return;
    const updates = [
      {
        value: (kpis.batches?.total ?? 0).toString(),
        sub: 'Currently active',
        byBatch: null,
      },
      {
        value: (kpis.students?.total ?? 0).toLocaleString(),
        sub: `${(kpis.students?.byBatch || []).length} batches`,
        byBatch: kpis.students?.byBatch || [],
      },
      {
        value: (kpis.staff?.total ?? 0).toString(),
        sub: `${kpis.staff?.teaching ?? 0} teaching · ${kpis.staff?.nonTeaching ?? 0} admin`,
        byBatch: null,
      },
      {
        value: (kpis.users?.total ?? 0).toString(),
        sub: `${kpis.users?.inactiveCount ?? 0} inactive (3d+)`,
        byBatch: null,
      },
      {
        value: (kpis.attendance?.todayAbsent ?? 0).toString(),
        sub: `${kpis.attendance?.batchesMarked ?? 0}/${kpis.attendance?.totalBatches ?? 0} batches marked`,
        byBatch: null,
      },
      {
        value: (kpis.questions?.total ?? 0).toLocaleString(),
        sub: 'In question bank',
        byBatch: null,
      },
    ];
    updates.forEach((u, i) => {
      if (this.kpis[i]) {
        this.kpis[i].value = u.value;
        this.kpis[i].sub = u.sub;
        if (u.byBatch !== null) this.kpis[i].byBatch = u.byBatch;
      }
    });
    this.todayAbsentCount = kpis.attendance?.todayAbsent ?? 0;
this.todayAbsentList = kpis.attendance?.todayAbsentList ?? [];
this.todayPeriodAbsentList = kpis.attendance?.todayPeriodAbsentList ?? [];
  }

  private buildAttendanceChart(trend: any): void {
    if (!trend) return;
    const fmt = (ms: number) =>
      new Date(ms).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
    this.attendanceLineData = {
      labels: (trend.current || []).map((r: any) => fmt(r.date)),
      datasets: [
        {
          data: (trend.current || []).map((r: any) => r.presentPct),
          label: 'Present %',
          fill: true,
          tension: 0.45,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37,99,235,0.12)',
          pointBackgroundColor: '#2563EB',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          data: (trend.previous || []).map((r: any) => r.presentPct),
          label: 'Previous period',
          fill: false,
          tension: 0.45,
          borderColor: '#CBD5E1',
          borderDash: [5, 5],
          pointBackgroundColor: '#CBD5E1',
          pointRadius: 3,
          borderWidth: 2,
        },
      ],
    };
  }

  private buildProgramChart(programs: any[]): void {
    if (!programs?.length) return;
    const MAX_SLICES = 6;
    let data = [...programs].sort((a, b) => b.count - a.count);
    if (data.length > MAX_SLICES) {
      const top = data.slice(0, MAX_SLICES - 1);
      const othersCount = data
        .slice(MAX_SLICES - 1)
        .reduce((s, p) => s + p.count, 0);
      data = [...top, { programName: 'Others', count: othersCount }];
    }
    this.programPieData = {
      labels: data.map((p) => p.programName),
      datasets: [
        {
          data: data.map((p) => p.count),
          backgroundColor: this.DEPT_COLORS.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 8,
        },
      ],
    };
    // Adjust legend position based on count
    if (this.programPieOptions?.plugins?.legend) {
      (this.programPieOptions.plugins.legend as any).position =
        data.length > 4 ? 'right' : 'bottom';
    }
  }

  private buildExamCharts(perf: any): void {
    if (!perf) return;
    this.rawMockExam = perf.mockExam || [];
    this.rawSchoolExam = perf.schoolExam || [];
    this.rawAssignment = perf.assignment || [];
    this.applyExamFilter();
    this.applyAssignFilter();
  }

  applyExamFilter(): void {
    const src =
      this.examType === 'mock' ? this.rawMockExam : this.rawSchoolExam;
    const scoreKey =
      this.examType === 'mock' ? 'avgExamScore' : 'avgSchoolExamScore';
    let filtered = this.filterByPerformance(src, scoreKey, this.examFilter);
    this.examBarData = {
      labels: filtered.map((b: any) => b.batchCode),
      datasets: [
        {
          data: filtered.map((b: any) => b[scoreKey] ?? 0),
          label:
            this.examType === 'mock' ? 'Mock Exam Score' : 'School Exam Score',
          backgroundColor: filtered.map((b: any) =>
            this.scoreColor(b[scoreKey] ?? 0),
          ),
          borderRadius: 8,
          barThickness: 26,
        },
      ],
    };
  }

  applyAssignFilter(): void {
    let filtered = this.filterByPerformance(
      this.rawAssignment,
      'avgAssignmentScore',
      this.assignFilter,
    );
    this.assignBarData = {
      labels: filtered.map((b: any) => b.batchCode),
      datasets: [
        {
          data: filtered.map((b: any) => b.avgAssignmentScore ?? 0),
          label: 'Assignment Score',
          backgroundColor: filtered.map((b: any) =>
            this.scoreColor(b.avgAssignmentScore ?? 0),
          ),
          borderRadius: 8,
          barThickness: 26,
        },
      ],
    };
  }

  private filterByPerformance(data: any[], key: string, filter: string): any[] {
    if (filter === 'all') return data;
    if (filter === 'toppers') return data.filter((b) => (b[key] ?? 0) >= 75);
    if (filter === 'average')
      return data.filter((b) => {
        const s = b[key] ?? 0;
        return s >= 50 && s < 75;
      });
    if (filter === 'below') return data.filter((b) => (b[key] ?? 0) < 50);
    return data;
  }

  private scoreColor(score: number): string {
    if (score >= 75) return 'rgba(16,185,129,0.85)';
    if (score >= 50) return 'rgba(245,158,11,0.85)';
    return 'rgba(239,68,68,0.85)';
  }

  exportExamCSV(): void {
    const src =
      this.examType === 'mock' ? this.rawMockExam : this.rawSchoolExam;
    const scoreKey =
      this.examType === 'mock' ? 'avgExamScore' : 'avgSchoolExamScore';
    const rows = [
      ['Batch Code', 'Avg Score'],
      ...src.map((b: any) => [b.batchCode, b[scoreKey] ?? 0]),
    ];
    this.downloadCSV(rows, `exam-performance-${this.examType}.csv`);
  }

  exportAssignCSV(): void {
    const rows = [
      ['Batch Code', 'Avg Assignment Score'],
      ...this.rawAssignment.map((b: any) => [
        b.batchCode,
        b.avgAssignmentScore ?? 0,
      ]),
    ];
    this.downloadCSV(rows, 'assignment-performance.csv');
  }

  private downloadCSV(rows: any[][], filename: string): void {
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  private fmtAbsentDate(ms: number): string {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  exportAbsentExcel(): void {
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    let rows: any[];
    let sheetName: string;
    let fileName: string;
    if (this.activeAbsentTab === 'school') {
      rows = this.todayAbsentList.map((s) => ({
        Date: this.fmtAbsentDate(s.date),
        Student: s.studentName,
        'Admission No': s.admissionNo,
        'Batch Code': s.batchCode,
        'Batch Name': s.batchName,
        Phone: this.getAbsentPhones(s).join(', '),
        Remarks: s.remarks || '',
      }));
      sheetName = 'Day-wise Absent';
      fileName = `Absent_Daywise_${today.replace(/ /g, '_')}.xlsx`;
    } else {
      rows = this.todayPeriodAbsentList.map((s) => ({
        Date: this.fmtAbsentDate(s.date),
        Student: s.studentName,
        'Admission No': s.admissionNo,
        Batch: s.batchCode,
        Period: `P${s.periodNo}`,
        Phone: this.getAbsentPhones(s).join(', '),
        Remarks: s.remarks || '',
      }));
      sheetName = 'Period-wise Absent';
      fileName = `Absent_Periodwise_${today.replace(/ /g, '_')}.xlsx`;
    }
    if (!rows.length) return;
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  }

  getAbsentPhones(s: AbsentStudent | PeriodAbsentStudent): string[] {
    const nums = [s.studentPhone, s.studentPhone1, s.studentPhone2, s.parentPhone].filter(
      (p): p is string => !!p,
    );
    return Array.from(new Set(nums)).slice(0, 3);
  }

  asPeriodAbsent(s: AbsentStudent | PeriodAbsentStudent): PeriodAbsentStudent | null {
    return this.remarksModalTab === 'period' ? (s as PeriodAbsentStudent) : null;
  }

  openRemarksModal(s: AbsentStudent | PeriodAbsentStudent, tab: 'school' | 'period'): void {
    this.remarksModalTab = tab;
    this.remarksModalStudent = s;
    this.remarksModalText = s.remarks || '';
    this.remarksError = null;
    this.remarksModalOpen = true;
  }

  closeRemarksModal(): void {
    this.remarksModalOpen = false;
    this.remarksModalStudent = null;
    this.remarksModalText = '';
    this.remarksError = null;
  }

  saveRemarksModal(): void {
    const student = this.remarksModalStudent;
    if (!student) return;
    const remarks = this.remarksModalText.trim();
    if (!remarks) {
      this.remarksError = 'Please enter remarks before saving.';
      return;
    }
    if (!student.attendanceId) {
      this.remarksError =
        'This absentee entry has no attendance record id yet. Please refresh the dashboard or contact support if this persists.';
      return;
    }
    const studentId = student.studentId;
    const attendanceId = student.attendanceId;
    const tab = this.remarksModalTab;
    this.remarksSaving = true;
    this.remarksError = null;
    const req$ =
      tab === 'school'
        ? this.dashboardService.updateSchoolAttendanceRemarks(this.entiId, attendanceId, studentId, remarks)
        : this.dashboardService.updatePeriodAttendanceRemarks(this.entiId, attendanceId, studentId, remarks);
    req$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.remarksSaving = false)),
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.status) {
            this.remarksError = res?.message || 'Failed to update remarks';
            return;
          }
          const list = tab === 'school' ? this.todayAbsentList : this.todayPeriodAbsentList;
          const target = list.find(
            (x) => x.studentId === studentId && x.attendanceId === attendanceId,
          );
          if (target) target.remarks = remarks || null;
          this.closeRemarksModal();
        },
        error: (err: any) => {
          this.remarksError = err?.error?.message || 'Failed to update remarks';
        },
      });
  }

  private buildStaffDepts(data: any): void {
    if (!data?.data?.length) return;
    const total = data.total || 1;
    this.staffDepts = data.data.map((d: any, i: number) => ({
      name: d.departmentName,
      count: d.count,
      total,
      color: this.DEPT_COLORS[i % this.DEPT_COLORS.length],
    }));
  }

  private buildRecentUsers(data: any[]): void {
    if (!data?.length) return;
    this.recentUsers = data.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.roleLabel,
      status: u.status as 'Active' | 'Inactive',
      avatar:
        u.avatar ||
        (u.name || '')
          .split(' ')
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase() || '')
          .join(''),
      tone: this.toneForRole(u.roleLevel),
    }));
  }

  private buildInactiveUsers(data: any): void {
    if (!data) return;
    this.inactiveUsersCount = data.totalCount ?? 0;
    this.inactiveUsers = (data.list || []).map((u: any) => ({
      userId: u.userId,
      name: u.name,
      email: u.email,
      roleLabel: u.roleLabel,
      centerName: u.centerName || null,
      lastLoginAt: u.lastLoginAt || null,
      neverLoggedIn: u.neverLoggedIn,
      daysSinceLogin: u.daysSinceLogin,
      avatar:
        u.avatar ||
        (u.name || '')
          .split(' ')
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase() || '')
          .join(''),
    }));
  }

  private buildPtms(data: any[]): void {
    if (!data?.length) return;
    this.ptms = data.map((p) => ({
      ptmId: p.ptmId,
      student: p.studentName,
      parent: p.admissionNo,
      batch: p.batchCode || '—',
      date: p.ptmDate
        ? new Date(p.ptmDate).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          })
        : '—',
      time: p.startTime ? this.fmtMinutes(p.startTime) : '—',
      status: this.mapPtmStatus(p.status),
    }));
  }

  private buildActivities(data: any[]): void {
    if (!data?.length) return;
    this.upcomingActivities = data;
  }

  onKpiClick(kpi: KpiCard): void {
    if (kpi.scrollTo) {
      const el = this.el.nativeElement.querySelector(`#${kpi.scrollTo}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (kpi.route) {
      // router navigate handled by routerLink in template
    }
  }

  sparklinePath(trend: number[], width = 100, height = 30): string {
    if (!trend?.length) return '';
    const min = Math.min(...trend);
    const max = Math.max(...trend);
    const range = max - min || 1;
    const step = width / (trend.length - 1);
    return trend
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  sparklineArea(trend: number[], width = 100, height = 30): string {
    const path = this.sparklinePath(trend, width, height);
    if (!path) return '';
    return `${path} L${width},${height} L0,${height} Z`;
  }

  formatActivityDate(ms: number): string {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  }

  getActivityStatusClass(status: string): string {
    const map: Record<string, string> = {
      PLANNED: 'blue',
      IN_PROGRESS: 'green',
      COMPLETED: 'green',
      CANCELLED: 'amber',
    };
    return map[status] || 'blue';
  }

  formatLastSeen(
    lastLoginAt: string | null,
    neverLoggedIn: boolean,
    days: number | null,
  ): string {
    if (neverLoggedIn || !lastLoginAt) return 'Never logged in';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  }

  private fmtMinutes(mins: number): string {
    const h = Math.floor(mins / 60),
      m = mins % 60;
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  private mapPtmStatus(
    s: string,
  ): 'Scheduled' | 'Confirmed' | 'Pending' | 'Cancelled' {
    const map: Record<
      string,
      'Scheduled' | 'Confirmed' | 'Pending' | 'Cancelled'
    > = {
      SCHEDULED: 'Scheduled',
      COMPLETED: 'Confirmed',
      NO_SHOW: 'Pending',
      CANCELLED: 'Cancelled',
    };
    return map[s] || 'Scheduled';
  }

  private toneForRole(
    roleLevel: string,
  ): 'blue' | 'green' | 'amber' | 'violet' {
    const map: Record<string, 'blue' | 'green' | 'amber' | 'violet'> = {
      L1: 'violet',
      L2: 'blue',
      L3: 'green',
      L4: 'amber',
      L5: 'blue',
      L6: 'green',
      L7: 'violet',
    };
    return map[roleLevel] || 'blue';
  }
}
