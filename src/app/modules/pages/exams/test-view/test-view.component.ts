import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { AuthService } from '../../../../service/auth/auth.service';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import katex from 'katex';

@Component({
  selector: 'app-ass-view',
  standalone: false,
  templateUrl: './test-view.component.html',
  styleUrl: './test-view.component.scss'
})
export class TestViewComponent implements OnInit {

  examData: any = {};
  loading = false;
  isDraft = false;
  tenantId = '';
  activeTab: 'details' | 'results' = 'details';
  resultSubTab: 'batches' | 'leaderboard' | 'attempts' | 'timing' = 'batches';
  hasResults = false;
  batchLoading = false;
  batchData: any[] = [];
  totalBatchRecords = 0;
  batchColumns = [
    { key: 'batchId', label: 'Batch Code', sortable: false },
    { key: 'statusDisplay', label: 'Status', sortable: false },
    { key: 'studentCount', label: 'Students', sortable: false },
    { key: 'assignedCount', label: 'Assigned', sortable: false },
    { key: 'startedCount', label: 'Started', sortable: false },
    { key: 'completedCount', label: 'Completed', sortable: false }
  ];
  batchTableData: any[] = [];
  batchActions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View Batch Results',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewBatchResult(row)
    }
  ];
  analyticsLoading = false;
  analyticsData: any[] = [];
  sectionAnalyticsMap: Record<string, any[]> = {};
  attemptsChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  attemptsChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Section-wise Attempts', font: { size: 15, weight: 'bold' } }
    },
    scales: {
      x: { stacked: true, title: { display: true, text: 'Section' } },
      y: { stacked: true, title: { display: true, text: 'Count' }, beginAtZero: true, ticks: { stepSize: 1 } }
    }
  };
  timingLoading = false;
  timingData: any[] = [];
  sectionTimingMap: Record<string, any[]> = {};
  timingChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  timingChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Section-wise Avg Time', font: { size: 15, weight: 'bold' } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const sec = Math.round(ctx.raw || 0);
            let formatted: string;
            if (sec >= 3600) formatted = Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm ' + (sec % 60) + 's';
            else if (sec >= 60) formatted = Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
            else formatted = sec + 's';
            return ctx.dataset.label + ': ' + formatted;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: 'Section' } },
      y: {
        title: { display: true, text: 'Time' },
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            const sec = Number(value);
            if (sec >= 3600) return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
            if (sec >= 60) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
            return sec + 's';
          }
        }
      }
    }
  };
  leaderboardLoading = false;
  leaderboardData: any[] = [];
  totalLeaderboardRecords = 0;
  leaderboardPage = 1;
  leaderboardLimit = 20;
  leaderboardBatchId = '';
  showStudentModal = false;
  studentResultLoading = false;
  studentResult: any = null;
  studentAnswersBySection: Record<string, any[]> = {};
  selectedBatchId = '';
  allBatches: any[] = [];
  showBatchModal = false;
  batchAssignRow: any = null;
  allAssignableBatches: any[] = [];
  enabledBatchIds: Set<string> = new Set();
  selectedBatchIds: Set<string> = new Set();
  batchModalLoading = false;
  batchAssigning = false;
  showPublishResultModal = false;
  publishResultNote = '';
  publishingResult = false;

  /* ================= REEVALUATE RESULT MODAL ================= */
  showReevaluateModal = false;
  reevaluateNote = '';
  reevaluating = false;

  /* ================= GRACE MARKS MODAL ================= */
  showGraceModal = false;
  graceRow: any = null;
  graceApplying = false;
  graceRemovingGraceId: string | null = null;
  graceForm!: FormGroup;
  graceQuestions: any[] = [];
  graceQuestionsLoading = false;

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder,
    public authService: AuthService
  ) {
    const state: any = history.state;
    if (state?.exam) {
      this.examData = state.exam;
    }
    console.log("this.examData ", this.examData)
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'View' }
    ]);

    if (!this.examData?.examId) {
      this.alert.error('Exam data not found');
      this.router.navigate(['/app/exams/exams']);
      return;
    }

    this.isDraft = this.examData.status === 'draft';
    this.hasResults = this.examData.status === 'result_published';

    this.initGraceForm();

    if (this.hasResults) {
      this.fetchBatches();
      this.fetchAnalytics();
      this.fetchTimingAnalytics();
    }
  }

  /* ================= ACTION VISIBILITY ================= */
  get canPublishResult(): boolean {
    const status = this.examData?.status;
    const hasGraces = this.examData?.graces && this.examData.graces.length > 0;
    return status === 'published' || hasGraces;
  }
  get canAssignBatch(): boolean {
    const status = this.examData?.status;
    return status !== 'draft' && status !== 'result_published';
  }
  get canRearrange(): boolean {
    const status = this.examData?.status;
    return status !== 'result_published' && status !== 'completed';
  }
  get canShowGrace(): boolean {
    return this.examData?.status !== 'draft';
  }

  /* ================= NAV ACTIONS ================= */
  showDuplicateModal = false;
  promptDuplicateExam() {
    this.showDuplicateModal = true;
  }
  duplicateExam(withQuestions: boolean) {
    this.router.navigate(['/app/exams/exams/create'], { state: { test: this.examData, duplicate: true, withQuestions } });
    this.showDuplicateModal = false;
  }
  closeDuplicateModal() {
    this.showDuplicateModal = false;
  }
  rearrangeQuestions() {
    this.router.navigate(['/app/exams/exams/question-rearrange'], { state: { questions: this.examData } });
  }
  importAnswers() {
    this.router.navigate(['/app/exams/exams/answer-import'], { state: { exam: this.examData } });
  }

  /* ================= PUBLISH RESULT ================= */
  openPublishResultModal() {
    this.publishResultNote = '';
    this.showPublishResultModal = true;
  }
  cancelPublishResult() {
    this.showPublishResultModal = false;
    this.publishResultNote = '';
  }
  confirmPublishResult() {
    if (this.publishingResult) return;

    const payload = {
      entiId: this.tenantId,
      examId: this.examData.examId,
      publishedAt: Date.now(),
      note: this.publishResultNote.trim() || 'Result published'
    };

    this.publishingResult = true;
    this.commonApi.fetchData(payload, 'exam', 'publish-result').subscribe({
      next: (res: any) => {
        this.publishingResult = false;
        if (res?.status) {
          this.alert.success('Result published successfully');
          this.showPublishResultModal = false;
          this.publishResultNote = '';
          this.examData.status = 'result_published';
          this.hasResults = true;
        } else {
          this.alert.error(res?.message || 'Failed to publish result');
        }
      },
      error: (err: any) => {
        this.publishingResult = false;
        this.alert.error(err?.error?.message || 'Error publishing result');
      }
    });
  }

  /* ================= REEVALUATE RESULT ================= */
  reevaluateResults() {
    this.reevaluateNote = '';
    this.showReevaluateModal = true;
  }

  cancelReevaluate() {
    this.showReevaluateModal = false;
    this.reevaluateNote = '';
  }

  confirmReevaluate() {
    if (this.reevaluating) return;

    const payload = {
      entiId: this.tenantId,
      userId: localStorage.getItem('userId'),
      examId: this.examData.examId,
      note: this.reevaluateNote.trim() || 'Reevaluated result'
    };

    this.reevaluating = true;
    this.commonApi.fetchData(payload, 'exam/grace', 'reevaluate').subscribe({
      next: (res: any) => {
        this.reevaluating = false;
        if (res?.status) {
          this.alert.success('Result reevaluated successfully');
          this.showReevaluateModal = false;
          this.reevaluateNote = '';

          if (this.hasResults) {
            this.fetchBatches();
            this.fetchAnalytics();
            this.fetchTimingAnalytics();
            if (this.resultSubTab === 'leaderboard') {
              this.fetchLeaderboard();
            }
          }
        } else {
          this.alert.error(res?.message || 'Failed to reevaluate result');
        }
      },
      error: (err: any) => {
        this.reevaluating = false;
        this.alert.error(err?.error?.message || 'Error reevaluating result');
      }
    });
  }

  /* ================= BATCH ASSIGN ================= */
  openBatchModal() {
    this.batchAssignRow = this.examData;
    this.enabledBatchIds = new Set();
    this.selectedBatchIds = new Set();
    this.showBatchModal = true;
    this.loadAssignableBatches();
  }
  closeBatchModal() {
    this.showBatchModal = false;
    this.batchAssignRow = null;
    this.allAssignableBatches = [];
    this.enabledBatchIds = new Set();
    this.selectedBatchIds = new Set();
  }
  private loadAssignableBatches() {
    this.batchModalLoading = true;
    const entiId = this.tenantId;

    this.commonApi.fetchData({ entiId }, 'batch', 'list?list=full').subscribe({
      next: (allRes: any) => {
        this.allAssignableBatches = allRes?.data || [];

        this.commonApi.fetchData({ entiId, examId: this.examData.examId }, 'exam/batch', 'list-by-exam').subscribe({
          next: (assignedRes: any) => {
            const assignedBatches = assignedRes?.data || [];
            assignedBatches.forEach((b: any) => {
              if (b.status === 'enabled') {
                this.enabledBatchIds.add(b.batchId);
                this.selectedBatchIds.add(b.batchId);
              }
            });
            this.batchModalLoading = false;
          },
          error: () => { this.batchModalLoading = false; }
        });
      },
      error: () => {
        this.batchModalLoading = false;
        this.alert.error('Error loading batches');
      }
    });
  }
  toggleBatchSelect(batchId: string) {
    if (this.selectedBatchIds.has(batchId)) {
      this.selectedBatchIds.delete(batchId);
    } else {
      this.selectedBatchIds.add(batchId);
    }
  }
  saveBatchChanges() {
    const entiId = this.tenantId;
    const examId = this.examData.examId;

    const toAssign = Array.from(this.selectedBatchIds).filter(id => !this.enabledBatchIds.has(id));
    const toDisable = Array.from(this.enabledBatchIds).filter(id => !this.selectedBatchIds.has(id));

    if (!toAssign.length && !toDisable.length) {
      this.alert.error('No changes to save');
      return;
    }

    this.batchAssigning = true;
    let pending = 0;
    let hasError = false;

    const checkDone = () => {
      pending--;
      if (pending <= 0) {
        this.batchAssigning = false;
        if (!hasError) {
          this.alert.success('Batch changes saved successfully');
          this.closeBatchModal();
          if (this.hasResults) this.fetchBatches();
        }
      }
    };

    if (toAssign.length) {
      pending++;
      this.commonApi.fetchData({ entiId, examId, batchIds: toAssign }, 'exam/batch', 'assign').subscribe({
        next: (res: any) => {
          if (!res?.status) { hasError = true; this.alert.error('Error assigning batches'); }
          checkDone();
        },
        error: (err) => { hasError = true; this.alert.error(err?.error?.message || 'Error assigning batches'); checkDone(); }
      });
    }
    if (toDisable.length) {
      pending++;
      this.commonApi.fetchData({ entiId, examId, batchIds: toDisable }, 'exam/batch', 'disable').subscribe({
        next: (res: any) => {
          if (!res?.status) { hasError = true; this.alert.error('Error disabling batches'); }
          checkDone();
        },
        error: (err) => { hasError = true; this.alert.error(err?.error?.message || 'Error disabling batches'); checkDone(); }
      });
    }
  }

  /* ================= GRACE MARKS ================= */
  private initGraceForm() {
    this.graceForm = this.fb.group({
      subjectId: [''],
      questionId: ['', Validators.required],
      graceMarks: [1, [Validators.required, Validators.min(0)]],
      note: ['', Validators.required]
    });
    this.graceForm.get('subjectId')?.valueChanges.subscribe(() => {
      this.graceForm.patchValue({ questionId: '' });
    });
  }

  openGraceModal() {
    this.graceRow = { ...this.examData };
    if (this.graceRow.graces) {
      this.graceRow.graces = this.graceRow.graces.filter((g: any) => g.isActive);
    }
    this.graceQuestions = [];
    this.graceForm.reset({ subjectId: '', questionId: '', graceMarks: 1, note: '' });
    this.showGraceModal = true;
    this.loadGraceQuestions();
  }
  closeGraceModal() {
    this.showGraceModal = false;
    this.graceRow = null;
  }
  loadGraceQuestions() {
    this.graceQuestionsLoading = true;
    this.commonApi.fetchData({ entiId: this.tenantId, examId: this.graceRow.examId }, 'exam/questions', 'getallquestions').subscribe({
      next: (res: any) => {
        if (res?.status) {
          const loadedQuestions = res.data?.questions || [];
          this.graceQuestions = loadedQuestions.map((q: any) => ({
            ...q,
            questionHtml: this.renderLatexInHtml(q.questionHtml || q.question || '')
          }));
        }
        this.graceQuestionsLoading = false;
      },
      error: (err) => {
        this.graceQuestionsLoading = false;
        console.error('Error loading questions:', err);
      }
    });
  }
  getFilteredGraceQuestions() {
    const selected = this.graceForm.get('subjectId')?.value;
    if (!selected || selected === '' || selected === 'null' || selected === 'undefined') {
      return this.graceQuestions;
    }
    const targetId = String(selected).trim();
    return this.graceQuestions.filter(q => {
      const qSubId = q.subjectId?._id || q.subjectId;
      if (!qSubId) return false;
      return String(qSubId).trim() === targetId;
    });
  }
  getAvailableSections() {
    return this.graceRow?.sections || [];
  }
  applyGrace() {
    if (this.graceForm.invalid) {
      this.graceForm.markAllAsTouched();
      return;
    }
    const formValue = this.graceForm.value;
    const selectedQ = this.graceQuestions.find((q: any) => (q.questionId || q._id) === formValue.questionId);
    const sectionId = selectedQ?.sectionId || this.graceRow?.sections?.[0]?.sectionId;

    const payload = {
      entiId: this.tenantId,
      userId: localStorage.getItem('userId'),
      examId: this.graceRow.examId,
      questionId: formValue.questionId,
      sectionId: sectionId,
      graceMarks: formValue.graceMarks,
      note: formValue.note
    };

    this.graceApplying = true;
    this.commonApi.fetchData(payload, 'exam/grace', 'add').subscribe({
      next: (res: any) => {
        this.graceApplying = false;
        if (res?.status) {
          this.alert.success('Grace marks applied successfully');
          this.closeGraceModal();
        } else {
          this.alert.error(res?.message || 'Failed to apply grace marks');
        }
      },
      error: (err) => {
        this.graceApplying = false;
        this.alert.error(err?.error?.message || 'Error applying grace marks');
      }
    });
  }
  removeGrace(graceId: string) {
    if (!confirm('Are you sure you want to remove this grace mark?')) return;

    const payload = {
      entiId: this.tenantId,
      examId: this.graceRow.examId,
      graceId: graceId,
      userId: localStorage.getItem('userId')
    };

    this.graceRemovingGraceId = graceId;
    this.commonApi.fetchData(payload, 'exam/grace', 'remove').subscribe({
      next: (res: any) => {
        this.graceRemovingGraceId = null;
        if (res?.status) {
          this.alert.success('Grace mark removed successfully');
          this.graceRow.graces = this.graceRow.graces.filter((g: any) => g.graceId !== graceId);
        } else {
          this.alert.error(res?.message || 'Failed to remove grace mark');
        }
      },
      error: (err) => {
        this.graceRemovingGraceId = null;
        this.alert.error(err?.error?.message || 'Error removing grace mark');
      }
    });
  }

  /* ================= GRACE QUESTION SELECTOR ================= */
  showGraceQuestionSelector = false;

  openGraceQuestionSelector() {
    this.showGraceQuestionSelector = true;
  }

  closeGraceQuestionSelector() {
    this.showGraceQuestionSelector = false;
  }

  selectGraceQuestion(q: any) {
    this.graceForm.patchValue({ questionId: q.questionId || q._id });
    this.showGraceQuestionSelector = false;
  }

  private decodeHtmlEntities(text: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  private renderLatexInHtml(html: string): string {
    if (!html) return html;
    let result = html.replace(/\\\[([\s\S]+?)\\\]/g, (match, tex) => {
      try { return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: true }); } catch (e) { return match; }
    });
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
      try { return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: true }); } catch (e) { return match; }
    });
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (match, tex) => {
      try { return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: false }); } catch (e) { return match; }
    });
    result = result.replace(/\$([^$]+?)\$/g, (match, tex) => {
      try { return katex.renderToString(this.decodeHtmlEntities(tex.trim()), { throwOnError: false, displayMode: false }); } catch (e) { return match; }
    });
    return result;
  }

  getSelectedQuestionText(): string {
    const qId = this.graceForm.get('questionId')?.value;
    if (!qId) return '';
    const idx = this.graceQuestions.findIndex((q: any) => (q.questionId || q._id) === qId);
    if (idx !== -1) return `Question ${idx + 1}`;
    return qId;
  }

  /* ================= TAB ================= */

  switchTab(tab: 'details' | 'results') {
    this.activeTab = tab;
  }

  switchResultSubTab(tab: 'batches' | 'leaderboard' | 'attempts' | 'timing') {
    this.resultSubTab = tab;
    if (tab === 'leaderboard' && this.leaderboardData.length === 0) {
      this.fetchLeaderboard();
    }
  }

  /* ================= BATCH LIST ================= */

  private fetchBatches() {
    this.batchLoading = true;
    const payload = {
      entiId: this.tenantId,
      examId: this.examData.examId
    };

    this.commonApi.fetchData(payload, 'exam/batch', 'list-by-exam').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.batchData = res.data || [];
          this.totalBatchRecords = res.count || 0;
          this.batchTableData = this.batchData.map((item: any) => ({
            ...item,
            statusDisplay: item.status === 'enabled' ? 'Enabled' : 'Disabled'
          }));
          this.allBatches = this.batchData.map((b: any) => ({
            batchId: b.batchId,
            label: b.batchId
          }));
        }
        this.batchLoading = false;
      },
      error: () => {
        this.batchLoading = false;
        this.alert.error('Error loading batches');
      }
    });
  }

  viewBatchResult(row: any) {
    this.router.navigate(['/app/exams/exams/result-view'], {
      state: { batch: row, exam: this.examData }
    });
  }

  /* ================= ANALYTICS ================= */

  fetchAnalytics() {
    this.analyticsLoading = true;
    const payload: any = {
      entiId: this.tenantId,
      examId: this.examData.examId
    };
    if (this.selectedBatchId) {
      payload.batchId = this.selectedBatchId;
    }

    this.commonApi.fetchData(payload, 'exam/result/analytics', 'attempts').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.analyticsData = res.data || [];
          this.buildSectionAnalytics();
        }
        this.analyticsLoading = false;
      },
      error: () => {
        this.analyticsLoading = false;
        this.alert.error('Error loading analytics');
      }
    });
  }

  fetchTimingAnalytics() {
    this.timingLoading = true;
    const payload: any = {
      entiId: this.tenantId,
      examId: this.examData.examId
    };
    if (this.selectedBatchId) {
      payload.batchId = this.selectedBatchId;
    }

    this.commonApi.fetchData(payload, 'exam/result/analytics', 'timing').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.timingData = res.data || [];
          this.buildSectionTiming();
        }
        this.timingLoading = false;
      },
      error: () => {
        this.timingLoading = false;
        this.alert.error('Error loading timing analytics');
      }
    });
  }

  /* ================= LEADERBOARD ================= */

  fetchLeaderboard() {
    this.leaderboardLoading = true;
    const payload: any = {
      entiId: this.tenantId,
      examId: this.examData.examId
    };
    if (this.leaderboardBatchId) {
      payload.batchId = this.leaderboardBatchId;
    }

    const query = `page=${this.leaderboardPage}&limit=${this.leaderboardLimit}`;

    this.commonApi.fetchData(payload, 'exam/result', `leaderboard?${query}`).subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.leaderboardData = res.data || [];
          this.totalLeaderboardRecords = res.count || 0;
        }
        this.leaderboardLoading = false;
      },
      error: () => {
        this.leaderboardLoading = false;
        this.alert.error('Error loading leaderboard');
      }
    });
  }

  onLeaderboardBatchChange() {
    this.leaderboardPage = 1;
    this.fetchLeaderboard();
  }

  onLeaderboardPageChange(page: number) {
    if (page < 1 || page > this.leaderboardTotalPages) return;
    this.leaderboardPage = page;
    this.fetchLeaderboard();
  }

  get leaderboardTotalPages(): number {
    return Math.ceil(this.totalLeaderboardRecords / this.leaderboardLimit) || 1;
  }

  get leaderboardPageNumbers(): number[] {
    const total = this.leaderboardTotalPages;
    const current = this.leaderboardPage;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getPercentage(obtained: number, total: number): string {
    if (!total) return '0%';
    return ((obtained / total) * 100).toFixed(1) + '%';
  }

  getSectionResultFromLeaderboard(result: any, sectionId: string): any {
    return (result.sectionResults || []).find((sr: any) => sr.sectionId === sectionId) || null;
  }

  onBatchFilterChange() {
    this.fetchAnalytics();
    this.fetchTimingAnalytics();
  }

  private buildSectionAnalytics() {
    this.sectionAnalyticsMap = {};
    this.analyticsData.forEach((a: any) => {
      if (!this.sectionAnalyticsMap[a.sectionId]) {
        this.sectionAnalyticsMap[a.sectionId] = [];
      }
      this.sectionAnalyticsMap[a.sectionId].push(a);
    });
    this.buildAttemptsChart();
  }

  private buildAttemptsChart() {
    const sectionIds = this.getSectionKeys();
    const labels = sectionIds.map(id => this.getSectionName(id));
    const correctData = sectionIds.map(id => {
      const items = this.sectionAnalyticsMap[id] || [];
      return items.reduce((s: number, i: any) => s + (i.correctCount || 0), 0);
    });
    const wrongData = sectionIds.map(id => {
      const items = this.sectionAnalyticsMap[id] || [];
      return items.reduce((s: number, i: any) => s + (i.wrongCount || 0), 0);
    });
    const skippedData = sectionIds.map(id => {
      const items = this.sectionAnalyticsMap[id] || [];
      return items.reduce((s: number, i: any) => s + (i.skippedCount || 0), 0);
    });

    this.attemptsChartData = {
      labels,
      datasets: [
        { label: 'Correct', data: correctData, backgroundColor: '#22c55e', borderRadius: 4 },
        { label: 'Wrong', data: wrongData, backgroundColor: '#ef4444', borderRadius: 4 },
        { label: 'Skipped', data: skippedData, backgroundColor: '#f59e0b', borderRadius: 4 }
      ]
    };
  }

  private buildSectionTiming() {
    this.sectionTimingMap = {};
    this.timingData.forEach((t: any) => {
      if (!this.sectionTimingMap[t.sectionId]) {
        this.sectionTimingMap[t.sectionId] = [];
      }
      this.sectionTimingMap[t.sectionId].push(t);
    });
    this.buildTimingChart();
  }

  private buildTimingChart() {
    const sectionIds = this.getTimingSectionKeys();
    const labels = sectionIds.map(id => this.getSectionName(id));
    const avgData = sectionIds.map(id => {
      const items = this.sectionTimingMap[id] || [];
      if (!items.length) return 0;
      const total = items.reduce((s: number, i: any) => s + (i.avgTimeTaken || 0), 0);
      return Math.round(total / items.length);
    });
    const minData = sectionIds.map(id => {
      const items = this.sectionTimingMap[id] || [];
      if (!items.length) return 0;
      return Math.round(Math.min(...items.map((i: any) => i.minTimeTaken || 0)));
    });
    const maxData = sectionIds.map(id => {
      const items = this.sectionTimingMap[id] || [];
      if (!items.length) return 0;
      return Math.round(Math.max(...items.map((i: any) => i.maxTimeTaken || 0)));
    });

    this.timingChartData = {
      labels,
      datasets: [
        { label: 'Avg Time', data: avgData, backgroundColor: '#3b82f6', borderRadius: 4 },
        { label: 'Min Time', data: minData, backgroundColor: '#22c55e', borderRadius: 4 },
        { label: 'Max Time', data: maxData, backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    };
  }

  getTimingSectionKeys(): string[] {
    return Object.keys(this.sectionTimingMap);
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

  formatSeconds(sec: number): string {
    if (!sec) return '-';
    sec = Math.round(sec);
    if (sec >= 3600) {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      return `${hrs}h ${mins}m`;
    }
    if (sec >= 60) {
      const mins = Math.floor(sec / 60);
      const s = sec % 60;
      return `${mins}m ${s}s`;
    }
    return `${sec}s`;
  }

  getSectionKeys(): string[] {
    return Object.keys(this.sectionAnalyticsMap);
  }

  getSectionName(sectionId: string): string {
    const section = (this.examData.sections || []).find((s: any) => s.sectionId === sectionId);
    return section?.sectionName || sectionId;
  }

  getSectionSummary(sectionId: string): { totalStudents: number; avgAccuracy: number; totalCorrect: number; totalWrong: number; totalSkipped: number } {
    const items = this.sectionAnalyticsMap[sectionId] || [];
    if (!items.length) return { totalStudents: 0, avgAccuracy: 0, totalCorrect: 0, totalWrong: 0, totalSkipped: 0 };

    const totalCorrect = items.reduce((s: number, i: any) => s + (i.correctCount || 0), 0);
    const totalWrong = items.reduce((s: number, i: any) => s + (i.wrongCount || 0), 0);
    const totalSkipped = items.reduce((s: number, i: any) => s + (i.skippedCount || 0), 0);
    const avgAccuracy = items.reduce((s: number, i: any) => s + (i.accuracyPct || 0), 0) / items.length;
    const totalStudents = items.length > 0 ? items[0].totalStudents : 0;

    return { totalStudents, avgAccuracy: Math.round(avgAccuracy), totalCorrect, totalWrong, totalSkipped };
  }

  /* ================= STUDENT RESULT ================= */

  viewStudentResult(row: any) {
    this.showStudentModal = true;
    this.studentResult = null;
    this.studentAnswersBySection = {};
    this.studentResultLoading = true;

    const payload = {
      entiId: this.tenantId,
      examId: this.examData.examId,
      admissionNo: row.admissionNo
    };

    this.commonApi.fetchData(payload, 'exam/result', 'my-result').subscribe({
      next: (res: any) => {
        if (res?.status && res.data) {
          this.studentResult = res.data;
          this.buildStudentAnswersBySection();
        } else {
          this.alert.error(res?.message || 'Result not found');
          this.showStudentModal = false;
        }
        this.studentResultLoading = false;
      },
      error: () => {
        this.studentResultLoading = false;
        this.alert.error('Error loading student result');
        this.showStudentModal = false;
      }
    });
  }

  closeStudentModal() {
    this.showStudentModal = false;
    this.studentResult = null;
    this.studentAnswersBySection = {};
  }

  private buildStudentAnswersBySection() {
    this.studentAnswersBySection = {};
    if (!this.studentResult?.answers) return;
    this.studentResult.answers.forEach((a: any) => {
      const sid = a.sectionId || 'unknown';
      if (!this.studentAnswersBySection[sid]) {
        this.studentAnswersBySection[sid] = [];
      }
      this.studentAnswersBySection[sid].push(a);
    });
  }

  getStudentAnswerSectionKeys(): string[] {
    return Object.keys(this.studentAnswersBySection);
  }

  getStudentSectionResult(sectionId: string): any {
    return (this.studentResult?.sectionResults || []).find((sr: any) => sr.sectionId === sectionId) || null;
  }

  formatDateFromTimestamp(ts: number): string {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  /* ================= HELPERS ================= */

  formatStatus(status: string): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'published': return 'Published';
      case 'result_published': return 'Result Published';
      case 'completed': return 'Completed';
      default: return status || '-';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'draft': return 'bg-secondary';
      case 'published': return 'bg-success';
      case 'result_published': return 'bg-info';
      case 'completed': return 'bg-primary';
      default: return 'bg-secondary';
    }
  }

  formatTestType(type: string): string {
    switch (type) {
      case 'practice': return 'Practice';
      case 'live': return 'Live';
      case 'mock': return 'Mock';
      default: return type || '-';
    }
  }

  formatMedium(medium: string): string {
    switch (medium) {
      case 'en': return 'English';
      case 'hi': return 'Hindi';
      case 'ta': return 'Tamil';
      default: return medium || '-';
    }
  }

  formatCalculator(type: string): string {
    switch (type) {
      case 'none': return 'None';
      case 'normal': return 'Normal';
      case 'scientific': return 'Scientific';
      default: return type || 'None';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  /* ================= NAVIGATION ================= */

  viewQuestions() {
    this.router.navigate(['/app/exams/exams/question-view'], { state: { questions: this.examData } });
  }

  editExam() {
    this.router.navigate(['/app/exams/exams/create'], { state: { test: this.examData } });
  }
}
