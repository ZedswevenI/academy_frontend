import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { DashboardService } from '../dashboard.service';

// ─── Interfaces — exactly as original, minimal additions only ─────────────────

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  delta: number,
  tone: 'blue' | 'green' | 'amber' | 'violet';
  sub: string;
  trend: number[];
  route?: string;
}

interface Activity {
  icon: string;
  tone: string;
  title: string;
  meta: string;
  time: string;
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

interface ActivityItem {
  activityId: string;
  activityName: string;
  batchCode: string;
  startDate: number;
  endDate: number;
  status: string;
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

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  today = new Date();
  private destroy$ = new Subject<void>();

  loading = true;
  error: string | null = null;
  selectedPeriod: 'week' | 'month' | 'quarter' = 'week';
  username: any = '';

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

  // ── KPI cards — same 6 as original ───────────────────────────────────────
  kpis: KpiCard[] = [
    {
      label: 'Total Students',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-user-graduate',
      tone: 'blue',
      sub: 'Loading...',
      trend: [],
    },
    {
      label: 'Total Staff',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-chalkboard-user',
      tone: 'green',
      sub: 'Loading...',
      trend: [],
    },
    {
      label: 'System Users',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-users',
      tone: 'violet',
      sub: 'Loading...',
      trend: [],
    },
    {
      label: 'Active Batches',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-layer-group',
      tone: 'blue',
      sub: 'Loading...',
      trend: [],
    },
    {
      label: 'Avg Attendance',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-clipboard-check',
      tone: 'green',
      sub: 'Loading...',
      trend: [],
    },
    {
      label: 'Upcoming PTMs',
      value: '—',
      delta: 0,
      icon: 'fa-solid fa-people-group',
      tone: 'amber',
      sub: 'Loading...',
      trend: [],
    },
  ];

  // ── List data ─────────────────────────────────────────────────────────────
  performers: Performer[] = [];
  staffDepts: StaffDept[] = [];
  recentUsers: UserRow[] = [];
  inactiveUsers: InactiveUser[] = [];
  inactiveUsersCount = 0;
  ptms: PtmItem[] = [];
  upcomingActivities: ActivityItem[] = [];

  // Activities feed stays — no backend API for activity log yet
  activities: Activity[] = [
    {
      icon: 'fa-solid fa-user-plus',
      tone: 'blue',
      title: 'New student enrolled',
      meta: '',
      time: '',
    },
    {
      icon: 'fa-solid fa-file-pen',
      tone: 'violet',
      title: 'Assignment submitted',
      meta: '',
      time: '',
    },
    {
      icon: 'fa-solid fa-bullhorn',
      tone: 'amber',
      title: 'Circular published',
      meta: '',
      time: '',
    },
    {
      icon: 'fa-solid fa-clipboard-check',
      tone: 'green',
      title: 'Attendance marked',
      meta: '',
      time: '',
    },
    {
      icon: 'fa-solid fa-award',
      tone: 'blue',
      title: 'Feedback received',
      meta: '',
      time: '',
    },
  ];

  // ── Charts ────────────────────────────────────────────────────────────────
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
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 50,
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

  batchBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  batchBarOptions: ChartConfiguration<'bar'>['options'] = {
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

  programDoughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  programDoughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          padding: 14,
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

  // ── Load ──────────────────────────────────────────────────────────────────
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
          this.buildProgramChart(d.studentsByProgram);
          this.buildBatchChart(d.batchPerformance);
          this.buildPerformers(d.topPerformers);
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
    this.dashboardService
      .getAttendanceTrend(this.entiId, period)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.status) this.buildAttendanceChart(res.data);
        },
      });
  }

  // ── Builders ──────────────────────────────────────────────────────────────
  private buildKpis(kpis: any): void {
    if (!kpis) return;
    const updates = [
      {
        value: (kpis.students?.total ?? 0).toLocaleString(),
        sub: 'Active enrollments',
      },
      {
        value: (kpis.staff?.total ?? 0).toString(),
        sub: `${kpis.staff?.teaching ?? 0} teaching · ${kpis.staff?.nonTeaching ?? 0} admin`,
      },
      {
        value: (kpis.users?.total ?? 0).toString(),
        sub: `${kpis.users?.inactiveCount ?? 0} inactive (3d+)`,
      },
      { value: (kpis.batches?.total ?? 0).toString(), sub: 'Currently active' },
      {
        value:
          kpis.attendance?.todayPct != null
            ? `${kpis.attendance.todayPct}%`
            : 'N/A',
        sub: `${kpis.attendance?.batchesMarked ?? 0} batches marked today`,
      },
      {
        value: (kpis.ptms?.upcoming ?? 0).toString(),
        sub: 'Scheduled from today',
      },
    ];
    updates.forEach((u, i) => {
      if (this.kpis[i]) {
        this.kpis[i].value = u.value;
        this.kpis[i].sub = u.sub;
      }
    });
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
          label: 'This period',
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
    this.programDoughnutData = {
      labels: programs.map((p) => p.programName),
      datasets: [
        {
          data: programs.map((p) => p.count),
          backgroundColor: this.DEPT_COLORS.slice(0, programs.length),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }

  private buildBatchChart(batches: any[]): void {
    if (!batches?.length) return;
    this.batchBarData = {
      labels: batches.map((b) => b.batchCode),
      datasets: [
        {
          data: batches.map((b) => b.avgCombined ?? b.avgExamScore ?? 0),
          label: 'Avg Score',
          backgroundColor: this.CHART_COLORS.slice(0, batches.length),
          borderRadius: 8,
          barThickness: 26,
        },
      ],
    };
  }

  private buildPerformers(data: any[]): void {
    if (!data?.length) return;
    this.performers = data.map((p) => ({
      name: p.name || p.admissionNo,
      batch: p.batchCode || '—',
      score: p.score,
      avatar:
        p.avatar ||
        (p.name || '')
          .split(' ')
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase() || '')
          .join(''),
    }));
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

  // ── Sparklines (exact original logic) ────────────────────────────────────
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

  // ── Template helpers ──────────────────────────────────────────────────────
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
