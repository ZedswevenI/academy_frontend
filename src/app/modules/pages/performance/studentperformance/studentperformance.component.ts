import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AuthService } from '../../../../service/auth/auth.service';
import {
  buildCPTPrintHtml,
  buildSchoolPrintHtml,
  openPrintWindow,
  PrintStudent,
  SectionStats,
  exportToPdf,
} from '../print.helper';

@Component({
  selector: 'app-studentperformance',
  standalone: false,
  templateUrl: './studentperformance.component.html',
  styleUrl: './studentperformance.component.scss',
})
export class StudentperformanceComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId') || '';
  roleLevel = '';
  canAddRemark = false;
  canDeleteRemark = false;
  studentId = '';
  academicYear = '';
  batchId = '';
  loading = false;
  syncing = false;
  student: any = null;
  assignments: any[] = [];
  staffFeedback: any[] = [];
  activeTab = 'assignment';
  mockExams: any[] = [];
  mockPage = 1;
  mockPageSize = 20;
  mockTotal = 0;
  mockLoading = false;
  expandedMockId = '';
  schoolExams: any[] = [];
  schoolPage = 1;
  schoolPageSize = 20;
  schoolTotal = 0;
  schoolLoading = false;
  expandedSchoolId = '';
  remarkText = '';
  remarkSaving = false;
  studentProfile: any = null;
  exportingCPT = false;
  exportingSchool = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.roleLevel = this.auth.getRole();
    this.canAddRemark = ['L1', 'L3', 'L4'].includes(this.roleLevel);
    this.canDeleteRemark = ['L1', 'L3'].includes(this.roleLevel);
    this.studentId = this.route.snapshot.paramMap.get('id') || '';
    const state = history.state;
    this.batchId = state?.batchId || '';
    this.academicYear = state?.academicYear || '';
    if (!this.studentId) {
      this.router.navigate(['/app/performance']);
      return;
    }
    this.breadcrump.set([
      { label: 'Performance', link: '/app/performance' },
      { label: 'Student Detail' },
    ]);
    this.loadFull();
  }

  loadFull(): void {
    if (!this.academicYear) return;
    this.loading = true;
    this.loadStudentProfile();
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: this.studentId,
          academicYear: this.academicYear,
        },
        'performance',
        'student/full',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            const d = res.data;
            this.student = d.summary;
            this.assignments = d.assignments || [];
            this.staffFeedback = d.summary?.staffFeedback || [];
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'mock' && !this.mockExams.length) this.loadMockExams();
    if (tab === 'school' && !this.schoolExams.length) this.loadSchoolExams();
  }

  loadMockExams(): void {
    this.mockLoading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: this.studentId,
          academicYear: this.academicYear,
          page: this.mockPage,
          limit: this.mockPageSize,
        },
        'performance',
        'student/mock-list',
      )
      .subscribe({
        next: (res: any) => {
          this.mockLoading = false;
          this.mockExams = res?.data || [];
          this.mockTotal = res?.count || 0;
        },
        error: () => {
          this.mockLoading = false;
        },
      });
  }

  onMockPageChange(page: number): void {
    this.mockPage = page;
    this.loadMockExams();
  }

  toggleMockExpand(examId: string): void {
    this.expandedMockId = this.expandedMockId === examId ? '' : examId;
  }

  loadSchoolExams(): void {
    this.schoolLoading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: this.studentId,
          academicYear: this.academicYear,
          page: this.schoolPage,
          limit: this.schoolPageSize,
        },
        'performance',
        'student/school-list',
      )
      .subscribe({
        next: (res: any) => {
          this.schoolLoading = false;
          this.schoolExams = res?.data || [];
          this.schoolTotal = res?.count || 0;
        },
        error: () => {
          this.schoolLoading = false;
        },
      });
  }

  onSchoolPageChange(page: number): void {
    this.schoolPage = page;
    this.loadSchoolExams();
  }

  toggleSchoolExpand(examId: string): void {
    this.expandedSchoolId = this.expandedSchoolId === examId ? '' : examId;
  }

  syncStudent(): void {
    this.syncing = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: this.studentId,
          academicYear: this.academicYear,
        },
        'performance',
        'sync/all',
      )
      .subscribe({
        next: (res: any) => {
          this.syncing = false;
          if (res?.status) {
            this.alert.success('Performance synced');
            this.mockExams = [];
            this.schoolExams = [];
            this.loadFull();
          } else {
            this.alert.error(res?.message || 'Sync failed');
          }
        },
        error: () => {
          this.syncing = false;
          this.alert.error('Sync failed');
        },
      });
  }

  addRemark(): void {
    if (!this.remarkText.trim()) {
      this.alert.error('Remarks cannot be empty');
      return;
    }
    this.remarkSaving = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: this.studentId,
          academicYear: this.academicYear,
          staffId: localStorage.getItem('userId'),
          remarks: this.remarkText.trim(),
        },
        'performance',
        'student/feedback/add',
      )
      .subscribe({
        next: (res: any) => {
          this.remarkSaving = false;
          if (res?.status) {
            this.alert.success('Remark added');
            this.remarkText = '';
            this.staffFeedback = res.data?.staffFeedback || [];
          } else {
            this.alert.error(res?.message || 'Failed to add remark');
          }
        },
        error: () => {
          this.remarkSaving = false;
          this.alert.error('Failed to add remark');
        },
      });
  }

  deleteRemark(feedbackId: string): void {
    if (!confirm('Delete this remark?')) return;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          performanceId: this.student?.performanceId,
          feedbackId,
        },
        'performance',
        'student/feedback/delete',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Remark removed');
            this.staffFeedback = res.data?.staffFeedback || [];
          }
        },
        error: () => {},
      });
  }

  goBack(): void {
    this.router.navigate(['/app/performance']);
  }

  formatDate(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTime(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('');
  }

  pct(val: any): string {
    return val != null ? Number(val).toFixed(1) + '%' : '—';
  }

  num(val: any, dec = 2): string {
    return val != null ? Number(val).toFixed(dec) : '—';
  }

  get mockPages(): number {
    return Math.ceil(this.mockTotal / this.mockPageSize) || 0;
  }
  get schoolPages(): number {
    return Math.ceil(this.schoolTotal / this.schoolPageSize) || 0;
  }
  get mockPageRange(): number[] {
    return Array.from({ length: this.mockPages }, (_, i) => i + 1);
  }
  get schoolPageRange(): number[] {
    return Array.from({ length: this.schoolPages }, (_, i) => i + 1);
  }

  private loadStudentProfile(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          { entiId: this.tenantId, studentId: this.studentId },
          'student',
          'view',
        )
        .subscribe({
          next: (res: any) => {
            if (res?.status) this.studentProfile = res.data;
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private getPrintStudent(): PrintStudent {
    return {
      studentName:
        this.studentProfile?.basic?.name || this.student?.admissionNo || '—',
      admissionNo:
        this.studentProfile?.basic?.admissionNo ||
        this.student?.admissionNo ||
        '—',
      classNo: this.studentProfile?.basic?.classNo || null,
      programName: this.studentProfile?.program?.programName || '—',
      batchCode: this.studentProfile?.program?.batchName || this.batchId || '—',
    };
  }

  async printCPT(): Promise<void> {
    if (!this.studentProfile) await this.loadStudentProfile();
    let exams = this.mockExams;
    if (!exams.length) exams = await this.fetchAllMockExams();
    if (!exams.length) {
      this.alert.error('No exam data to print');
      return;
    }
    const batchStatsMap = new Map<string, SectionStats[]>();
    this.exportingCPT = true;
    for (const exam of exams) {
      if (!exam.examId) continue;
      try {
        const res: any = await this.commonApi
          .fetchData(
            {
              entiId: this.tenantId,
              examId: exam.examId,
              batchId: this.batchId,
            },
            'exam',
            'result/batch-subject-stats',
          )
          .toPromise();
        if (res?.status) batchStatsMap.set(exam.examId, res.data || []);
      } catch (e) {
      } finally {
        this.exportingCPT = false;
      }
    }
    const html = await buildCPTPrintHtml(
      this.getPrintStudent(),
      exams,
      batchStatsMap,
    );
    const name = `CPT_${this.studentProfile?.basic?.admissionNo || this.studentId}.pdf`;
    await exportToPdf(html, name);
  }

  async printSchool(): Promise<void> {
    this.exportingSchool = true;
    try {
      if (!this.studentProfile) await this.loadStudentProfile();
      let exams = this.schoolExams;
      if (!exams.length) exams = await this.fetchAllSchoolExams();
      if (!exams.length) {
        this.alert.error('No school exam data to print');
        return;
      }
      const html = buildSchoolPrintHtml(this.getPrintStudent(), exams);
      const name = `School_${this.studentProfile?.basic?.admissionNo || this.studentId}.pdf`;
      await exportToPdf(html, name);
    } catch (err) {
      this.alert.error('Failed to export PDF');
    } finally {
      this.exportingSchool = false;
    }
  }

  private fetchAllMockExams(): Promise<any[]> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          {
            entiId: this.tenantId,
            studentId: this.studentId,
            academicYear: this.academicYear,
            page: 1,
            limit: 100,
          },
          'performance',
          'student/mock-list',
        )
        .subscribe({
          next: (res: any) => resolve(res?.data || []),
          error: () => resolve([]),
        });
    });
  }

  private fetchAllSchoolExams(): Promise<any[]> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          {
            entiId: this.tenantId,
            studentId: this.studentId,
            academicYear: this.academicYear,
            page: 1,
            limit: 100,
          },
          'performance',
          'student/school-list',
        )
        .subscribe({
          next: (res: any) => resolve(res?.data || []),
          error: () => resolve([]),
        });
    });
  }
}
