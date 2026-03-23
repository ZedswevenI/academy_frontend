import { Component, OnInit, OnDestroy } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { NavigationStart, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../service/auth/auth.service';

@Component({
  selector: 'app-exam-list',
  standalone: false,
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent implements OnInit, OnDestroy {

  loading = false;
  totalRecords = 0;

  private routerSub!: Subscription;

  lastTableParams: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  } | null = null;

  /* ================= BATCH ASSIGN STATE ================= */
  showBatchModal = false;
  batchAssignRow: any = null;
  allBatches: any[] = [];
  enabledBatchIds: Set<string> = new Set();
  selectedBatchIds: Set<string> = new Set();
  batchLoading = false;
  batchAssigning = false;

  /* ================= PRINT STATE ================= */
  showPrintModal = false;
  selectedRow: any = null;
  selectedExamIds: string[] = [];

  /* ================= TABLE COLUMNS ================= */
  columnsArray = [
    { key: 'examCode', label: 'Exam Code', sortable: true },
    { key: 'examName', label: 'Exam Name', sortable: true },
    { key: 'testType', label: 'Type', sortable: true },
    { key: 'totalQuestions', label: 'Questions', sortable: true },
    { key: 'totalMarks', label: 'Marks', sortable: true },
    { key: 'duration', label: 'Duration (min)', sortable: true },
    { key: 'statusDisplay', label: 'Status', sortable: true }
  ];

  dataArray: any[] = [];

  /* ================= FILTERS ================= */
  filterForm!: FormGroup;
  showFilters = false;

  testTypeOptions = [
    { label: 'Practice', value: 'practice' },
    { label: 'Live', value: 'live' },
    { label: 'Mock', value: 'mock' }
  ];

  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Result Published', value: 'result_published' },
    { label: 'Completed', value: 'completed' }
  ];

  mediumOptions = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Tamil', value: 'ta' }
  ];

  /* ================= ACTIONS ================= */
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewQuestions(row)
    },
    {
      type: 'icon',
      icon: 'fa fa-file-import',
      tooltip: 'Import Questions',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.importQuestions(row)
    },
    {
      type: 'icon',
      icon: 'fa fa-plus',
      tooltip: 'Add Question',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.addQuestions(row)
    },
    {
      type: 'dropdown',
      text: 'Actions',
      icon: 'fa-solid fa-ellipsis-vertical',
      color: 'secondary',
      dropdown: [
        { text: 'Edit Exam', icon: 'fa-regular fa-pen-to-square', callback: (row: any) => this.editExam(row) },
        { text: 'Publish Exam', icon: 'fa-solid fa-paper-plane', callback: (row: any) => this.publishExam(row) },
        { text: 'Rearrange Questions', icon: 'fa-solid fa-reorder', callback: (row: any) => this.rearrange(row) },
        { text: 'Add Question', icon: 'fa-solid fa-file-import', callback: (row: any) => this.addQuestions(row) },
        { text: 'Import Questions', icon: 'fa-solid fa-file-import', callback: (row: any) => this.importQuestions(row) },
        { text: 'Assign Batch', icon: 'fa-solid fa-users', callback: (row: any) => this.openBatchModal(row) },
        { text: 'Result', icon: 'fa-solid fa-chart-bar', callback: (row: any) => this.viewResult(row) },
        { text: 'Delete', icon: 'fa-regular fa-trash-can', callback: (row: any) => this.deleteExam(row) }
      ]
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder,
    public authService: AuthService
  ) {
    if (this.authService.assignmentRole()) {
      this.actions.pop();
    }
  }

  /* ================= INIT ================= */
  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Exams' }]);
    this.initFilterForm();

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.forceCloseDropdowns();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  initFilterForm() {
    this.filterForm = this.fb.group({
      search: [''],
      testType: [''],
      status: [''],
      medium: ['']
    });
  }

  toggleFilters() { this.showFilters = !this.showFilters; }

  clearFilters() {
    this.filterForm.reset();
    if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
  }

  /* ================= TABLE ================= */

  fetchTableData(params: any) {
    this.lastTableParams = { ...params };
    this.loading = true;

    let sortParam = '';
    if (params.sortKey) {
      sortParam = params.sortDirection === 'desc' ? `-${params.sortKey}` : params.sortKey;
    }

    const query: any = { page: params.page, limit: params.pageSize };
    if (sortParam) query.sort = sortParam;

    const filters = this.filterForm.value;
    if (params.search) query.search = params.search;
    if (filters.testType) query.testType = filters.testType;
    if (filters.status) query.status = filters.status;
    if (filters.medium) query.medium = filters.medium;

    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'exam', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              id: item._id,
              sectionsSummary: (item.sections || []).map((s: any) => s.sectionName).join(', '),
              statusDisplay: this.formatStatus(item.status)
            }));
            this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error loading exams');
        }
      });
  }

  /* ================= ROW ACTIONS ================= */

  deleteExam(row: any) {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId'), examId: row.examId }, 'exam', 'delete')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Deleted successfully');
            if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
          }
        },
        error: () => this.alert.error('Error deleting exam')
      });
  }

  publishExam(row: any) {
    if (row.status !== 'draft') {
      this.alert.error('Only draft exams can be published');
      return;
    }
    if (!confirm(`Are you sure you want to publish "${row.examName}"?`)) return;

    const payload = {
      entiId: localStorage.getItem('tenantId'),
      examId: row.examId
    };

    this.commonApi.fetchData(payload, 'exam', 'publish').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Exam published successfully');
          if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
        }
      },
      error: () => this.alert.error('Error publishing exam')
    });
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'published': return 'Published';
      case 'result_published': return 'Result Published';
      case 'completed': return 'Completed';
      default: return status;
    }
  }

  viewQuestions(row: any) { this.router.navigate(['/app/exams/exams/question-view'], { state: { questions: row } }); }
  rearrange(row: any) { this.router.navigate(['/app/exams/exams/question-rearrange'], { state: { questions: row } }); }
  editExam(row: any) { this.router.navigate(['/app/exams/exams/create'], { state: { test: row } }); }
  importQuestions(row: any) { this.router.navigate(['/app/exams/exams/question-import'], { state: { questions: row } }); }
  addQuestions(row: any) { this.router.navigate(['/app/exams/exams/question-create'], { state: { question: row } }); }
  viewResult(row: any) { this.router.navigate(['/app/exams/exams/result-batch'], { state: { exam: row } }); }

  /* ================= BATCH ENABLE/DISABLE ================= */

  openBatchModal(row: any) {
    this.batchAssignRow = row;
    this.enabledBatchIds = new Set();
    this.selectedBatchIds = new Set();
    this.showBatchModal = true;
    this.loadBatches();
  }

  closeBatchModal() {
    this.showBatchModal = false;
    this.batchAssignRow = null;
    this.allBatches = [];
    this.enabledBatchIds = new Set();
    this.selectedBatchIds = new Set();
  }

  loadBatches() {
    this.batchLoading = true;
    const entiId = localStorage.getItem('tenantId');

    // Load all batches and already assigned batches in parallel
    this.commonApi.fetchData({ entiId }, 'batch', 'list?list=full').subscribe({
      next: (allRes: any) => {
        this.allBatches = allRes?.data || [];

        // Now load assigned batches for this exam
        this.commonApi.fetchData({ entiId, examId: this.batchAssignRow.examId }, 'exam/batch', 'list-by-exam').subscribe({
          next: (assignedRes: any) => {
            const assignedBatches = assignedRes?.data || [];
            assignedBatches.forEach((b: any) => {

              if (b.status === 'enabled') {
                this.enabledBatchIds.add(b.batchId);
                this.selectedBatchIds.add(b.batchId);
              }
            });
            this.batchLoading = false;
          },
          error: () => {
            this.batchLoading = false;
          }
        });
      },
      error: () => {
        this.batchLoading = false;
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
    const entiId = localStorage.getItem('tenantId');
    const examId = this.batchAssignRow.examId;

    // Newly selected (not previously enabled) -> assign
    const toAssign = Array.from(this.selectedBatchIds).filter(id => !this.enabledBatchIds.has(id));
    // Previously enabled but now unchecked -> disable
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

  /* ================= PRINT ================= */

  printTest(row: any) {
    this.selectedRow = row;
    this.showPrintModal = true;
  }

  closePrintModal() {
    this.showPrintModal = false;
    this.selectedRow = null;
  }

  async fetchAllExamIds(): Promise<string[]> {
    try {
      const filters = this.filterForm.value;
      const query: any = { page: 1, limit: 25 };

      if (filters.testType) query.testType = filters.testType;
      if (filters.status) query.status = filters.status;
      if (filters.medium) query.medium = filters.medium;

      const queryString = Object.keys(query)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');

      const res: any = await firstValueFrom(
        this.commonApi.fetchData(
          { entiId: localStorage.getItem('tenantId') },
          'exam',
          `list?${queryString}`
        )
      );

      if (res?.status && res?.data?.length) {
        return res.data.map((item: any) => item.examId);
      }
    } catch (err) {
      console.error('Error fetching all examIds:', err);
    }
    return [];
  }

  async printAllFilteredTests(withAnswer: boolean): Promise<void> {
    this.loading = true;

    const examIds = await this.fetchAllExamIds();

    if (!examIds.length) {
      this.alert.error('No exams found to print');
      this.loading = false;
      return;
    }

    this.selectedExamIds = examIds;
    await this.printQuestions(withAnswer);
  }

  async printQuestions(withAnswer: boolean): Promise<void> {
    if (!this.selectedExamIds?.length) return;

    this.closePrintModal();
    this.loading = true;

    try {
      const allTestsData = await Promise.all(
        this.selectedExamIds.map(async (examId) => {
          const { meta, questions } = await this.fetchExamQuestions(examId);

          const processed = await Promise.all(
            questions.map(async (q: any) => {
              const questionHtml = await this.replaceDownloadUrls(q.questionHtml || '');
              const solutionHtml = await this.replaceDownloadUrls(q.solutionHtml || '');
              const options = await Promise.all(
                (q.questionOptions || []).map(async (opt: any) => ({
                  ...opt,
                  textHtml: await this.replaceDownloadUrls(opt.textHtml || '')
                }))
              );
              return { ...q, questionHtml, solutionHtml, questionOptions: options };
            })
          );

          return { examId, meta, questions: processed };
        })
      );

      const validTests = allTestsData.filter(t => t.questions.length > 0);

      if (!validTests.length) {
        this.alert.error('No questions found');
        this.loading = false;
        return;
      }

      this.buildPrintWindow(validTests, withAnswer);

    } catch (err) {
      console.error('Print error:', err);
      this.alert.error('Failed to prepare print');
    }

    this.loading = false;
  }

  private async fetchExamQuestions(examId: string): Promise<{ meta: any; questions: any[] }> {
    try {
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(
          { entiId: localStorage.getItem('tenantId'), examId },
          'exam/question/list',
          'bytest'
        )
      );
      if (res?.status && res?.data?.length) {
        const data = res.data[0];
        return {
          meta: {
            examId: data.examId,
            examCode: data.examCode,
            examName: data.examName,
            sections: data.sections || []
          },
          questions: data.questions || []
        } as any;
      }
    } catch (err) {
      console.error(`Error fetching exam ${examId}:`, err);
    }
    return { meta: {}, questions: [] };
  }

  private async replaceDownloadUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;

    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];
    let updatedHtml = html;

    for (const match of matches) {
      const originalUrl = match[1];
      try {
        const res: any = await firstValueFrom(
          this.commonApi.fetchData(
            { url: originalUrl },
            'exam/question/image',
            'download'
          )
        );
        if (res?.status) {
          updatedHtml = updatedHtml.replace(originalUrl, res.url);
        }
      } catch (err) {
        console.error('Image download error:', err);
      }
    }
    return updatedHtml;
  }

  private formatQuestionType(type: string): string {
    switch (type) {
      case 'mcq_single': return 'MCQ (Single)';
      case 'mcq_multiple': return 'MCQ (Multiple)';
      case 'true_false': return 'True / False';
      case 'subjective': return 'Subjective';
      case 'integer': return 'Integer';
      case 'short_answer': return 'Short Answer';
      default: return type;
    }
  }

  private buildPrintWindow(
    allTestsData: { examId: string; meta: any; questions: any[] }[],
    withAnswer: boolean
  ): void {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    const allTestsHtml = allTestsData.map(({ meta, questions }, testIndex) => {

      const questionsHtml = questions.map((q, i) => {
        const opts = q.questionOptions || [];
        let optionsHtml = '';

        if (opts.length) {
          const rows: string[] = [];
          for (let j = 0; j < opts.length; j += 2) {
            const cells = [j, j + 1]
              .filter(k => k < opts.length)
              .map(k => {
                const label = String.fromCharCode(65 + k);
                const optHtml = opts[k].textHtml || '';
                const isCorrect = withAnswer && opts[k].isCorrect;
                return `
                  <td class="opt-cell ${isCorrect ? 'correct-opt' : ''}">
                    <span class="opt-label">(${label})</span>
                    <span class="opt-text">${optHtml}${isCorrect ? ' ✓' : ''}</span>
                  </td>`;
              }).join('<td class="opt-divider"></td>');
            rows.push(`<tr>${cells}</tr>`);
          }
          optionsHtml = `<table class="options-table">${rows.join('')}</table>`;
        }

        const answerRow = withAnswer
          ? `<div class="answer-box">
             <strong>Answer:</strong>&nbsp;${q.correctAnswer?.toUpperCase()}
           </div>`
          : `<div class="answer-box"></div>`;

        return `
          <div class="question-card">
            <div class="question-number">
              Q${i + 1}.
              <span class="meta-right">
                [${this.formatQuestionType(q.questionType)}]
                &nbsp;+${q.positiveMarks} / –${q.negativeMarks}
              </span>
            </div>
            <div class="question-body">${q.questionHtml}</div>
            ${optionsHtml}
            ${answerRow}
          </div>`;
      }).join('');

      const docTitle = withAnswer ? 'ANSWER KEY' : 'EXAM';
      const pageBreak = testIndex < allTestsData.length - 1
        ? '<div class="test-page-break"></div>'
        : '';

      const sectionsHtml = (meta.sections || []).map((s: any) => s.sectionName).join(' | ');

      return `
        <div class="test-block">
          <div class="page-header">
            <h1>${docTitle}</h1>
            <table class="meta-table">
              <tr>
                <td style="width:50%;text-align:left"><strong>Exam:</strong> ${meta.examName || ''}</td>
                <td style="width:50%;text-align:right"><strong>Code:</strong> ${meta.examCode || ''}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align:left"><strong>Sections:</strong> ${sectionsHtml}</td>
              </tr>
            </table>
          </div>

          ${questionsHtml}
        </div>
        ${pageBreak}`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${withAnswer ? 'Answer Key' : 'Exam'}</title>
        <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
          crossorigin="anonymous">
        <script defer
          src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
          crossorigin="anonymous"><\/script>
        <script defer
          src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
          crossorigin="anonymous"
          onload="renderLatexAndPrint()"><\/script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; padding: 30px 40px; }
          .test-page-break { page-break-after: always; break-after: page; height: 0; }
          .page-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
          .page-header h1 { font-size: 18pt; letter-spacing: 2px; text-align: center; }
          .meta-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-top: 8px; }
          .meta-table td { padding: 3px 6px; text-align: left; }
          .question-card { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed #555; page-break-inside: avoid; }
          .question-number { font-weight: bold; font-size: 11.5pt; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: baseline; }
          .meta-right { font-weight: normal; font-style: italic; font-size: 9.5pt; }
          .question-body { padding: 4px 18px 10px 18px; line-height: 1.8; font-size: 12pt; }
          .options-table { border-collapse: collapse; margin: 0 18px 10px 18px; width: calc(100% - 36px); }
          .options-table tr { vertical-align: top; }
          .opt-cell { width: 48%; padding: 3px 6px; vertical-align: top; }
          .opt-divider { width: 4%; }
          .opt-label { font-weight: bold; font-size: 11pt; margin-right: 6px; white-space: nowrap; }
          .opt-text { font-size: 11.5pt; line-height: 1.6; }
          .correct-opt .opt-text { font-weight: bold; text-decoration: underline; }
          .answer-box { margin: 6px 18px 0 18px; font-size: 11pt; padding-top: 4px; border-top: 1px solid #ccc; }
          .katex { font-size: 1em; }
          img { max-width: 100%; height: auto; display: block; margin: 4px 0; }
          @media print {
            body { padding: 10px 20px; }
            .question-card { page-break-inside: avoid; }
            .test-page-break { page-break-after: always; }
            @page { margin: 12mm 15mm; }
          }
        </style>
      </head>
      <body>
        ${allTestsHtml}
        <script>
          function renderLatexAndPrint() {
            renderMathInElement(document.body, {
              delimiters: [
                { left: '$$', right: '$$', display: true  },
                { left: '$',  right: '$',  display: false },
                { left: '\\\\(', right: '\\\\)', display: false },
                { left: '\\\\[', right: '\\\\]', display: true  }
              ],
              throwOnError: false,
              strict: false,
              trust: true
            });
            setTimeout(() => window.print(), 300);
          }
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }

  /* ================= MISC ================= */

  refresh() {
    if (this.lastTableParams) {
      this.fetchTableData(this.lastTableParams);
      return;
    }
    this.fetchTableData({ page: 1, pageSize: 10 });
  }

  private forceCloseDropdowns(): void {
    document.querySelectorAll('.dropdown-menu.show')
      .forEach(menu => menu.classList.remove('show'));
    document.querySelectorAll('body > .dropdown-menu')
      .forEach(menu => menu.remove());
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
      .forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
  }
}
