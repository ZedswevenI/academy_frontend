import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { DashboardService } from '../../../../service/dashboard/dashboard.service';
import { AlertService } from '../../../../service/alert/alert.service';

interface KpiCard {
  label: string;
  value: string;
  icon: string;
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
  student: string;
  parent: string;
  batch: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Confirmed' | 'Pending';
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

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  today = new Date();
  loading = false;
  tenantId = '';

  kpis: KpiCard[] = [
    {
      label: 'Total Students', value: '1,248',
      icon: 'fa-solid fa-user-graduate', tone: 'blue',
      sub: '+32 new this week',
      trend: [18, 22, 20, 26, 24, 30, 34]
    },
    {
      label: 'Total Staff', value: '86',
      icon: 'fa-solid fa-chalkboard-user', tone: 'green',
      sub: '72 teaching · 14 admin',
      trend: [74, 76, 78, 80, 82, 84, 86]
    },
    {
      label: 'System Users', value: '142',
      icon: 'fa-solid fa-users', tone: 'violet',
      sub: '128 active · 14 invited',
      trend: [110, 118, 122, 128, 132, 138, 142]
    },
    {
      label: 'Active Batches', value: '36',
      icon: 'fa-solid fa-layer-group', tone: 'blue',
      sub: '28 ongoing · 8 upcoming',
      trend: [30, 31, 32, 33, 34, 35, 36]
    },
    {
      label: 'Avg Attendance', value: '92.4%',
      icon: 'fa-solid fa-clipboard-check', tone: 'green',
      sub: 'Target 90% · met 6/6 days',
      trend: [88, 90, 91, 90, 92, 93, 92]
    },
    {
      label: 'Upcoming PTMs', value: '14',
      icon: 'fa-solid fa-people-group', tone: 'amber',
      sub: '9 confirmed · 5 pending',
      trend: [22, 20, 18, 17, 16, 15, 14]
    }
  ];

