import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-result-view',
  standalone: false,
  templateUrl: './result-view.component.html',
  styleUrl: './result-view.component.scss'
})
export class ResultViewComponent implements OnInit {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  loading = false;
  batchData: any = {};
  examData: any = {};
  tenantId = '';

  // Student results
  resultsData: any[] = [];
  totalRecords = 0;
  subjectMap: Record<string, string> = {};

  // Table
  columnsArray = [
    { key: 'admissionNo', label: 'Admission No', sortable: true },
    { key: 'rank', label: 'Rank', sortable: true },
    { key: 'obtainedMarks', label: 'Obtained', sortable: true },
    { key: 'totalMarks', label: 'Total', sortable: false },
    { key: 'correctCount', label: 'Correct', sortable: true },
    { key: 'wrongCount', label: 'Wrong', sortable: true },
    { key: 'skippedCount', label: 'Skipped', sortable: true },
    { key: 'percentageDisplay', label: 'Percentage', sortable: true },
    { key: 'statusDisplay', label: 'Status', sortable: false }
  ];
  dataArray: any[] = [];
  actions: any[] = [];

  // Section analytics
  sectionAnalytics: any[] = [];

  // Stacked bar chart
  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Subject-wise Student Performance',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: { display: true, text: 'Subject' }
      },
      y: {
        stacked: true,
        title: { display: true, text: 'Student Count' },
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  // Active tab
  activeTab: 'results' | 'analytics' = 'results';

  constructor(
    public router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrumb: BredcrumpService
  ) {
    const state: any = history.state;
    if (state?.batch) {
      this.batchData = state.batch;
    }
    if (state?.exam) {
      this.examData = state.exam;
    }
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'Result - Batches', link: '/app/exams/exams/result-batch' },
      { label: 'Results' }
    ]);

    if (!this.batchData?.batchId) {
      this.alert.error('Batch data not found');
      this.router.navigate(['/app/exams/exams']);
      return;
    }

    this.loadSubjects();
    this.fetchResults();
    this.fetchSectionAnalytics();
  }

  switchTab(tab: 'results' | 'analytics') {
    this.activeTab = tab;
  }

  private loadSubjects() {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => {
        (res?.data || []).forEach((s: any) => {
          this.subjectMap[s._id] = s.subjectName;
        });
      }
    });
  }

  fetchResults() {
    this.loading = true;
    const payload = {
      entiId: this.tenantId,
      examId: this.examData.examId || this.examData._id,
      batchId: this.batchData.batchId
    };

    this.commonApi.fetchData(payload, 'exam/result', 'list-by-batch').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.resultsData = res.data || [];
          this.totalRecords = res.count || 0;
          this.dataArray = this.resultsData.map((r: any) => ({
            ...r,
            percentageDisplay: r.totalMarks > 0
              ? ((r.obtainedMarks / r.totalMarks) * 100).toFixed(1) + '%'
              : '0%',
            statusDisplay: this.formatStatus(r.status)
          }));
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.alert.error('Error loading results');
      }
    });
  }

  fetchSectionAnalytics() {
    const payload = {
      entiId: this.tenantId,
      examId: this.examData.examId || this.examData._id
    };

    this.commonApi.fetchData(payload, 'exam/result', 'section-analytics').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.sectionAnalytics = res.data || [];
          this.fetchAttemptAnalytics();
        }
      }
    });
  }

  fetchAttemptAnalytics() {
    const payload = {
      entiId: this.tenantId,
      examId: this.examData.examId || this.examData._id
    };

    this.commonApi.fetchData(payload, 'exam/result/analytics', 'attempts').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.buildStackedChart(res.data || []);
        }
      }
    });
  }

  private buildStackedChart(attempts: any[]) {
    // Group by sectionId
    const sectionMap: Record<string, { correct: number; wrong: number; skipped: number; name: string }> = {};

    attempts.forEach((a: any) => {
      if (!sectionMap[a.sectionId]) {
        // Find section name from sectionAnalytics
        const section = this.sectionAnalytics.find((s: any) => s.sectionId === a.sectionId);
        sectionMap[a.sectionId] = {
          correct: 0,
          wrong: 0,
          skipped: 0,
          name: section?.sectionName || a.sectionId
        };
      }
      sectionMap[a.sectionId].correct += a.correctCount;
      sectionMap[a.sectionId].wrong += a.wrongCount;
      sectionMap[a.sectionId].skipped += a.skippedCount;
    });

    const labels = Object.values(sectionMap).map(s => s.name);
    const correctData = Object.values(sectionMap).map(s => s.correct);
    const wrongData = Object.values(sectionMap).map(s => s.wrong);
    const skippedData = Object.values(sectionMap).map(s => s.skipped);

    this.barChartData = {
      labels,
      datasets: [
        {
          label: 'Correct',
          data: correctData,
          backgroundColor: '#22c55e',
          borderRadius: 4
        },
        {
          label: 'Wrong',
          data: wrongData,
          backgroundColor: '#ef4444',
          borderRadius: 4
        },
        {
          label: 'Skipped',
          data: skippedData,
          backgroundColor: '#f59e0b',
          borderRadius: 4
        }
      ]
    };

    setTimeout(() => this.chart?.update(), 100);
  }

  private formatStatus(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatTime(ms: number): string {
    if (!ms) return '-';
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }
}
