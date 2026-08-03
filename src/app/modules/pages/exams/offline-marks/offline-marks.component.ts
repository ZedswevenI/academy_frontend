import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';
import {
  AnswerEntry,
  BulkQuestion,
  extractQuestionNoFromHeader,
  parseStudentRow,
} from './bulk-answer-parser';

interface OfflineQuestion extends BulkQuestion {
  questionText: string; // plain-text preview, HTML tags stripped
}

interface DraftAnswer {
  isSkipped: boolean;
  selectedKey: string | null; // single-select (mcq_single / single-correct passage_qns)
  selectedKeys: Set<string>; // multi-select (mcq_multi / multi-correct passage_qns)
  matrixRight: Map<string, Set<string>>; // leftKey -> set of rightKeys
  // input[type=number] + ngModel writes this back as an actual number (or
  // null when cleared) via Angular's built-in NumberValueAccessor, not a
  // string — despite the '' initial value below. Always coerce with
  // String(...) before calling .trim() on it.
  numberValue: string | number | null;
  boolValue: boolean | null;
  textValue: string;
}

interface BulkRowPreview {
  rowNo: number; // 1-indexed position in the uploaded sheet (excluding header)
  admissionNo: string;
  batchId: string;
  completedAt: number | undefined;
  valid: boolean;
  errors: string[];
  answers: AnswerEntry[];
  status: 'pending' | 'success' | 'failed';
  failureReason: string;
}

const SAMPLE_ROW_ADMISSION_NO = 'SAMPLE-DELETE-THIS-ROW';

@Component({
  selector: 'app-offline-marks',
  standalone: false,
  templateUrl: './offline-marks.component.html',
  styleUrl: './offline-marks.component.scss',
})
export class OfflineMarksComponent implements OnInit {
  @ViewChild('formErrorsAnchor') formErrorsAnchor?: ElementRef<HTMLElement>;

  tenantId = localStorage.getItem('tenantId') || '';
  userId = localStorage.getItem('userId') || '';

  activeTab: 'single' | 'bulk' = 'single';

  // ── Shared question data ────────────────────────────────────────────
  loadingQuestions = true;
  questions: OfflineQuestion[] = [];
  batches: { batchId: string; label: string }[] = [];

  // ── Single-student tab ──────────────────────────────────────────────
  admissionNo = '';
  batchId = '';
  completedAtLocal = ''; // datetime-local input value
  studentOptions: { studentId: string; admissionNo: string; label: string }[] = [];
  studentsLoading = false;
  studentSearchText = '';
  showStudentDropdown = false;
  draftAnswers = new Map<string, DraftAnswer>();
  formErrors: string[] = [];
  errorQuestionIds = new Set<string>();
  submitting = false;
  alreadyExists = false;
  private lastSinglePayload: any = null;

  // ── Bulk tab ─────────────────────────────────────────────────────────
  bulkFileName = '';
  bulkParsing = false;
  bulkRows: BulkRowPreview[] = [];
  bulkSubmitting = false;
  bulkResultSummary: { successCount: number; failedCount: number } | null = null;

  examId = '';
  examName = '';
  examCode = '';
  examData: any = null;

  constructor(
    private commonApi: CommonapiService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumb: BredcrumpService,
    private backNav: BackNavigationService,
  ) {}

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('examId');
    if (!examId) {
      this.router.navigate(['/app/exams/exams']);
      return;
    }
    this.examId = examId;

