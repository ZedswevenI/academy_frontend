import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import * as XLSX from 'xlsx';
import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import katex from 'katex';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-student-result',
  standalone: false,
  templateUrl: './student-result.component.html',
  styleUrl: './student-result.component.scss',
})
export class StudentResultComponent implements OnInit {
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;

  loading = false;
  examData: any = {};
  studentInfo: any = {};
  studentResult: any = null;
  tenantId = '';

  studentAnswersBySection: Record<string, any[]> = {};
  subjectMap: Record<string, string> = {};
  leaderboard: any[] = [];

  // Question-wise "view question" popup
  viewQuestionData: any = null;
  viewQuestionLoading = false;
  private allQuestionsCache: any[] | null = null;

  // Active sub-tab
  activeSubTab:
    | 'summary'
    | 'question_wise'
    | 'questions'
    | 'analysis'
    | 'comparison' = 'summary';

  // Charts
  accuracyChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  accuracyChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  sectionChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  sectionChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Marks' } },
    },
  };

  timeChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  timeChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Seconds' } },
    },
  };

  constructor(
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrumb: BredcrumpService,
  ) {
    const state: any = history.state;
    if (state?.exam) this.examData = state.exam;
    if (state?.student) {
      this.studentInfo = state.student;
      // Pre-initialize basic stats from navigation state
      this.studentResult = {
        completedAt: this.studentInfo.completedAt,
        obtainedMarks: this.studentInfo.obtainedMarks,
        totalMarks: this.studentInfo.totalMarks,
        rank: this.studentInfo.rank,
        percentile: this.studentInfo.percentile,
        correctCount: this.studentInfo.correctCount,
        wrongCount: this.studentInfo.wrongCount,
        skippedCount: this.studentInfo.skippedCount,
      };
      if (this.studentResult.correctCount !== undefined) {
        this.buildCharts();
      }
    }
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'Exam View' },
      { label: 'Student Result' },
    ]);

    if (!this.studentInfo?.admissionNo || !this.examData?.examId) {
      this.alert.error('Missing student or exam data');
      this.router.navigate(['/app/exams/exams']);
      return;
    }

    this.loadInitialData();
  }

  async loadInitialData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadSubjects(),
        this.fetchResultWithQuestions(),
        this.fetchLeaderboard(),
      ]);
    } catch (err) {
      console.error('Error loading page data:', err);
    } finally {
      this.loading = false;
    }
  }

  private loadSubjects(): Promise<void> {
    return new Promise((resolve) => {
      this.commonApi
        .fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full')
        .subscribe({
          next: (res: any) => {
            if (res?.status && res.data) {
              this.subjectMap = res.data.reduce((acc: any, cur: any) => {
                acc[cur._id] = cur.subjectName;
                return acc;
              }, {});
            }
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private fetchResultWithQuestions(): Promise<void> {
    return new Promise((resolve) => {
      const payload = {
        entiId: this.tenantId,
        examId: this.examData.examId,
        admissionNo: this.studentInfo.admissionNo,
      };

      // Using the combined API provided by user
      this.commonApi
        .fetchData(payload, 'exam/result', 'my-result/with/questions')
        .subscribe({
          next: async (res: any) => {
            if (res?.status && res.data) {
              // Merge background data with state data
              const data = { ...this.studentResult, ...res.data };

              // Always calculate sectionResults and summary counts from answers to ensure 100% accuracy
              if (data.answers) {
                let c = 0,
                  w = 0,
                  s = 0;
                const secMap: Record<string, any> = {};

                data.answers.forEach((ans: any) => {
                  // Main counts
                  if (ans.isSkipped) s++;
                  else if (ans.isCorrect) c++;
                  else w++;

                  // Sectional grouping
                  const sid = ans.sectionId || 'unknown';
                  if (!secMap[sid]) {
                    secMap[sid] = {
                      sectionId: sid,
                      totalQuestions: 0,
                      answeredCount: 0,
                      correctCount: 0,
                      wrongCount: 0,
                      skippedCount: 0,
                      obtainedMarks: 0,
                      totalMarks: 0,
                      timeTaken: 0,
                    };
                  }
                  const sec = secMap[sid];
                  sec.totalQuestions++;
                  sec.totalMarks += ans.positiveMarks || 0;
                  sec.timeTaken += ans.timeTaken || 0;

                  if (ans.isSkipped) {
                    sec.skippedCount++;
                  } else {
                    sec.answeredCount++;
                    sec.obtainedMarks += ans.marksAwarded || 0;
                    if (ans.isCorrect) sec.correctCount++;
                    else sec.wrongCount++;
                  }
                });

                // Overwrite summary data with calculated values
                data.correctCount = c;
                data.wrongCount = w;
                data.skippedCount = s;
                data.sectionResults = Object.values(secMap);
                // for (let a of data.answers) {
                //   if (a.questionHtml) {
                //     a.questionHtml = await this.replaceDownloadUrls(a.questionHtml);
                //   }
                //   if (a.questionOptions) {
                //     for (let opt of a.questionOptions) {
                //       if (opt.textHtml) {
                //         opt.textHtml = await this.replaceDownloadUrls(opt.textHtml);
                //       }
                //     }
                //   }
                // }
                for (let a of data.answers) {
                  try {
                    if (a.questionHtml) {
                      a.questionHtml = await this.replaceDownloadUrls(
                        a.questionHtml,
                      );
                    }
                    if (a.questionOptions) {
                      for (let opt of a.questionOptions) {
                        try {
                          if (opt.textHtml) {
                            opt.textHtml = await this.replaceDownloadUrls(
                              opt.textHtml,
                            );
                          }
                        } catch (e) {
                          /* continue */
                        }
                      }
                    }
                  } catch (e) {
                    /* continue to next question */
                  }
                }
              }
              this.studentResult = data;
              this.buildStudentAnswersBySection();
              this.buildCharts();
            } else {
              this.alert.error(res?.message || 'Result not found');
            }
            resolve();
          },
          error: () => {
            this.alert.error('Error loading result');
            resolve();
          },
        });
    });
  }

  private fetchLeaderboard(): Promise<void> {
    return new Promise((resolve) => {
      const payload = {
        entiId: this.tenantId,
        examId: this.examData.examId,
      };
      this.commonApi
        .fetchData(payload, 'exam/result', 'leaderboard')
        .subscribe({
          next: (res: any) => {
            if (res?.status) {
              const list = res.data || [];
              this.leaderboard = list.slice(0, 10);

              // Sync completion date for current student if missing in main payload
              if (this.studentResult) {
                const myEntry = list.find(
                  (item: any) =>
                    item.admissionNo === this.studentInfo.admissionNo,
                );
                if (myEntry?.completedAt) {
                  this.studentResult.completedAt = myEntry.completedAt;
                }
              }
            }
            resolve();
          },
          error: () => resolve(),
        });
    });
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

  private buildCharts() {
    if (!this.studentResult) return;

    // Accuracy Doughnut
    this.accuracyChartData = {
      labels: ['Correct', 'Wrong', 'Skipped'],
      datasets: [
        {
          data: [
            this.studentResult.correctCount || 0,
            this.studentResult.wrongCount || 0,
            this.studentResult.skippedCount || 0,
          ],
          backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
          borderWidth: 0,
        },
      ],
    };

    // Section-wise Marks Bar
    const labels = (this.studentResult.sectionResults || []).map((sr: any) =>
      this.getSectionName(sr.sectionId),
    );
    const obtained = (this.studentResult.sectionResults || []).map(
      (sr: any) => sr.obtainedMarks,
    );
    const totals = (this.studentResult.sectionResults || []).map(
      (sr: any) => sr.totalMarks,
    );

    this.sectionChartData = {
      labels,
      datasets: [
        {
          label: 'Obtained',
          data: obtained,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        },
        {
          label: 'Total',
          data: totals,
          backgroundColor: '#e2e8f0',
          borderRadius: 4,
        },
      ],
    };

    // Time Taken Per Question
    if (this.studentResult.answers) {
      const timeLabels = this.studentResult.answers.map(
        (_: any, i: number) => `Q${i + 1}`,
      );
      const timeData = this.studentResult.answers.map(
        (a: any) => (a.timeTaken || 0) / 1000,
      ); // convert to seconds

      this.timeChartData = {
        labels: timeLabels,
        datasets: [
          {
            label: 'Time (s)',
            data: timeData,
            backgroundColor: this.studentResult.answers.map((a: any) =>
              a.isCorrect ? '#22c55e' : a.isSkipped ? '#f59e0b' : '#ef4444',
            ),
            borderRadius: 4,
          },
        ],
      };
    }

    // Trigger chart update
    setTimeout(() => {
      this.charts?.forEach((c) => c.chart?.update());
    }, 100);
  }

  switchTab(tab: any) {
    this.activeSubTab = tab;
  }

  exportToExcel() {
    if (!this.studentResult) return;

    // 1. Summary Sheet
    const summaryData = [
      {
        'Student Name': this.studentInfo.studentName || '---',
        'Admission No': this.studentInfo.admissionNo,
        'Exam Name': this.examData.examName,
        Rank: this.studentResult.rank || '---',
        Percentile: (this.studentResult.percentile || 0) + '%',
        Percentage: this.getPercentage(
          this.studentResult.obtainedMarks,
          this.studentResult.totalMarks,
        ),
        'Obtained Marks': this.studentResult.obtainedMarks || 0,
        'Total Marks': this.studentResult.totalMarks || 0,
        'Total Correct': this.studentResult.correctCount || 0,
        'Total Wrong': this.studentResult.wrongCount || 0,
        'Total Skipped': this.studentResult.skippedCount || 0,
        'Time Taken': this.formatTime(this.studentResult.timeTaken),
        'Completion Date': this.formatDateFromTimestamp(
          this.studentResult.completedAt,
        ),
      },
    ];

    // 2. Questions Sheet
    const questionsData = (this.studentResult.answers || []).map(
      (a: any, i: number) => ({
        'Q.No': i + 1,
        Section: this.getSectionName(a.sectionId),
        Status: a.isSkipped ? 'Skipped' : a.isCorrect ? 'Correct' : 'Incorrect',
        'Your Answer': a.answerRaw || '---',
        'Correct Answer': a.correctAnswer || '---',
        'Time Taken (s)': (a.timeTaken / 1000).toFixed(1),
        Difficulty: a.difficulty || 'Medium',
        Marks: a.marksAwarded,
        'Possible Marks': a.positiveMarks || 0,
      }),
    );

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const wsQuestions = XLSX.utils.json_to_sheet(questionsData);
    XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questions Detail');

    XLSX.writeFile(
      wb,
      `${this.studentInfo.studentName || this.studentInfo.admissionNo}_Performance_Report.xlsx`,
    );
  }

  getSectionName(sectionId: string): string {
    const section = (this.examData.sections || []).find(
      (s: any) => s.sectionId === sectionId,
    );
    if (section?.sectionName) return section.sectionName;
    return this.subjectMap[sectionId] || sectionId;
  }

  getPercentage(obtained: number, total: number): string {
    if (!total) return '0%';
    return ((obtained / total) * 100).toFixed(1) + '%';
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

  getStudentAnswerSectionKeys(): string[] {
    return Object.keys(this.studentAnswersBySection);
  }

  formatDateFromTimestamp(ts: number | string): string {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private decodeHtmlEntities(text: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  renderLatex(html: string): string {
    if (!html) return '';
    let result = html.replace(/\\\[([\s\S]+?)\\\]/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: true,
        });
      } catch (e) {
        return match;
      }
    });
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: true,
        });
      } catch (e) {
        return match;
      }
    });
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        return match;
      }
    });
    result = result.replace(/\$([^$]+?)\$/g, (match, tex) => {
      try {
        return katex.renderToString(this.decodeHtmlEntities(tex.trim()), {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        return match;
      }
    });
    return result;
  }

  async replaceDownloadUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];
    let updatedHtml = html;
    for (const match of matches) {
      const originalUrl = match[1];
      if (originalUrl.includes('data:image')) continue;
      try {
        const res: any = await this.commonApi
          .fetchData({ url: originalUrl }, 'exam/questions/image', 'download')
          .toPromise();
        if (res?.status) {
          updatedHtml = updatedHtml.replace(originalUrl, res.url);
        }
      } catch (err) {
        console.error('Image download error:', err);
      }
    }
    return updatedHtml;
  }

  goBack() {
    this.router.navigate(['/app/exams/exams/view'], {
      state: { exam: this.examData },
    });
  }

  // Handle option labels based on index (A, B, C, D...)
  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Check if a specific option key is selected by student
  isOptionSelected(a: any, optionKey: string): boolean {
    if (!a.answerRaw) return false;
    const raw = String(a.answerRaw);
    // mcq_multi: "A;B;C" format
    if (a.questionType === 'mcq_multi' || a.questionType === 'passage_qns') {
      return raw
        .split(';')
        .map((k: string) => k.trim().toUpperCase())
        .includes(optionKey.toUpperCase());
    }
    // mcq_single: "A" format
    return raw.trim().toUpperCase() === optionKey.toUpperCase();
  }

  // Normalize true/false answer to 'true' or 'false' string
  normalizeBoolean(val: any): string {
    if (
      val === true ||
      val === 'true' ||
      val === 'TRUE' ||
      val === '1' ||
      val === 'yes'
    )
      return 'true';
    if (
      val === false ||
      val === 'false' ||
      val === 'FALSE' ||
      val === '0' ||
      val === 'no'
    )
      return 'false';
    return String(val ?? '')
      .trim()
      .toLowerCase();
  }

  getMatrixStudentAnswer(answerRaw: any, leftKey: string): string[] {
    if (!answerRaw) return [];
    const pairs = String(answerRaw).split(';');
    for (const pair of pairs) {
      const [lk, rk] = pair.split(':');
      if (lk?.trim().toUpperCase() === leftKey.toUpperCase()) {
        if (!rk) return [];
        return rk
          .trim()
          .toUpperCase()
          .split(',')
          .flatMap((part: string) => part.split('').filter(Boolean))
          .filter((k: string) => /^[A-Z]$/.test(k));
      }
    }
    return [];
  }

  getMatrixCorrectKeys(correctAnswer: any, leftKey: string): string[] {
    if (!correctAnswer) return [];
    const pairs = String(correctAnswer).split(';');
    for (const pair of pairs) {
      const match = pair.match(/^([^:]+):([^(]+)\(/);
      if (match && match[1].trim().toUpperCase() === leftKey.toUpperCase()) {
        return match[2]
          .trim()
          .toUpperCase()
          .split(',')
          .flatMap((part: string) => part.split('').filter(Boolean))
          .filter((k: string) => /^[A-Z]$/.test(k));
      }
    }
    return [];
  }

  isMatrixKeyCorrect(
    correctAnswer: any,
    leftKey: string,
    rightKey: string,
  ): boolean {
    const correctKeys = this.getMatrixCorrectKeys(correctAnswer, leftKey);
    return correctKeys.includes(rightKey.toUpperCase());
  }

  // ====================================================
  // VIEW QUESTION POPUP (Question-wise tab)
  // ====================================================

  async openQuestionModal(a: any): Promise<void> {
    if (a.questionHtml) {
      this.viewQuestionData = a;
      return;
    }
    // Answer row has no question content attached — fall back to the same
    // all-questions API the Exam View / Question-wise screens use, and
    // merge in the matching question so every type renders the same way.
    this.viewQuestionLoading = true;
    try {
      const full = await this.fetchFullQuestion(a);
      this.viewQuestionData = full ? { ...a, ...full } : a;
      if (!full) {
        this.alert.error('Full question details are not available for this question');
      }
    } finally {
      this.viewQuestionLoading = false;
    }
  }

  closeQuestionModal(): void {
    this.viewQuestionData = null;
  }

  private async fetchFullQuestion(a: any): Promise<any> {
    try {
      if (!this.allQuestionsCache) {
        const body = { tenantId: this.tenantId, examId: this.examData.examId };
        const res: any = await firstValueFrom(
          this.commonApi.fetchData(body, 'exam/questions', 'getallquestions'),
        );
        this.allQuestionsCache = res?.data?.questions || [];
      }
      const list = this.allQuestionsCache || [];
      const byId = (a.questionId || a._id) &&
        list.find(
          (q: any) =>
            q.questionId === (a.questionId || a._id) ||
            q._id === (a.questionId || a._id),
        );
      const match =
        byId ||
        (a.sectionId && a.questionNo
          ? list.filter((q: any) => q.sectionId === a.sectionId)[a.questionNo - 1]
          : null);
      if (!match) return null;

      const full = { ...match };
      if (full.questionHtml) {
        full.questionHtml = await this.replaceDownloadUrls(full.questionHtml);
      }
      if (full.questionOptions) {
        for (const opt of full.questionOptions) {
          if (opt.textHtml) opt.textHtml = await this.replaceDownloadUrls(opt.textHtml);
        }
      }
      return full;
    } catch (e) {
      return null;
    }
  }
}
