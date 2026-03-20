import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-exam-questions',
  standalone: false,
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.scss',
})
export class ExamQuestionsComponent implements OnInit {

  loading = false;
  totalRecords = 0;
  filterForm!: FormGroup;
  showFilters = false;

  lastTableParams: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  } | null = null;

  /* ================= TABLE COLUMNS ================= */
  columnsArray = [
    { key: 'questionPreview', label: 'Question', sortable: false },
    { key: 'questionType', label: 'Type', sortable: true },
    { key: 'difficulty', label: 'Difficulty', sortable: true },
    { key: 'positiveMarks', label: '+Marks', sortable: true },
    { key: 'negativeMarks', label: '-Marks', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdAt', label: 'Created At', sortable: true }
  ];

  dataArray: any[] = [];

  /* ================= FILTER OPTIONS ================= */
  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ];

  questionTypeOptions = [
    { label: 'MCQ (Single)', value: 'mcq_single' },
    { label: 'MCQ (Multiple)', value: 'mcq_multiple' },
    { label: 'Integer', value: 'integer' },
    { label: 'Numerical', value: 'numeric' },
    { label: 'Subjective', value: 'subjective' },
    { label: 'True/False', value: 'true_false' },
    { label: 'Text Based', value: 'passage_qns' },
    { label: 'Matrix', value: 'matrix' }
  ];

  difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' }
  ];

  /* ================= SUBJECT / TOPIC / SUBTOPIC ================= */
  subjects: any[] = [];
  allTopics: any[] = [];
  allSubTopics: any[] = [];

  subjectOptions: any[] = [];
  topicOptions: any[] = [];
  subTopicOptions: any[] = [];

  /* ================= VIEW MODAL ================= */
  showViewModal = false;
  viewData: any = null;
  viewQuestionHtml: SafeHtml = '';
  viewSolutionHtml: SafeHtml = '';

  /* ================= ACTIONS ================= */
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#10b981',
      callback: (row: any) => this.viewQuestion(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc2626',
      callback: (row: any) => this.deleteQuestion(row)
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams' },
      { label: 'Questions' },
    ]);
    this.initForms();
    this.loadMasters();
  }

  /* ================= FORMS ================= */

  initForms() {
    this.filterForm = this.fb.group({
      status: [''],
      questionType: [''],
      difficulty: [''],
      subjectId: [''],
      topicId: [''],
      subTopicId: ['']
    });

    // Cascading: subject -> topic
    this.filterForm.get('subjectId')?.valueChanges.subscribe(subjectId => {
      this.filterForm.patchValue({ topicId: '', subTopicId: '' }, { emitEvent: false });
      this.subTopicOptions = [];
      if (subjectId) {
        this.topicOptions = this.allTopics
          .filter((t: any) => {
            const tSubId = t.subjectId?._id || t.subjectId;
            return tSubId === subjectId;
          })
          .map((t: any) => ({ label: t.topicName, value: t.topicId }));
      } else {
        this.topicOptions = [];
      }
    });

    // Cascading: topic -> subtopic
    this.filterForm.get('topicId')?.valueChanges.subscribe(topicId => {
      this.filterForm.patchValue({ subTopicId: '' }, { emitEvent: false });
      if (topicId) {
        this.subTopicOptions = this.allSubTopics
          .filter((st: any) => {
            const stTopicId = st.topicId?.topicId || st.topicId;
            return stTopicId === topicId;
          })
          .map((st: any) => ({ label: st.subTopicName, value: st.subTopicId }));
      } else {
        this.subTopicOptions = [];
      }
    });
  }

  toggleFilters() { this.showFilters = !this.showFilters; }

  clearFilters() {
    this.filterForm.reset();
    this.topicOptions = [];
    this.subTopicOptions = [];
    if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
  }

  /* ================= LOAD MASTERS ================= */

  private loadMasters() {
    const body = { entiId: localStorage.getItem('tenantId') };

    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => {
        this.subjects = res?.data || [];
        this.subjectOptions = this.subjects.map((s: any) => ({
          label: s.subjectName,
          value: s._id
        }));
      }
    });

    this.commonApi.fetchData(body, 'ims/topic', 'list?list=full').subscribe({
      next: (res: any) => { this.allTopics = res?.data || []; }
    });

    this.commonApi.fetchData(body, 'ims/subtopic', 'list?list=full').subscribe({
      next: (res: any) => { this.allSubTopics = res?.data || []; }
    });
  }

  /* ================= TABLE ================= */

  fetchTableData(params: any) {
    this.lastTableParams = { ...params };
    this.loading = true;

    const query: any = { page: params.page, limit: params.pageSize };

    if (params.sortKey) {
      query.sort = params.sortDirection === 'desc' ? `-${params.sortKey}` : params.sortKey;
    }

    const filters = this.filterForm.value;
    if (params.search) query.search = params.search;
    if (filters.status) query.status = filters.status;
    if (filters.questionType) query.questionType = filters.questionType;
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.topicId) query.topicId = filters.topicId;
    if (filters.subTopicId) query.subTopicId = filters.subTopicId;

    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'exam/questions/bank', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              id: item._id,
              questionPreview: this.stripHtml(item.questionHtml).substring(0, 80) + (this.stripHtml(item.questionHtml).length > 80 ? '...' : ''),
              questionType: this.formatQuestionType(item.questionType),
              createdAt: new Date(item.createdAt).toLocaleDateString()
            }));
            this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error loading questions');
        }
      });
  }

  /* ================= HELPERS ================= */

  private stripHtml(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  private formatQuestionType(type: string): string {
    const map: { [key: string]: string } = {
      mcq_single: 'MCQ (Single)',
      mcq_multiple: 'MCQ (Multiple)',
      integer: 'Integer',
      numeric: 'Numerical',
      subjective: 'Subjective',
      true_false: 'True/False',
      passage_qns: 'Text Based',
      matrix: 'Matrix'
    };
    return map[type] || type;
  }

  /* ================= IMAGE DOWNLOAD ================= */

  private async replaceDownloadUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;

    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];
    let updatedHtml = html;

    for (const match of matches) {
      const originalUrl = match[1];
      try {
        const downloadRes: any = await firstValueFrom(
          this.commonApi.fetchData(
            { url: originalUrl },
            'exam/questions/image',
            'download'
          )
        );
        if (downloadRes?.status) {
          updatedHtml = updatedHtml.replace(originalUrl, downloadRes.url);
        }
      } catch (err) {
        console.error('Image download error:', err);
      }
    }
    return updatedHtml;
  }

  /* ================= VIEW ================= */

  async viewQuestion(row: any): Promise<void> {
    this.viewData = row;
    this.showViewModal = true;

    let questionHtml = await this.replaceDownloadUrls(row.questionHtml || '');
    this.viewQuestionHtml = this.sanitizer.bypassSecurityTrustHtml(questionHtml);

    if (row.solutionHtml) {
      let solutionHtml = await this.replaceDownloadUrls(row.solutionHtml);
      this.viewSolutionHtml = this.sanitizer.bypassSecurityTrustHtml(solutionHtml);
    } else {
      this.viewSolutionHtml = '';
    }
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewData = null;
    this.viewQuestionHtml = '';
    this.viewSolutionHtml = '';
  }

  /* ================= DELETE ================= */

  deleteQuestion(row: any) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    const payload = {
      recId: row._id,
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(payload, 'exam/questions', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Question deleted successfully');
          this.refresh();
        }
      },
      error: () => this.alert.error('Error deleting question')
    });
  }

  refresh() {
    if (this.lastTableParams) {
      this.fetchTableData(this.lastTableParams);
      return;
    }
    this.fetchTableData({ page: 1, pageSize: 10 });
  }

  /* ================= NAVIGATION ================= */

  goToCreate(): void {
    this.router.navigate(['/app/exams/exams/question-create'], { state: { bank: true } });
  }

  goToImport(): void {
    this.router.navigate(['/app/exams/exams/question-import'], { state: { bank: true } });
  }
}