    const state: any = history.state || {};
    if (state.exam) this.examData = state.exam;
    if (state.prefillAdmissionNo) {
      const admissionNo = String(state.prefillAdmissionNo);
      this.admissionNo = admissionNo;
      this.studentSearchText = admissionNo;
    }

    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'Offline Marks' },
    ]);

    this.loadExamDetails();
    this.loadQuestions();
    this.loadBatches();
  }

  private loadExamDetails(): void {
    this.commonApi
      .fetchData({ entiId: this.tenantId, examId: this.examId }, 'exam', 'get')
      .subscribe({
        next: (res: any) => {
          if (res?.status && res?.data) {
            this.examData = res.data;
            this.examName = res.data.examName || '';
            this.examCode = res.data.examCode || '';
            if (res.data.status === 'draft') {
              this.alert.error('Offline marks entry is not available for draft exams');
              this.goBack();
            }
          }
        },
        error: () => {
          this.alert.error('Error loading exam details');
        },
      });
  }

  goBack(): void {
    this.backNav.goBack({
      route: '/app/exams/exams/view',
      state: this.examData ? { exam: this.examData } : undefined,
    });
  }

  switchTab(tab: 'single' | 'bulk'): void {
    this.activeTab = tab;
  }

  // ====================================================
  // LOAD QUESTIONS + BATCHES
  // ====================================================

  private loadQuestions(): void {
    this.loadingQuestions = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, examId: this.examId },
        'exam/questions',
        'getallquestions',
      )
      .subscribe({
        next: (res: any) => {
          const raw: any[] = res?.data?.questions || [];
          this.questions = raw.map((q: any) => ({
            questionId: q.questionId,
            questionNo: q.questionNo,
            questionType: q.questionType,
            questionText: this.stripHtml(q.questionHtml || ''),
            questionOptions: (q.questionOptions || []).map((o: any) => ({
              key: o.key,
              isCorrect: !!o.isCorrect,
            })),
            leftColumn: (q.leftColumn || []).map((c: any) => ({ key: c.key })),
            rightColumn: (q.rightColumn || []).map((c: any) => ({ key: c.key })),
          }));
          this.resetDraftAnswers();
          this.loadingQuestions = false;
        },
        error: () => {
          this.loadingQuestions = false;
          this.alert.error('Error loading exam questions');
        },
      });
  }

  private loadBatches(): void {
    this.commonApi
      .fetchData(
        { entiId: this.tenantId, examId: this.examId },
        'exam/batch',
        'list-by-exam',
      )
      .subscribe({
        next: (res: any) => {
          this.batches = (res?.data || []).map((b: any) => ({
            batchId: b.batchId,
            label: b.batchId,
          }));
        },
        error: () => {
          // Non-fatal — batch is optional on both submit endpoints.
        },
      });
  }

  // ====================================================
  // SINGLE STUDENT — batch-driven student autocomplete
  // ====================================================

  onBatchChange(): void {
    this.admissionNo = '';
    this.studentSearchText = '';
    this.studentOptions = [];
    this.showStudentDropdown = false;
    if (!this.batchId) return;

    this.studentsLoading = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId },
        'student',
        `list?page=1&limit=200&batchCode=${this.batchId}`,
      )
      .subscribe({
        next: (res: any) => {
          // Coerce admissionNo to a string — some student records store it
          // as a number (it's often a purely numeric value), and leaving
          // it as-is here caused a silent, uncaught "trim is not a
          // function" crash later when the form tried to validate it.
          this.studentOptions = (res?.data || []).map((s: any) => {
            const admissionNo = String(s.admissionNo ?? '');
            return {
              studentId: s.studentId,
              admissionNo,
              label: `${s.student?.name || admissionNo} (${admissionNo})`,
            };
          });
          this.studentsLoading = false;
        },
        error: () => {
          this.studentsLoading = false;
          this.alert.error('Error loading students for this batch');
        },
      });
  }

  get filteredStudentOptions() {
    const q = this.studentSearchText.trim().toLowerCase();
    if (!q) return this.studentOptions;
    return this.studentOptions.filter((s) => s.label.toLowerCase().includes(q));
  }

  onStudentSearchChange(value: string): void {
    this.studentSearchText = value;
    // Typing directly still counts as the admission no — the dropdown is a
    // convenience, not the only way in, in case a student isn't in the
    // first 200 loaded for a large batch.
    this.admissionNo = value.trim();
    this.showStudentDropdown = true;
  }

  selectStudent(s: { studentId: string; admissionNo: string; label: string }): void {
    this.admissionNo = s.admissionNo;
    this.studentSearchText = s.label;
    this.showStudentDropdown = false;
  }

  onStudentSearchBlur(): void {
    // Delay so a click on a dropdown option registers before it hides.
    setTimeout(() => (this.showStudentDropdown = false), 150);
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  // ====================================================
  // SINGLE STUDENT — answer draft helpers
  // ====================================================

  private emptyDraft(): DraftAnswer {
    return {
      isSkipped: false,
      selectedKey: null,
      selectedKeys: new Set<string>(),
      matrixRight: new Map<string, Set<string>>(),
      numberValue: '',
      boolValue: null,
      textValue: '',
    };
  }

  private resetDraftAnswers(): void {
    this.draftAnswers = new Map(this.questions.map((q) => [q.questionId, this.emptyDraft()]));
  }

  draftFor(questionId: string): DraftAnswer {
    let d = this.draftAnswers.get(questionId);
    if (!d) {
      d = this.emptyDraft();
      this.draftAnswers.set(questionId, d);
    }
    return d;
  }

  isMultiSelect(q: OfflineQuestion): boolean {
    if (q.questionType === 'mcq_multi') return true;
    if (q.questionType === 'passage_qns') {
      const correctCount = (q.questionOptions || []).filter((o) => o.isCorrect).length;
      return correctCount > 1;
    }
    return false;
  }

  /** A passage_qns question with no options is a free-text passage
   * question (e.g. "Define oxidation reaction."), not an MCQ — the API
   * gives no separate flag for this, so an empty questionOptions array is
   * the only signal. Without this check every passage_qns question was
   * routed to the option-buttons renderer, which shows nothing when
   * there are zero options to render. */
  isFreeTextPassage(q: OfflineQuestion): boolean {
    return q.questionType === 'passage_qns' && !(q.questionOptions || []).length;
  }

  toggleSkip(questionId: string): void {
    const d = this.draftFor(questionId);
    d.isSkipped = !d.isSkipped;
  }

  selectOption(q: OfflineQuestion, key: string): void {
    const d = this.draftFor(q.questionId);
    if (d.isSkipped) return;
    if (this.isMultiSelect(q)) {
      if (d.selectedKeys.has(key)) d.selectedKeys.delete(key);
      else d.selectedKeys.add(key);
    } else {
      d.selectedKey = d.selectedKey === key ? null : key;
    }
  }

  isOptionSelected(q: OfflineQuestion, key: string): boolean {
    const d = this.draftFor(q.questionId);
    return this.isMultiSelect(q) ? d.selectedKeys.has(key) : d.selectedKey === key;
  }

  setBool(questionId: string, val: boolean): void {
    const d = this.draftFor(questionId);
    if (d.isSkipped) return;
    d.boolValue = d.boolValue === val ? null : val;
  }

  toggleMatrixRight(questionId: string, leftKey: string, rightKey: string): void {
    const d = this.draftFor(questionId);
    if (d.isSkipped) return;
    let set = d.matrixRight.get(leftKey);
    if (!set) {
      set = new Set<string>();
      d.matrixRight.set(leftKey, set);
    }
    if (set.has(rightKey)) set.delete(rightKey);
    else set.add(rightKey);
  }

  isMatrixRightSelected(questionId: string, leftKey: string, rightKey: string): boolean {
    return !!this.draftFor(questionId).matrixRight.get(leftKey)?.has(rightKey);
  }

  // ====================================================
  // SINGLE STUDENT — build + submit
  // ====================================================

  /** Mirrors the bulk parser's format rules exactly, just built from UI
   * selection state instead of typed text — so both paths always produce
   * an identical answerRaw shape for the same logical answer. */
  private buildAnswers(): { answers: AnswerEntry[]; errors: string[] } {
    const answers: AnswerEntry[] = [];
    const errors: string[] = [];
    this.errorQuestionIds = new Set<string>();

    for (const q of this.questions) {
      const d = this.draftFor(q.questionId);
      if (d.isSkipped) {
        answers.push({ questionId: q.questionId, answerRaw: null, isSkipped: true });
        continue;
      }

      const fail = (msg: string) => {
        errors.push(`${q.questionNo}: ${msg}`);
        this.errorQuestionIds.add(q.questionId);
      };

      switch (q.questionType) {
        case 'mcq_single':
        case 'passage_qns':
          if (this.isFreeTextPassage(q)) {
            if (!d.textValue.trim()) {
              fail('enter an answer or mark it skipped');
              break;
            }
            answers.push({ questionId: q.questionId, answerRaw: d.textValue.trim(), isSkipped: false });
          } else if (this.isMultiSelect(q)) {
            if (!d.selectedKeys.size) {
              fail('select at least one option or mark it skipped');
              break;
            }
            answers.push({
              questionId: q.questionId,
              answerRaw: [...d.selectedKeys].sort().join(';'),
              isSkipped: false,
            });
          } else {
            if (!d.selectedKey) {
              fail('select an option or mark it skipped');
              break;
            }
            answers.push({ questionId: q.questionId, answerRaw: d.selectedKey, isSkipped: false });
          }
          break;
        case 'mcq_multi':
          if (!d.selectedKeys.size) {
            fail('select at least one option or mark it skipped');
            break;
          }
          answers.push({
            questionId: q.questionId,
            answerRaw: [...d.selectedKeys].sort().join(';'),
            isSkipped: false,
          });
          break;
        case 'true_false':
          if (d.boolValue === null) {
            fail('select True or False, or mark it skipped');
            break;
          }
          answers.push({ questionId: q.questionId, answerRaw: d.boolValue, isSkipped: false });
          break;
        case 'numeric': {
          // input[type=number] + ngModel writes back an actual number (or
          // null when empty) via Angular's built-in NumberValueAccessor —
          // never assume numberValue is a string here.
          const raw = String(d.numberValue ?? '').trim();
          if (!raw) {
            fail('enter a value or mark it skipped');
            break;
          }
          const n = Number(raw);
          if (Number.isNaN(n)) {
            fail(`"${raw}" is not a valid number`);
            break;
          }
          answers.push({ questionId: q.questionId, answerRaw: n, isSkipped: false });
          break;
        }
        case 'integer': {
          const raw = String(d.numberValue ?? '').trim();
          if (!raw) {
            fail('enter a value or mark it skipped');
            break;
          }
          const n = Number(raw);
          if (!Number.isInteger(n)) {
            fail(`"${raw}" is not a whole number`);
            break;
          }
          answers.push({ questionId: q.questionId, answerRaw: n, isSkipped: false });
          break;
        }
        case 'matrix': {
          if (!d.matrixRight.size) {
            fail('match at least one row or mark it skipped');
            break;
          }
          const leftOrder = (q.leftColumn || []).map((c) => c.key);
          const pairs = leftOrder
            .filter((lk) => d.matrixRight.get(lk)?.size)
            .map((lk) => `${lk}:${[...(d.matrixRight.get(lk) as Set<string>)].sort().join('')}`);
          answers.push({ questionId: q.questionId, answerRaw: pairs.join(';'), isSkipped: false });
          break;
        }
        case 'short_answer':
        case 'subjective':
          if (!d.textValue.trim()) {
            fail('enter an answer or mark it skipped');
            break;
          }
          answers.push({ questionId: q.questionId, answerRaw: d.textValue.trim(), isSkipped: false });
          break;
        default:
          fail(`unsupported question type "${q.questionType}"`);
      }
    }

    return { answers, errors };
  }

  private completedAtEpoch(): number | undefined {
    if (!this.completedAtLocal) return undefined;
    const ms = new Date(this.completedAtLocal).getTime();
    return Number.isNaN(ms) ? undefined : ms;
  }

  private scrollToFormErrors(): void {
    setTimeout(() => {
      this.formErrorsAnchor?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  submitSingle(): void {
    // Defensive coercion — admissionNo should always be a string by this
    // point, but a non-string slipping through here (e.g. a numeric
    // admission no from an API response) would otherwise throw on
    // `.trim()` and silently abort the whole click with no feedback.
    this.admissionNo = String(this.admissionNo || '').trim();
    if (!this.admissionNo) {
      this.formErrors = ['Select a batch and a student first'];
      this.alert.error('Select a batch and a student first');
      this.scrollToFormErrors();
      return;
    }
    const { answers, errors } = this.buildAnswers();
    if (errors.length) {
      this.formErrors = errors;
      this.alert.error(
        `${errors.length} question(s) need attention before you can submit — see the list above the questions.`,
      );
      this.scrollToFormErrors();
      return;
    }
    this.formErrors = [];
    this.alreadyExists = false;

    const payload: any = {
      tenantId: this.tenantId,
      userId: this.userId,
      examId: this.examId,
      admissionNo: this.admissionNo.trim(),
      answers,
    };
    if (this.batchId) payload.batchId = this.batchId;
    const completedAt = this.completedAtEpoch();
    if (completedAt !== undefined) payload.completedAt = completedAt;

    this.lastSinglePayload = payload;
    this.submitting = true;
    this.commonApi.fetchData(payload, 'exam/result', 'submit-offline').subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.status) {
          this.alert.success('Offline result recorded successfully');
          this.resetSingleForm();
        } else {
          this.alert.error(res?.message || 'Failed to record offline result');
        }
      },
      error: (err: any) => {
        this.submitting = false;
        if (err?.status === 409) {
          this.alreadyExists = true;
          return;
        }
        this.alert.error(err?.error?.message || 'Error recording offline result');
      },
    });
  }

  submitAsCorrection(): void {
    if (!this.lastSinglePayload) return;
    this.submitting = true;
    this.commonApi
      .fetchData(this.lastSinglePayload, 'exam/result', 'submit-offline/correct')
      .subscribe({
        next: (res: any) => {
          this.submitting = false;
          if (res?.status) {
            this.alert.success('Offline result corrected successfully');
            this.alreadyExists = false;
            this.resetSingleForm();
          } else {
            this.alert.error(res?.message || 'Failed to correct offline result');
          }
        },
        error: (err: any) => {
          this.submitting = false;
          if (err?.status === 404) {
            this.alert.error('No existing result found for this student — use Submit instead');
            this.alreadyExists = false;
            return;
          }
          this.alert.error(err?.error?.message || 'Error correcting offline result');
        },
      });
  }

  private resetSingleForm(): void {
    this.admissionNo = '';
    this.batchId = '';
    this.completedAtLocal = '';
    this.studentOptions = [];
    this.studentSearchText = '';
    this.showStudentDropdown = false;
    this.resetDraftAnswers();
    this.formErrors = [];
    this.errorQuestionIds = new Set<string>();
    this.lastSinglePayload = null;
  }

  // ====================================================
  // BULK TAB
  // ====================================================

  private questionColumnHeader(q: OfflineQuestion, index: number): string {
    return `Q${index + 1} (${q.questionNo})`;
  }

  downloadTemplate(): void {
    if (!this.questions.length) {
      this.alert.error('Questions are still loading — try again in a moment');
      return;
    }

    const instructionRows: any[][] = [
      ['OFFLINE MARKS ENTRY — HOW TO FILL THIS FILE'],
      [`Exam: ${this.examName || ''}   |   Code: ${this.examCode || ''}`],
      [],
      ['STEPS'],
      ['1.', 'Go to the "Marks Entry" sheet. Do not rename, reorder, add, or delete any columns.'],
      ['2.', 'Delete the sample row (Admission No = "SAMPLE-DELETE-THIS-ROW") before adding your own rows — one row per student.'],
      ['3.', '"Admission No" is required and must match a student already enrolled for this exam.'],
      ['4.', '"Batch ID" and "Completed At" are optional. Leave blank to use the student\'s existing batch and today\'s date/time.'],
      ['5.', 'For each question column, enter the answer using the format for that question\'s type — see the "Answer Format Legend" sheet.'],
      ['6.', 'Leave a question\'s cell completely blank (or type SKIP) if the student did NOT answer it on paper — recorded as skipped, not wrong.'],
      ['7.', 'Save as .xlsx and upload it back on the Bulk Import tab.'],
      [],
      ['BEFORE YOU UPLOAD'],
      ['•', 'Every question in this exam has its own column below — check that none are missing.'],
      ['•', 'Option-key answers (A/B/C/D…) are matched exactly — double-check the case.'],
      ['•', 'If a student\'s result already exists (submitted online or a previous offline entry), their row will be reported as "already exists" — use Correction for that student instead.'],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);
    wsInstructions['!cols'] = [{ wch: 4 }, { wch: 100 }];
    wsInstructions['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } },
    ];

    const headers = ['Admission No', 'Batch ID', 'Completed At'];
    this.questions.forEach((q, i) => headers.push(this.questionColumnHeader(q, i)));

    const sampleRow: any = {
      'Admission No': SAMPLE_ROW_ADMISSION_NO,
      'Batch ID': '',
      'Completed At': '',
    };
    this.questions.forEach((q, i) => {
      sampleRow[this.questionColumnHeader(q, i)] = this.exampleValueFor(q);
    });

    const wsMarks = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    wsMarks['!cols'] = headers.map((h) => ({ wch: Math.max(14, Math.min(40, h.length + 4)) }));

    const legendRows = this.questions.map((q, i) => ({
      Column: this.questionColumnHeader(q, i),
      'Question Type': q.questionType,
      'Expected Format': this.formatDescriptionFor(q),
      Example: this.exampleValueFor(q),
    }));
    const wsLegend = XLSX.utils.json_to_sheet(legendRows);
    wsLegend['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 45 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    XLSX.utils.book_append_sheet(wb, wsMarks, 'Marks Entry');
    XLSX.utils.book_append_sheet(wb, wsLegend, 'Answer Format Legend');

    const safeName = (this.examName || 'exam').replace(/[^a-z0-9]+/gi, '_');
    XLSX.writeFile(wb, `offline_marks_${safeName}.xlsx`);
  }

  private formatDescriptionFor(q: OfflineQuestion): string {
    switch (q.questionType) {
      case 'mcq_single':
        return 'Single option key';
      case 'mcq_multi':
        return 'Option keys joined with ;';
      case 'passage_qns':
        if (this.isFreeTextPassage(q)) return 'Free text';
        return this.isMultiSelect(q) ? 'Option keys joined with ;' : 'Single option key';
      case 'true_false':
        return 'true / false';
      case 'numeric':
        return 'Number (decimals allowed)';
      case 'integer':
        return 'Whole number';
      case 'matrix':
        return 'LeftKey:RightKeys pairs joined with ; (e.g. A:PQ;B:R)';
      case 'short_answer':
      case 'subjective':
        return 'Free text';
      default:
        return '';
    }
  }

  private exampleValueFor(q: OfflineQuestion): string {
    switch (q.questionType) {
      case 'mcq_single':
        return q.questionOptions?.[0]?.key || 'A';
      case 'mcq_multi': {
        const keys = (q.questionOptions || []).slice(0, 2).map((o) => o.key);
        return keys.length ? keys.join(';') : 'A;B';
      }
      case 'passage_qns':
        if (this.isFreeTextPassage(q)) return 'Sample answer text';
        if (this.isMultiSelect(q)) {
          const keys = (q.questionOptions || []).slice(0, 2).map((o) => o.key);
          return keys.length ? keys.join(';') : 'A;B';
        }
        return q.questionOptions?.[0]?.key || 'A';
      case 'true_false':
        return 'true';
      case 'numeric':
        return '42.5';
      case 'integer':
        return '7';
      case 'matrix': {
        const left = q.leftColumn?.[0]?.key;
        const right = q.rightColumn?.[0]?.key;
        return left && right ? `${left}:${right}` : 'A:P';
      }
      case 'short_answer':
      case 'subjective':
        return 'Sample answer text';
      default:
        return '';
    }
  }

  onBulkFileSelected(files: File[]): void {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      this.alert.error('Only .xlsx or .xls files are allowed');
      return;
    }
    this.bulkFileName = file.name;
    this.bulkRows = [];
    this.bulkResultSummary = null;
    this.bulkParsing = true;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets['Marks Entry'] || workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        this.parseBulkRows(rows);
      } catch (err: any) {
        this.alert.error('Parse error: ' + (err?.message ?? 'Unknown'));
        this.bulkFileName = '';
      } finally {
        this.bulkParsing = false;
      }
    };
    reader.onerror = () => {
      this.bulkParsing = false;
      this.alert.error('Could not read file');
    };
    reader.readAsArrayBuffer(file);
  }

  private parseBulkRows(rawRows: any[]): void {
    // Re-derive the column map from the uploaded headers (rather than
    // trusting column order blindly) so a reordered/edited sheet is still
    // matched correctly by the questionNo embedded in each header.
    const uploadedColumnToQuestion = new Map<string, BulkQuestion>();
    if (rawRows.length) {
      const byQuestionNo = new Map(this.questions.map((q) => [q.questionNo, q as BulkQuestion]));
      Object.keys(rawRows[0]).forEach((header) => {
        const code = extractQuestionNoFromHeader(header);
        if (code && byQuestionNo.has(code)) {
          uploadedColumnToQuestion.set(header, byQuestionNo.get(code) as BulkQuestion);
        }
      });
    }
    if (!uploadedColumnToQuestion.size) {
      this.alert.error(
        'No question columns recognized in this file — make sure you used the downloaded template for this exam',
      );
      this.bulkRows = [];
      return;
    }

    this.bulkRows = rawRows
      .filter((row) => String(row['Admission No'] || '').trim() !== SAMPLE_ROW_ADMISSION_NO)
      .map((row, i) => {
        const admissionNo = String(row['Admission No'] || '').trim();
        const batchId = String(row['Batch ID'] || '').trim();
        const completedAt = this.parseCompletedAtCell(row['Completed At']);
        const rowErrors: string[] = [];
        if (!admissionNo) rowErrors.push('Admission No is required');

        const { answers, errors } = parseStudentRow(row, uploadedColumnToQuestion);
        rowErrors.push(...errors);

        return {
          rowNo: i + 1,
          admissionNo,
          batchId,
          completedAt,
          valid: rowErrors.length === 0,
          errors: rowErrors,
          answers,
          status: 'pending' as const,
          failureReason: '',
        };
      });
  }

  /** Same UTC-getter normalization used for the PTM Excel-date fix — Excel
   * date/time cells come back as UTC-anchored Date objects from cellDates,
   * so local getters would shift by the browser's timezone offset. */
  private parseCompletedAtCell(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (value instanceof Date) {
      const local = new Date(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        value.getUTCHours(),
        value.getUTCMinutes(),
        value.getUTCSeconds(),
      );
      return local.getTime();
    }
    const s = String(value).trim();
    if (!s) return undefined;
    const ms = new Date(s.replace(' ', 'T')).getTime();
    return Number.isNaN(ms) ? undefined : ms;
  }

  get bulkValidCount(): number {
    return this.bulkRows.filter((r) => r.valid && r.status !== 'success').length;
  }

  get bulkFailedRows(): BulkRowPreview[] {
    return this.bulkRows.filter((r) => r.status === 'failed');
  }

  submitBulk(retryFailedOnly = false): void {
    const targetRows = retryFailedOnly
      ? this.bulkRows.filter((r) => r.status === 'failed')
      : this.bulkRows.filter((r) => r.valid && r.status !== 'success');

    if (!targetRows.length) {
      this.alert.error('No valid rows to submit');
      return;
    }

    this.bulkSubmitting = true;
    const payload = {
      tenantId: this.tenantId,
      userId: this.userId,
      examId: this.examId,
      students: targetRows.map((r) => {
        const s: any = { admissionNo: r.admissionNo, answers: r.answers };
        if (r.batchId) s.batchId = r.batchId;
        if (r.completedAt !== undefined) s.completedAt = r.completedAt;
        return s;
      }),
    };

    this.commonApi.fetchData(payload, 'exam/result', 'submit-offline/bulk').subscribe({
      next: (res: any) => {
        this.bulkSubmitting = false;
        if (!res?.status) {
          this.alert.error(res?.message || 'Bulk import failed');
          return;
        }
        const errorsByAdmissionNo = new Map<string, string>(
          (res.data?.errors || []).map((e: any) => [e.admissionNo, e.reason]),
        );
        targetRows.forEach((r) => {
          const reason = errorsByAdmissionNo.get(r.admissionNo);
          if (reason) {
            r.status = 'failed';
            r.failureReason = reason;
          } else {
            r.status = 'success';
            r.failureReason = '';
          }
        });
        this.bulkResultSummary = {
          successCount: res.data?.successCount ?? 0,
          failedCount: res.data?.failedCount ?? 0,
        };
        this.alert.success(res.message || 'Offline results processed');
      },
      error: (err: any) => {
        this.bulkSubmitting = false;
        this.alert.error(err?.error?.message || 'Error submitting bulk offline results');
      },
    });
  }

  resetBulkImport(): void {
    this.bulkFileName = '';
    this.bulkRows = [];
    this.bulkResultSummary = null;
  }
}
