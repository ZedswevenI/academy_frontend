import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import {
  buildCPTPageHtml,
  buildSchoolPageHtml,
  wrapAllPages,
  exportToPdf,
  PrintStudent,
  SectionStats,
} from '../print.helper';

@Component({
  selector: 'app-batchperformance',
  standalone: false,
  templateUrl: './batchperformance.component.html',
  styleUrl: './batchperformance.component.scss',
})
export class BatchperformanceComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId') || '';
  batchId = '';
  batchCode = '';
  academicYear = '';
  batch_options: any[] = [];
  year_options: any[] = [];
  selectedBatchId = '';
  selectedYear = '';
  loading = false;
  overview: any = null;
  subjectWise: any[] = [];
  mockExamWise: any[] = [];
  schoolExamWise: any[] = [];
  activeSection = 'subject';
  printingAllCPT = false;
  printingAllSchool = false;

  constructor(
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
  ) {}

  ngOnInit(): void {
    this.breadcrump.set([
      { label: 'Performance', link: '/app/performance' },
      { label: 'Batch Report' },
    ]);
    const state = history.state;
    if (state?.batchId && state?.academicYear) {
      this.batchId = state.batchId;
      this.batchCode = state.batchCode || '';
      this.academicYear = state.academicYear;
      this.selectedBatchId = state.batchId;
      this.selectedYear = state.academicYear;
      this.loadReport();
    } else {
      this.loadBatches();
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
    this.batchCode = batch?.batchCode || '';
    if (batch?.academicYear && !this.selectedYear)
      this.selectedYear = batch.academicYear;
  }

  onApply(): void {
    if (!this.selectedBatchId || !this.selectedYear) {
      this.alert.error('Please select Batch and Academic Year');
      return;
    }
    this.batchId = this.selectedBatchId;
    this.academicYear = this.selectedYear;
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.tenantId,
          batchId: this.batchId,
          academicYear: this.academicYear,
        },
        'performance',
        'batch/report',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            const d = res.data;
            this.overview = d.overview || null;
            this.subjectWise = d.subjectWise || [];
            this.mockExamWise = d.mockExamWise || [];
            this.schoolExamWise = d.schoolExamWise || [];
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/app/performance']);
  }

  pct(val: any): string {
    return val != null ? Number(val).toFixed(1) + '%' : '—';
  }

  num(val: any, dec = 2): string {
    return val != null ? Number(val).toFixed(dec) : '—';
  }

  formatDate(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  pctColor(val: any): string {
    const n = Number(val);
    if (n >= 75) return '#16a34a';
    if (n >= 50) return '#f59e0b';
    return '#ef4444';
  }

  pctBg(val: any): string {
    const n = Number(val);
    if (n >= 75) return '#dcfce7';
    if (n >= 50) return '#fef9c3';
    return '#fee2e2';
  }

  pctTextColor(val: any): string {
    const n = Number(val);
    if (n >= 75) return '#166534';
    if (n >= 50) return '#92400e';
    return '#991b1b';
  }

  async printAllCPT(): Promise<void> {
    if (!this.batchId || !this.academicYear) {
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
        for (const exam of mockExams) {
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
          } catch (e) {}
        }

        const printStudent: PrintStudent = {
          studentName: profile?.basic?.name || s.studentName || '—',
          admissionNo: profile?.basic?.admissionNo || s.admissionNo || '—',
          classNo: profile?.basic?.classNo || null,
          programName: profile?.program?.programName || '—',
          batchCode: this.batchCode || '—',
        };

        const pageHtml = await buildCPTPageHtml(
          printStudent,
          mockExams,
          batchStatsMap,
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
        `CPT_Batch_${this.batchCode}_${this.academicYear}.pdf`,
      );
    } catch (err) {
      this.alert.error('Failed to export PDF');
    } finally {
      this.printingAllCPT = false;
    }
  }

  async printAllSchool(): Promise<void> {
    if (!this.batchId || !this.academicYear) {
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
          batchCode: this.batchCode || '—',
        };

        const pageHtml = await buildSchoolPageHtml(printStudent, schoolExams);
        allPages.push(pageHtml);
      }

      if (!allPages.length) {
        this.alert.error('No data to print');
        return;
      }
      const html = wrapAllPages(allPages, 'school');
      await exportToPdf(
        html,
        `School_Batch_${this.batchCode}_${this.academicYear}.pdf`,
      );
    } catch (err) {
      this.alert.error('Failed to export PDF');
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
            batchId: this.batchId,
            academicYear: this.academicYear,
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

  private fetchStudentSchoolExams(studentId: string): Promise<any[]> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData(
          {
            entiId: this.tenantId,
            studentId,
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
}
