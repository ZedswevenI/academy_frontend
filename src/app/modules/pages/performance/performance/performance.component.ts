import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { AuthService } from '../../../../service/auth/auth.service';
import {
  buildCPTPageHtml,
  buildSchoolPageHtml,
  openPrintWindow,
  PrintStudent,
  SectionStats,
  wrapAllPages,
  exportToPdf,
} from '../print.helper';
import { PermissionService } from '../../../../shared/permission.service';
import { ListStateService } from '../../../../shared/list-state.service';

const PERFORMANCE_LIST_STATE_KEY = 'performance-list';

@Component({
  selector: 'app-performance',
  standalone: false,
  templateUrl: './performance.component.html',
  styleUrl: './performance.component.scss',
})
export class PerformanceComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId') || '';
  currentPage = 1;
  restoredPage = 1;
  roleLevel = '';
  canSync = false;
  canOverride = false;
  batch_options: any[] = [];
  year_options: any[] = [];
  selectedBatchId = '';
  selectedBatchCode = '';
  selectedYear = '';
  loading = false;
  syncing = false;
  dataArray: any[] = [];
  totalRecords = 0;
  columnsArray = [
    { key: 'admissionNo', label: 'Adm No', sortable: false },
    { key: 'studentName', label: 'Student', sortable: false },
    { key: 'assignmentAvgCgpa', label: 'Assign CGPA', sortable: false },
    { key: 'mockAvgPct', label: 'Mock Avg%', sortable: false },
    { key: 'schoolAvgPct', label: 'School Avg%', sortable: false },
    { key: 'combinedScore', label: 'Combined Score', sortable: false },
    { key: 'batchRank', label: 'Rank', sortable: false },
  ];
  actions: any[] = [];
  syncingStudentId = '';
  overrideStudent: any = null;
  overrideSubjects: any[] = [];
  overrideForm = {
    subjectId: '',
    cgpa: '',
    marksSecured: '',
    marksTotal: '',
    attempts: '',
  };
  overrideSaving = false;
  printingAllCPT = false;
  printingAllSchool = false;

  constructor(
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
    private auth: AuthService,
    private permissionService: PermissionService,
    private listStateService: ListStateService,
  ) {
    this.restoredPage = this.listStateService.consumePage(
      PERFORMANCE_LIST_STATE_KEY,
    );
  }

  ngOnInit(): void {
    this.roleLevel = this.auth.getRole();
    this.canSync = this.permissionService.hasPermission('performance:sync');
    this.canOverride = this.permissionService.hasPermission('performance:override');
    this.breadcrump.set([{ label: 'Performance' }]);
    this.buildActions();
    this.loadBatches();
  }

  buildActions(): void {
    this.actions = [
      {
        type: 'icon',
        icon: 'fa-regular fa-eye',
        tooltip: 'View Detail',
        color: '#6B7280',
        hoverColor: '#0066FF',
        show: () => !this.permissionService.hasPermission('performance:view'),
        callback: (row: any) => this.viewStudent(row),
      },
    ];
    if (this.canSync) {
      this.actions.push({
        type: 'icon',
        icon: 'fa-solid fa-rotate',
        tooltip: 'Sync Performance',
        color: '#6B7280',
        hoverColor: '#16A34A',
        callback: (row: any) => this.syncStudent(row),
      });
    }
    if (this.canOverride) {
      this.actions.push({
        type: 'icon',
        icon: 'fa-solid fa-pen-to-square',
        tooltip: 'Override Assignment',
        color: '#6B7280',
        hoverColor: '#F59E0B',
        callback: (row: any) => this.openOverride(row),
      });
    }
  }

  loadBatches(): void {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          const batches = res?.data || [];
          this.batch_options = batches.map((b: any) => ({
            label: `${b.batchName} (${b.batchCode})`,
            value: b.batchId,
            batchCode: b.batchCode,
            academicYear: b.academicYear,
          }));
          const years = [
            ...new Set(batches.map((b: any) => b.academicYear)),
          ].filter(Boolean) as string[];
          this.year_options = years
            .sort()
            .reverse()
            .map((y: string) => ({ label: y, value: y }));
        },
        error: () => {},
      });
  }

  onBatchChange(batchId: string): void {
    this.selectedBatchId = batchId;
    const batch = this.batch_options.find((b) => b.value === batchId);
    this.selectedBatchCode = batch?.batchCode || '';
    if (batch?.academicYear && !this.selectedYear) {
      this.selectedYear = batch.academicYear;
    }
  }

  onApply(): void {
    if (!this.selectedBatchId || !this.selectedYear) {
      this.alert.error('Please select Batch and Academic Year');
      return;
    }
    this.loadTableData({ page: 1, pageSize: 20, search: '' });
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
  }): void {
    this.currentPage = req.page;
    if (!this.selectedBatchId || !this.selectedYear) return;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          batchId: this.selectedBatchId,
          academicYear: this.selectedYear,
          page: req.page,
          limit: req.pageSize,
          search: req.search || '',
        },
        'performance',
        'batch/list',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.dataArray = (res?.data || []).map((s: any) => ({
            studentId: s.studentId,
            admissionNo: s.admissionNo || '—',
            studentName: s.studentName || '—',
            assignmentAvgCgpa:
              s.summary?.assignmentAvgCgpa != null
                ? s.summary.assignmentAvgCgpa.toFixed(2)
                : '—',
            mockAvgPct:
              s.summary?.mockAvgPct != null
                ? s.summary.mockAvgPct.toFixed(1) + '%'
                : '—',
            schoolAvgPct:
              s.summary?.schoolAvgPct != null
                ? s.summary.schoolAvgPct.toFixed(1) + '%'
                : '—',
            combinedScore:
              s.summary?.combinedScore != null
                ? s.summary.combinedScore.toFixed(1)
                : '—',
            batchRank:
              s.summary?.batchRank != null ? '#' + s.summary.batchRank : '—',
            _raw: s,
          }));
          this.totalRecords = res?.count || 0;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  viewStudent(row: any): void {
    if (!this.permissionService.hasPermission('performance:view')) return;
    this.listStateService.savePage(PERFORMANCE_LIST_STATE_KEY, this.currentPage);
    this.router.navigate(['/app/performance/student', row.studentId], {
      state: { batchId: this.selectedBatchId, academicYear: this.selectedYear },
    });
  }

  syncStudent(row: any): void {
    if (!this.permissionService.hasPermission('performance:sync')) return;
    this.syncingStudentId = row.studentId;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: row.studentId,
          academicYear: this.selectedYear,
        },
        'performance',
        'sync/all',
      )
      .subscribe({
        next: (res: any) => {
          this.syncingStudentId = '';
          if (res?.status) {
            this.alert.success('Performance synced successfully');
            this.loadTableData({ page: 1, pageSize: 20 });
          } else {
            this.alert.error(res?.message || 'Sync failed');
          }
        },
        error: () => {
          this.syncingStudentId = '';
          this.alert.error('Sync failed');
        },
      });
  }

  syncBatch(): void {
    if (!this.permissionService.hasPermission('performance:sync')) return;
    if (!this.selectedBatchId || !this.selectedYear) {
      this.alert.error('Select batch and year first');
      return;
    }
    this.syncing = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          batchId: this.selectedBatchId,
          academicYear: this.selectedYear,
        },
        'performance',
        'sync/batch',
      )
      .subscribe({
        next: (res: any) => {
          this.syncing = false;
          if (res?.status) {
            this.alert.success(
              `Batch synced — ${res.synced} students, ${res.ranked} ranked`,
            );
            this.loadTableData({ page: 1, pageSize: 20 });
          } else {
            this.alert.error(res?.message || 'Batch sync failed');
          }
        },
        error: () => {
          this.syncing = false;
          this.alert.error('Batch sync failed');
        },
      });
  }

  goToReport(): void {
    this.listStateService.savePage(PERFORMANCE_LIST_STATE_KEY, this.currentPage);
    this.router.navigate(['/app/performance/batch-report'], {
      state: {
        batchId: this.selectedBatchId,
        academicYear: this.selectedYear,
        batchCode: this.selectedBatchCode,
      },
    });
  }

  openOverride(row: any): void {
    if (!this.permissionService.hasPermission('performance:override')) return;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          studentId: row.studentId,
          academicYear: this.selectedYear,
        },
        'performance',
        'student/full',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.overrideStudent = row;
            this.overrideSubjects = res.data?.assignments || [];
            this.overrideForm = {
              subjectId: '',
              cgpa: '',
              marksSecured: '',
              marksTotal: '',
              attempts: '',
            };
            this.openModal('overrideModal');
          }
        },
        error: () => {},
      });
  }

  onOverrideSubjectChange(): void {
    const sub = this.overrideSubjects.find(
      (s: any) => s.subjectId === this.overrideForm.subjectId,
    );
    if (sub) {
      this.overrideForm.cgpa = sub.cgpa != null ? String(sub.cgpa) : '';
      this.overrideForm.marksSecured =
        sub.obtainedMarks != null ? String(sub.obtainedMarks) : '';
      this.overrideForm.marksTotal =
        sub.totalMarks != null ? String(sub.totalMarks) : '';
      this.overrideForm.attempts =
        sub.attempts != null ? String(sub.attempts) : '';
    }
  }

  saveOverride(): void {
    if (!this.permissionService.hasPermission('performance:override')) return;
    if (!this.overrideForm.subjectId) {
      this.alert.error('Select a subject');
      return;
    }
    this.overrideSaving = true;
    const payload: any = {
      entiId: this.tenantId,
      studentId: this.overrideStudent.studentId,
      academicYear: this.selectedYear,
      subjectId: this.overrideForm.subjectId,
    };
    if (this.overrideForm.cgpa) payload.cgpa = Number(this.overrideForm.cgpa);
    if (this.overrideForm.marksSecured)
      payload.marksSecured = Number(this.overrideForm.marksSecured);
    if (this.overrideForm.marksTotal)
      payload.marksTotal = Number(this.overrideForm.marksTotal);
    if (this.overrideForm.attempts)
      payload.attempts = Number(this.overrideForm.attempts);

    this.commonApi
      .fetchData(payload, 'performance', 'assignment/override')
      .subscribe({
        next: (res: any) => {
          this.overrideSaving = false;
          if (res?.status) {
            this.alert.success('Override saved');
            this.closeModal('overrideModal');
            this.loadTableData({ page: 1, pageSize: 20 });
          } else {
            this.alert.error(res?.message || 'Override failed');
          }
        },
        error: () => {
          this.overrideSaving = false;
          this.alert.error('Override failed');
        },
      });
  }

  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) new (window as any).bootstrap.Modal(el).show();
  }
  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }

  onRowSelected(row: any) {
    // custom-table's (rowClick) bypasses the View Detail icon's `show` gate — guard here too.
    if (!this.permissionService.hasPermission('performance:view')) return;
    this.listStateService.savePage(PERFORMANCE_LIST_STATE_KEY, this.currentPage);
    this.router.navigate(['/app/performance/student', row.studentId], {
      state: { batchId: this.selectedBatchId, academicYear: this.selectedYear },
    });
  }

  async printAllCPT(): Promise<void> {
    if (!this.permissionService.hasPermission('performance:view')) return;
    if (!this.selectedBatchId || !this.selectedYear) {
      this.alert.error('Select batch and year first');
      return;
    }
    this.printingAllCPT = true;
    try {
      const students = await this.fetchAllBatchStudents();
      if (!students.length) {
        this.alert.error('No students found');
        return;
      }
      const allPages: string[] = [];
      for (const s of students) {
        const [mockExams, profile] = await Promise.all([
          this.fetchStudentMockExams(s.studentId),
          this.fetchStudentProfile(s.studentId),
        ]);
        if (!mockExams.length) continue;
        const batchStatsMap = new Map<string, SectionStats[]>();
        const highestTotalMap = new Map<string, number>();
        for (const exam of mockExams) {
          if (!exam.examId) continue;
          try {
            const res: any = await this.commonApi
              .fetchData(
                {
                  entiId: this.tenantId,
                  examId: exam.examId,
                  batchId: this.selectedBatchId,
                },
                'exam',
                'result/batch-subject-stats',
              )
              .toPromise();
            if (res?.status) {
              batchStatsMap.set(exam.examId, res.data || []);
              if (res.batchHighestTotal != null) {
                highestTotalMap.set(exam.examId, res.batchHighestTotal);
              }
            }
          } catch (e) {}
        }
        const printStudent: PrintStudent = {
          studentName: profile?.basic?.name || s.studentName || '—',
          admissionNo: profile?.basic?.admissionNo || s.admissionNo || '—',
          classNo: profile?.basic?.classNo || null,
          programName: profile?.program?.programName || '—',
          batchCode: this.selectedBatchCode || '—',
        };
        const pageHtml = await buildCPTPageHtml(
          printStudent,
          mockExams,
          batchStatsMap,
          highestTotalMap,
        );
        allPages.push(pageHtml);
      }
      if (!allPages.length) {
        this.alert.error('No data to print');
        return;
      }
      const html = wrapAllPages(allPages, 'cpt');
      await exportToPdf(
        html,
        `CPT_Batch_${this.selectedBatchCode}_${this.selectedYear}.pdf`,
      );
    } finally {
      this.printingAllCPT = false;
    }
  }

  async printAllSchool(): Promise<void> {
    if (!this.permissionService.hasPermission('performance:view')) return;
    if (!this.selectedBatchId || !this.selectedYear) {
      this.alert.error('Select batch and year first');
      return;
    }
    this.printingAllSchool = true;
    try {
      const students = await this.fetchAllBatchStudents();
      if (!students.length) {
        this.alert.error('No students found');
        return;
      }
      const batchSection = await this.fetchBatchSection(this.selectedBatchId);
      const allPages: string[] = [];
      for (const s of students) {
        const [schoolExams, profile] = await Promise.all([
          this.fetchStudentSchoolExams(s.studentId),
          this.fetchStudentProfile(s.studentId),
        ]);
        if (!schoolExams.length) continue;
        const printStudent: PrintStudent = {
          studentName: profile?.basic?.name || s.studentName || '—',
          admissionNo: profile?.basic?.admissionNo || s.admissionNo || '—',
          classNo: profile?.basic?.classNo || null,
          programName: profile?.program?.programName || '—',
          batchCode: this.selectedBatchCode || '—',
          academicYear: this.selectedYear,
          section: batchSection,
        };
        // allPages.push(buildSchoolPageHtml(printStudent, schoolExams));
        const pageHtml = await buildSchoolPageHtml(printStudent, schoolExams);
        allPages.push(pageHtml);
      }
      if (!allPages.length) {
        this.alert.error('No data to print');
        return;
      }
      // openPrintWindow(wrapAllPages(allPages, 'school'));
      const html = wrapAllPages(allPages, 'school');
      await exportToPdf(
        html,
        `School_Batch_${this.selectedBatchCode}_${this.selectedYear}.pdf`,
        '#F7F06A',
      );
    } finally {
      this.printingAllSchool = false;
    }
  }

  private fetchAllBatchStudents(): Promise<any[]> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          {
            entiId: this.tenantId,
            batchId: this.selectedBatchId,
            academicYear: this.selectedYear,
            page: 1,
            limit: 200,
          },
          'performance',
          'batch/list',
        )
        .subscribe({
          next: (res: any) => resolve(res?.data || []),
          error: () => resolve([]),
        });
    });
  }

  private fetchStudentMockExams(studentId: string): Promise<any[]> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          {
            entiId: this.tenantId,
            studentId,
            academicYear: this.selectedYear,
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

  private fetchStudentSchoolExams(studentId: string): Promise<any[]> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          {
            entiId: this.tenantId,
            studentId,
            academicYear: this.selectedYear,
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

  private fetchStudentProfile(studentId: string): Promise<any> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId, studentId }, 'ims/student', 'view')
        .subscribe({
          next: (res: any) => resolve(res?.data || null),
          error: () => resolve(null),
        });
    });
  }

  private fetchBatchSection(batchId: string): Promise<string> {
    if (!batchId) return Promise.resolve('');
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId, batchId }, 'batch', 'view')
        .subscribe({
          next: (res: any) => resolve(res?.data?.section || ''),
          error: () => resolve(''),
        });
    });
  }
}
