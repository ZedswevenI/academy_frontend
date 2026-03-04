import { Component, OnInit, OnDestroy } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { NavigationStart, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../service/auth/auth.service';

@Component({
  selector: 'app-tests',
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

  /* ================= PRINT STATE ================= */
  showPrintModal = false;
  selectedRow: any = null;
  selectedTestIds: string[] = [];

  /* ================= TABLE COLUMNS ================= */
  columnsArray = [
    { key: 'testNumber', label: 'Test No', sortable: true },
    { key: 'classNo', label: 'Class', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'topicName', label: 'Topic', sortable: true },
    { key: 'subTopicName', label: 'Subtopic', sortable: true },
    { key: 'level', label: 'Level', sortable: true }
  ];

  dataArray: any[] = [];

  /* ================= FILTERS ================= */
  filterForm!: FormGroup;
  showFilters = false;

  classOptions = [
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: '10', value: 10 },
    { label: '11', value: 11 },
    { label: '12', value: 12 },
    { label: '13', value: 13 }
  ];

  topicOptions: any[] = [];
  subtopicOptions: any[] = [];
  subjectOptions: any[] = [];

  statusOptions = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
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
        { text: 'Edit Test', icon: 'fa-regular fa-pen-to-square', callback: (row: any) => this.editTest(row) },
        { text: 'Rearrange Questions', icon: 'fa-solid fa-reorder', callback: (row: any) => this.rearrange(row) },
        { text: 'Add Question', icon: 'fa-solid fa-file-import', callback: (row: any) => this.addQuestions(row) },
        { text: 'Import Questions', icon: 'fa-solid fa-file-import', callback: (row: any) => this.importQuestions(row) },
        // { text: 'Print Test', icon: 'fa-solid fa-print', callback: (row: any) => this.printTest(row) },
        { text: 'Report', icon: 'fa-solid fa-chart-line', callback: (row: any) => this.report(row) },
        { text: 'Update Ans/Solutions', icon: 'fa-solid fa-pen', callback: (row: any) => this.updateAnswers(row) },
        { text: 'Delete', icon: 'fa-regular fa-trash-can', callback: (row: any) => this.deleteTest(row) }
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

    if(this.authService.assignmentRole()) {
      this.actions.pop(); 
    }
  }

  /* ================= INIT ================= */
  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Assignment' }]);
    this.initFilterForm();

    this.filterForm.get('classNo')?.valueChanges.subscribe(classId => {
      if (classId) {
        this.loadTopics(this.filterForm.get('subjectId')?.value);
      } else {
        this.topicOptions = [];
        this.subtopicOptions = [];
      }
      this.filterForm.patchValue({ topicId: '', subtopicId: '' });
    });

    this.filterForm.get('subjectId')?.valueChanges.subscribe(classId => {
      if (classId) {
        this.loadTopics(classId);
      } else {
        this.topicOptions = [];
        this.subtopicOptions = [];
      }
      this.filterForm.patchValue({ topicId: '', subtopicId: '' });
    });

    this.filterForm.get('topicId')?.valueChanges.subscribe(topicId => {
      if (topicId) {
        this.loadSubtopics(topicId);
      } else {
        this.subtopicOptions = [];
      }
      this.filterForm.patchValue({ subtopicId: '' });
    });

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.forceCloseDropdowns();
      }
    });

    this.loadSubjects();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  initFilterForm() {
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      classNo: [''],
      topicId: [''],
      subjectId: [''],
      subtopicId: ['']
    });
  }

  toggleFilters() { this.showFilters = !this.showFilters; }

  clearFilters() {
    this.filterForm.reset();
    this.topicOptions = [];
    this.subtopicOptions = [];
    if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
  }

  /* ================= API ================= */

  loadTopics(subjectId: string) {
    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'ims/topic', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            const selectedClass = Number(this.filterForm.get('classNo')?.value);
            this.topicOptions = res.data
              .filter((t: any) => t.subjectId?._id === subjectId && t.classNo === selectedClass)
              .map((t: any) => ({ label: t.topicName, value: t.topicId }));
          }
        },
        error: () => this.alert.error('Error loading topics')
      });
  }

  loadSubjects() {
    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'ims/subject', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjectOptions = res.data.map((s: any) => ({
            label: s.subjectName,
            value: s._id
          }));
        },
        error: () => this.alert.error('Error loading subjects')
      });
  }

  loadSubtopics(topicId: string) {
    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'ims/subtopic', `list?topicId=${topicId}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.subtopicOptions = res.data.map((s: any) => ({
              label: s.subTopicName,
              value: s.subTopicId
            }));
          }
        },
        error: () => this.alert.error('Error loading subtopics')
      });
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
    if (filters.classNo) query.classNo = filters.classNo;
    if (filters.topicId) query.topicId = filters.topicId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.subtopicId) query.subtopicId = filters.subtopicId;
    if (filters.status !== '' && filters.status !== null) query.status = filters.status;

    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'assignment', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              testNumber: item.testNo,
              classNo: item.classNo,
              subject: item.subjectId?.subjectName,
              numberOfQuestions: item.numberOfQuestions,
              status: item.status,
              id: item._id
            }));
            this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error loading assignments');
        }
      });
  }

  /* ================= ROW ACTIONS ================= */

  deleteTest(row: any) {
    if (!confirm('Are you sure you want to delete this test?')) return;
    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId'), testId: row.testId }, 'assignment', 'delete')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Deleted successfully');
            if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
          }
        },
        error: () => this.alert.error('Error deleting test')
      });
  }

  viewQuestions(row: any) { this.router.navigate(['/app/assignment/question-view'], { state: { questions: row } }); }
  rearrange(row: any) { this.router.navigate(['/app/assignment/question-rearrange'], { state: { questions: row } }); }
  editTest(row: any) { this.router.navigate(['/app/assignment/create'], { state: { test: row } }); }
  importQuestions(row: any) { this.router.navigate(['/app/assignment/question-import'], { state: { questions: row } }); }
  addQuestions(row: any) { this.router.navigate(['/app/assignment/question-create'], { state: { question: row } }); }
  studentFeedbacks(row: any) { }
  report(row: any) { }
  updateAnswers(row: any) { }

  /* ================= PRINT ================= */

  printTest(row: any) {
    this.selectedRow = row;
    this.showPrintModal = true;
  }

  closePrintModal() {
    this.showPrintModal = false;
    this.selectedRow = null;
  }

  async fetchAllTestIds(): Promise<string[]> {
    try {
      const filters = this.filterForm.value;
      const query: any = { page: 1, limit: 25 };

      if (filters.classNo) query.classNo = filters.classNo;
      if (filters.topicId) query.topicId = filters.topicId;
      if (filters.subjectId) query.subjectId = filters.subjectId;
      if (filters.subtopicId) query.subtopicId = filters.subtopicId;
      if (filters.status !== '' && filters.status !== null) query.status = filters.status;

      const queryString = Object.keys(query)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');

      const res: any = await firstValueFrom(
        this.commonApi.fetchData(
          { entiId: localStorage.getItem('tenantId') },
          'assignment',
          `list?${queryString}`
        )
      );

      if (res?.status && res?.data?.length) {
        return res.data.map((item: any) => item.testId);
      }
    } catch (err) {
      console.error('Error fetching all testIds:', err);
    }
    return [];
  }

  async printAllFilteredTests(withAnswer: boolean): Promise<void> {
    this.loading = true;

    const testIds = await this.fetchAllTestIds();

    if (!testIds.length) {
      this.alert.error('No tests found to print');
      this.loading = false;
      return;
    }

    this.selectedTestIds = testIds;
    await this.printQuestions(withAnswer);
  }

  async printQuestions(withAnswer: boolean): Promise<void> {
    if (!this.selectedTestIds?.length) return;

    this.closePrintModal();
    this.loading = true;

    try {
      const allTestsData = await Promise.all(
        this.selectedTestIds.map(async (testId) => {

          // ← Now gets meta + questions together
          const { meta, questions } = await this.fetchTestQuestions(testId);

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

          // ← meta travels alongside questions
          return { testId, meta, questions: processed };
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
  private async fetchTestQuestions(testId: string): Promise<{ meta: any; questions: any[] }> {
    try {
      const res: any = await firstValueFrom(
        this.commonApi.fetchData(
          { entiId: localStorage.getItem('tenantId'), testId },
          'assignment/question/list',
          'bytest'
        )
      );
      if (res?.status && res?.data?.length) {
        const data = res.data[0];
        console.log("Subebder",data?.subjectId?.subjectName);
        
        return {
          meta: {
            testId: data.testId,
            testNo: data.testNo,
            testCode: data.testCode,
            subjectName: data?.subjectName,
            classNo: data.classNo,
            topicName: data.topicName,
            subTopicName: data.subTopicName,
            categoryName: data.categoryName,
            subCategoryName: data.subCategoryName
          },
          questions: data.questions || []
        } as any;
      }
    } catch (err) {
      console.error(`Error fetching test ${testId}:`, err);
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
            'assignment/question/image',
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
    allTestsData: { testId: string; meta: any; questions: any[] }[],
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
          : `<div class="answer-box">
             
           </div>`;

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

      const docTitle = withAnswer ? 'ANSWER KEY' : 'ASSIGNMENT';
      const pageBreak = testIndex < allTestsData.length - 1
        ? '<div class="test-page-break"></div>'
        : '';

      return `
        <div class="test-block">
          <div class="page-header">
            <h1>${docTitle}</h1>
        
            <table class="meta-table">
              <tr>
                <td style="width:25%;text-align:left"><strong>Class:</strong> ${meta.classNo}</td>
                <td style="width:25%"><strong>Subject:</strong> ${meta.subjectName}</td>
                <td style="width:50%;text-align:right"><strong>Sub Topic:</strong> ${meta.subTopicName}</td>
              </tr>
              <tr>
                <td colspan="2" style="width:70%;text-align:left"><strong>Topic:</strong> ${meta.topicName}</td>
                <td style="width:30%;text-align:right"><strong>Test No:</strong> ${meta.testNo}</td>
              </tr>
                <tr>
                <td colspan="2" style="width:70%;text-align:left"><strong>Category:</strong> ${meta.categoryName}</td>
                <td style="width:30%;text-align:right"><strong>Sub category:</strong> ${meta.subCategoryName}</td>
              </tr>
            </table>
          </div>
         }

          ${questionsHtml}
        </div>
        ${pageBreak}`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${withAnswer ? 'Answer Key' : 'Assignment'}</title>
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
          .subtitle { text-align: center; font-size: 10pt; font-style: italic; margin-top: 3px; }
          .meta-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-top: 8px; }
          .meta-table td { padding: 3px 6px; text-align: left; }
          .page-meta { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
          .page-meta td { padding: 2px 6px; text-align: left; width: 33%; }
          .student-info { width: 100%; margin-bottom: 14px; font-size: 11pt; border-collapse: collapse; }
          .student-info td { padding: 0 10px 6px 0; white-space: nowrap; }
          .fill-line { border-bottom: 1px solid #000; min-width: 150px; display: inline-block; }
          .instructions { font-size: 10pt; border: 1px solid #000; padding: 6px 12px; margin-bottom: 16px; line-height: 1.6; }
          .instructions ol { margin-left: 18px; }
          .instructions li { margin-bottom: 2px; }
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
          .answer-table { width: 100%; border-collapse: collapse; }
          .answer-table td { padding: 0; }
          .marks-box { text-align: right; white-space: nowrap; }
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