  sparklinePath(trend: number[], width = 100, height = 30): string {
    if (!trend.length) return '';
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

  staffDepts: StaffDept[] = [
    { name: 'Physics',      count: 18, total: 86, color: '#2563EB' },
    { name: 'Chemistry',    count: 15, total: 86, color: '#10B981' },
    { name: 'Mathematics',  count: 16, total: 86, color: '#8B5CF6' },
    { name: 'Biology',      count: 12, total: 86, color: '#F59E0B' },
    { name: 'English',      count: 9,  total: 86, color: '#EF4444' },
    { name: 'Admin & Ops',  count: 16, total: 86, color: '#0EA5E9' }
  ];

  recentUsers: UserRow[] = [
    { name: 'Priya Nair',     email: 'priya.nair@academy.in',    role: 'Teacher',      status: 'Active',   avatar: 'PN', tone: 'blue' },
    { name: 'Rahul Menon',    email: 'rahul.m@academy.in',       role: 'Coordinator',  status: 'Active',   avatar: 'RM', tone: 'green' },
    { name: 'Sanjay Kumar',   email: 'sanjay.k@academy.in',      role: 'Admin',        status: 'Invited',  avatar: 'SK', tone: 'amber' },
    { name: 'Meera Iyer',     email: 'meera.iyer@academy.in',    role: 'Counsellor',   status: 'Active',   avatar: 'MI', tone: 'violet' },
    { name: 'Arjun Pillai',   email: 'arjun.p@academy.in',       role: 'Teacher',      status: 'Inactive', avatar: 'AP', tone: 'blue' }
  ];

  // Attendance trend (line)
  attendanceLineData: ChartData<'line'> = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        data: [88, 91, 93, 90, 94, 92],
        label: 'This week',
        fill: true,
        tension: 0.45,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        pointBackgroundColor: '#2563EB',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      },
      {
        data: [85, 87, 89, 86, 90, 88],
        label: 'Last week',
        fill: false,
        tension: 0.45,
        borderColor: '#CBD5E1',
        borderDash: [5, 5],
        pointBackgroundColor: '#CBD5E1',
        pointRadius: 3,
        borderWidth: 2
      }
    ]
  };

  attendanceLineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } } }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 70,
        max: 100,
        ticks: { font: { size: 11 }, color: '#94A3B8', callback: (v) => v + '%' },
        grid: { color: 'rgba(148,163,184,0.12)' }
      },
      x: {
        ticks: { font: { size: 11 }, color: '#94A3B8' },
        grid: { display: false }
      }
    }
  };

  // Batch performance (bar)
  batchBarData: ChartData<'bar'> = {
    labels: ['JEE-A', 'JEE-B', 'NEET-A', 'NEET-B', 'Found', 'CBSE-X'],
    datasets: [
      {
        data: [82, 76, 88, 71, 69, 79],
        label: 'Avg Score',
        backgroundColor: [
          'rgba(37, 99, 235, 0.85)',
          'rgba(99, 102, 241, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(239, 68, 68, 0.85)',
          'rgba(139, 92, 246, 0.85)'
        ],
        borderRadius: 8,
        barThickness: 26
      }
    ]
  };

  batchBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { font: { size: 11 }, color: '#94A3B8' },
        grid: { color: 'rgba(148,163,184,0.12)' }
      },
      x: {
        ticks: { font: { size: 11 }, color: '#94A3B8' },
        grid: { display: false }
      }
    }
  };

  // Students by program (doughnut)
  programDoughnutData: ChartData<'doughnut'> = {
    labels: ['JEE', 'NEET', 'Foundation', 'CBSE Board'],
    datasets: [
      {
        data: [420, 385, 258, 185],
        backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'],
        borderWidth: 0,
        hoverOffset: 6
      }
    ]
  };

  programDoughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%'
  };

  activities: Activity[] = [
    { icon: 'fa-solid fa-user-plus', tone: 'blue', title: 'New student enrolled', meta: 'Aarav Sharma · JEE-A Batch', time: '10m ago' },
    { icon: 'fa-solid fa-file-pen', tone: 'violet', title: 'Assignment submitted', meta: 'Physics · Chapter 4 · 42 submissions', time: '35m ago' },
    { icon: 'fa-solid fa-bullhorn', tone: 'amber', title: 'Circular published', meta: 'Mid-term schedule released', time: '1h ago' },
    { icon: 'fa-solid fa-clipboard-check', tone: 'green', title: 'Attendance marked', meta: 'NEET-B · 38/40 present', time: '2h ago' },
    { icon: 'fa-solid fa-award', tone: 'blue', title: 'Feedback received', meta: 'Mrs. Iyer rated 5★ · Teacher: R. Menon', time: '3h ago' }
  ];

  ptms: PtmItem[] = [
    { student: 'Aarav Sharma', parent: 'Mr. Sharma', batch: 'JEE-A', date: 'Apr 16', time: '10:00 AM', status: 'Confirmed' },
    { student: 'Diya Patel', parent: 'Mrs. Patel', batch: 'NEET-A', date: 'Apr 16', time: '11:30 AM', status: 'Scheduled' },
    { student: 'Rohan Verma', parent: 'Mr. Verma', batch: 'JEE-B', date: 'Apr 17', time: '09:00 AM', status: 'Pending' },
    { student: 'Ananya Rao', parent: 'Mrs. Rao', batch: 'Foundation', date: 'Apr 17', time: '02:00 PM', status: 'Confirmed' },
    { student: 'Kabir Singh', parent: 'Mr. Singh', batch: 'NEET-B', date: 'Apr 18', time: '10:30 AM', status: 'Scheduled' }
  ];

  performers: Performer[] = [
    { name: 'Ishaan Gupta', batch: 'JEE-A', score: 96, avatar: 'IG' },
    { name: 'Sneha Reddy', batch: 'NEET-A', score: 94, avatar: 'SR' },
    { name: 'Vivaan Mehta', batch: 'JEE-B', score: 92, avatar: 'VM' },
    { name: 'Priya Nair', batch: 'NEET-B', score: 90, avatar: 'PN' },
    { name: 'Arjun Kapoor', batch: 'Foundation', score: 89, avatar: 'AK' }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private dashboardService: DashboardService,
    private alert: AlertService
  ) {
    this.breadcrumb.set([{ label: 'Dashboard' }]);
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    if (!this.tenantId) return;

    this.loading = true;
    this.dashboardService.getSummary({ entiId: this.tenantId, period: 'week' }).subscribe({
      next: (res: any) => {
        if (res?.status && res.data) {
          this.mapDashboardData(res.data);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Error fetching dashboard data:', err);
      }
    });
  }

  private mapDashboardData(data: any) {
    // 1. Map KPIs
    if (data.kpis) {
      const k = data.kpis;
      this.kpis = [
        {
          label: 'Total Students',
          value: k.students?.total?.toLocaleString() || '0',
          icon: 'fa-solid fa-user-graduate',
          tone: 'blue',
          sub: 'Total active enrollment',
          trend: [18, 22, 20, 26, 24, 30, 34],
          route: '/app/student'
        },
        {
          label: 'Total Staff',
          value: k.staff?.total?.toString() || '0',
          icon: 'fa-solid fa-chalkboard-user',
          tone: 'green',
          sub: `${k.staff?.teaching || 0} teaching · ${k.staff?.nonTeaching || 0} admin`,
          trend: [74, 76, 78, 80, 82, 84, 86],
          route: '/app/org-master/staff'
        },
        {
          label: 'System Users',
          value: k.users?.total?.toString() || '0',
          icon: 'fa-solid fa-users',
          tone: 'violet',
          sub: `${k.users?.total - k.users?.inactiveCount || 0} active · ${k.users?.inactiveCount || 0} inactive`,
          trend: [110, 118, 122, 128, 132, 138, 142],
          route: '/app/org-master/users'
        },
        {
          label: 'Active Batches',
          value: k.batches?.total?.toString() || '0',
          icon: 'fa-solid fa-layer-group',
          tone: 'blue',
          sub: 'Ongoing programs',
          trend: [30, 31, 32, 33, 34, 35, 36],
          route: '/app/batch'
        },
        {
          label: 'Avg Attendance',
          value: k.attendance?.todayPct ? `${k.attendance.todayPct}%` : 'N/A',
          icon: 'fa-solid fa-clipboard-check',
          tone: 'green',
          sub: `${k.attendance?.batchesMarked || 0} batches marked today`,
          trend: [88, 90, 91, 90, 92, 93, 92],
          route: '/app/attendance'
        },
        {
          label: 'Upcoming PTMs',
          value: k.ptms?.upcoming?.toString() || '0',
          icon: 'fa-solid fa-people-group',
          tone: 'amber',
          sub: 'Scheduled meetings',
          trend: [22, 20, 18, 17, 16, 15, 14],
          route: '/app/ptm'
        }
      ];
    }

    // 2. Map Attendance Trend
    if (data.attendanceTrend) {
      const current = data.attendanceTrend.current || [];
      const previous = data.attendanceTrend.previous || [];
      
      this.attendanceLineData = {
        labels: current.map((i: any) => this.formatDateLabel(i.date)),
        datasets: [
          {
            ...this.attendanceLineData.datasets[0],
            data: current.map((i: any) => i.presentPct)
          },
          {
            ...this.attendanceLineData.datasets[1],
            data: previous.map((i: any) => i.presentPct)
          }
        ]
      };
    }

    // 3. Map Students by Program
    if (data.studentsByProgram) {
      this.programDoughnutData = {
        labels: data.studentsByProgram.map((p: any) => p.programName),
        datasets: [
          {
            ...this.programDoughnutData.datasets[0],
            data: data.studentsByProgram.map((p: any) => p.count)
          }
        ]
      };
    }

    // 4. Map Batch Performance
    if (data.batchPerformance) {
      this.batchBarData = {
        labels: data.batchPerformance.map((b: any) => b.batchCode || b.batchName),
        datasets: [
          {
            ...this.batchBarData.datasets[0],
            data: data.batchPerformance.map((b: any) => b.avgCombined)
          }
        ]
      };
    }

    // 5. Map Top Performers
    if (data.topPerformers) {
      this.performers = data.topPerformers.map((p: any) => ({
        name: p.name,
        batch: p.batchCode || 'Unknown',
        score: p.score,
        avatar: p.avatar
      }));
    }

    // 6. Map Staff by Department
    if (data.staffByDepartment?.data) {
      const colors = ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9'];
      this.staffDepts = data.staffByDepartment.data.map((d: any, i: number) => ({
        name: d.departmentName,
        count: d.count,
        total: data.staffByDepartment.total,
        color: colors[i % colors.length]
      }));
    }

    // 7. Map Recent Users
    if (data.recentUsers) {
      const tones: any[] = ['blue', 'green', 'amber', 'violet'];
      this.recentUsers = data.recentUsers.map((u: any, i: number) => ({
        name: u.name,
        email: u.email,
        role: u.roleLabel || 'User',
        status: u.status === 'Active' ? 'Active' : 'Inactive',
        avatar: u.avatar,
        tone: tones[i % tones.length]
      }));
    }

    // 8. Map Activities
    if (data.upcomingActivities?.data) {
      this.activities = data.upcomingActivities.data.map((a: any) => ({
        icon: 'fa-solid fa-calendar-check',
        tone: 'blue',
        title: a.activityName,
        meta: `${a.batchCode} · ${a.status.toLowerCase()}`,
        time: this.formatRelativeTime(a.startDate)
      }));
    }

    // 9. Map PTMs
    if (data.upcomingPtms?.data) {
      this.ptms = data.upcomingPtms.data.map((p: any) => ({
        student: p.studentName,
        parent: p.admissionNo,
        batch: p.batchCode,
        date: new Date(p.ptmDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        time: p.startTime,
        status: p.status === 'SCHEDULED' ? 'Scheduled' : 'Confirmed'
      }));
    }
  }

  private formatDateLabel(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  private formatRelativeTime(ms: number): string {
    const diff = ms - Date.now();
    if (diff < 0) return 'Just now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Soon';
    if (hours < 24) return `${hours}h group`;
    return `${Math.floor(hours / 24)}d away`;
  }
}
