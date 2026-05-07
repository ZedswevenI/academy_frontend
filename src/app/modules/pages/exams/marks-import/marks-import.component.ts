import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-marks-import',
  standalone: false,
  templateUrl: './marks-import.component.html',
  styleUrls: ['./marks-import.component.scss']
})
export class MarksImportComponent implements OnInit {

  tenantId = '';
  submitting = false;

  examForm!: FormGroup;
  subjects: any[] = [];

  classOptions = [
    ...Array.from({ length: 7 }, (_, i) => ({ label: `Class ${i + 6}`, value: i + 6 })),
    { label: '12th Pass', value: 13 }
  ];

  // Excel state
  excelFile: File | null = null;
  parsedStudents: any[] = [];
  excelParsing = false;

  constructor(
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
    private breadcrumb: BredcrumpService
  ) {
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams', link: '/app/exams/exams' },
      { label: 'Import Marks' }
    ]);
    this.buildForm();
    this.loadSubjects();
  }

  buildForm() {
    this.examForm = this.fb.group({
      examCode: ['', Validators.required],
      examName: ['', Validators.required],
      classNo: [null, Validators.required],
      totalMarks: [{ value: null, disabled: true }],
      totalQuestions: [null],
      duration: [null],
      examDate: [''],
      description: [''],
      sections: this.fb.array([this.newSection(0)])
    });
  }

  get sections(): FormArray {
    return this.examForm.get('sections') as FormArray;
  }

  newSection(index = 0): FormGroup {
    const fg = this.fb.group({
      sectionCode: ['', Validators.required],
      sectionName: ['', Validators.required],
      subjectId: ['', Validators.required],
      numberOfQuestions: [0, [Validators.required, Validators.min(1)]],
      sectionTotalMarks: [null, [Validators.required, Validators.min(1)]],
      sortOrder: [index]
    });
    fg.get('sectionTotalMarks')?.valueChanges.subscribe(() => this.recalcTotalMarks());
    return fg;
  }

  recalcTotalMarks() {
    const total = this.sections.controls.reduce(
      (sum, c) => sum + (Number(c.get('sectionTotalMarks')?.value) || 0), 0
    );
    this.examForm.get('totalMarks')?.setValue(total || null, { emitEvent: false });
  }

  addSection() {
    this.sections.push(this.newSection(this.sections.length));
  }

  removeSection(i: number) {
    if (this.sections.length > 1) {
      this.sections.removeAt(i);
      this.sections.controls.forEach((c, idx) => c.get('sortOrder')?.setValue(idx));
    }
  }

  onSectionSubjectChange(index: number) {
    const section = this.sections.at(index) as FormGroup;
    const subjectId = section.get('subjectId')?.value;
    if (!subjectId) return;

    // Duplicate check
    const duplicate = this.sections.controls.some(
      (c, i) => i !== index && c.get('subjectId')?.value === subjectId
    );
    if (duplicate) {
      this.alert.error('This subject is already added in another section');
      section.patchValue({ subjectId: '', sectionCode: '', sectionName: '' });
      return;
    }

    // Auto-fill from subject
    const subject = this.subjects.find((s: any) => s._id === subjectId);
    if (subject) {
      section.patchValue({
        sectionCode: subject.subjectCode || '',
        sectionName: subject.subjectName || ''
      });
    }
  }

  hasDuplicateSubjects(): boolean {
    const ids = this.sections.controls.map(c => c.get('subjectId')?.value).filter(v => !!v);
    return new Set(ids).size !== ids.length;
  }

  get sectionQuestionsTotal(): number {
    return this.sections.controls.reduce(
      (sum, c) => sum + (Number(c.get('numberOfQuestions')?.value) || 0), 0
    );
  }

  get sectionTotalMarksSum(): number {
    return this.sections.controls.reduce(
      (sum, c) => sum + (Number(c.get('sectionTotalMarks')?.value) || 0), 0
    );
  }

  private loadSubjects() {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => { this.subjects = res?.data || []; }
    });
  }

  // ── Excel ──────────────────────────────────────────────────────────────────

  onExcelSelected(event: any) {
    const file = event.target.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      this.excelFile = file;
      this.parsedStudents = [];
    } else {
      this.alert.error('Please select a valid .xlsx or .xls file');
      this.excelFile = null;
    }
  }

  removeExcel() {
    this.excelFile = null;
    this.parsedStudents = [];
  }

  getSectionMeta(): { sectionId: string; sectionName: string }[] {
    return this.sections.controls.map((c: any) => ({
      sectionId: c.get('subjectId')?.value || '',
      sectionName: c.get('sectionName')?.value || ''
    })).filter(s => s.sectionId && s.sectionName);
  }

  parseExcel() {
    if (!this.excelFile) return;
    const secMeta = this.getSectionMeta();
    if (!secMeta.length) {
      this.alert.error('Please configure sections before parsing the file.');
      return;
    }
    this.excelParsing = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        this.parsedStudents = rows
          .map((r: any) => {
            const admissionNo = String(
              r['Admission No'] ?? r['admission_no'] ?? r['AdmissionNo'] ?? ''
            ).trim();
            if (!admissionNo) return null;

            const obtainedMarks = Number(r['Obtained Marks'] ?? r['obtained_marks'] ?? 0);

            const sectionResults = secMeta
              .filter(s => s.sectionName)
              .map(s => ({
                sectionId: s.sectionId,
                obtainedMarks: Number(r[`${s.sectionName} Marks`] ?? 0),
                totalQuestions: Number(r[`${s.sectionName} Questions`] ?? 0),
                correctCount: Number(r[`${s.sectionName} Correct`] ?? 0),
                wrongCount: Number(r[`${s.sectionName} Wrong`] ?? 0),
                skippedCount: Number(r[`${s.sectionName} Skipped`] ?? 0),
              }));

            return { admissionNo, obtainedMarks, sectionResults };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (!this.parsedStudents.length) {
          this.alert.error('No valid rows found. Ensure column: Admission No');
        }
      } catch (err) {
        this.alert.error('Failed to parse Excel file.');
      }
      this.excelParsing = false;
    };
    reader.readAsArrayBuffer(this.excelFile);
  }

  downloadSample() {
    const secMeta = this.getSectionMeta();
    if (!secMeta.length) {
      this.alert.error('Please configure at least one section with a subject before downloading the sample.');
      return;
    }

    const buildRow = (admNo: string, total: number, secMarks: number[]) => {
      const row: any = { 'Admission No': admNo, 'Obtained Marks': total };
      secMeta.forEach((s, i) => {
        const m = secMarks[i] ?? 0;
        row[`${s.sectionName} Marks`] = m;
        row[`${s.sectionName} Questions`] = 10;
        row[`${s.sectionName} Correct`] = Math.floor(m * 0.8);
        row[`${s.sectionName} Wrong`] = Math.floor(m * 0.1);
        row[`${s.sectionName} Skipped`] = 2;
      });
      return row;
    };

    const data = [
      buildRow('ADM001', 85, [45, 40]),
      buildRow('ADM002', 72, [38, 34]),
      buildRow('ADM003', 90, [48, 42]),
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, 'sample_marks.xlsx');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  canSubmit(): boolean {
    const f = this.examForm.getRawValue();
    if (!this.examForm.valid || !f.examCode || !f.examName || !f.classNo) return false;
    if (!this.parsedStudents.length || this.hasDuplicateSubjects()) return false;
    if (this.sectionTotalMarksSum === 0) return false;
    if (f.totalQuestions && this.sectionQuestionsTotal !== Number(f.totalQuestions)) return false;
    return true;
  }

  submit() {
    if (!this.canSubmit()) {
      this.examForm.markAllAsTouched();
      if (!this.parsedStudents.length) this.alert.error('Please upload and parse a student marks file.');
      return;
    }

    const f = this.examForm.getRawValue();
    const sectionTotalMap: Record<string, number> = {};
    const sections = f.sections.map((s: any, i: number) => {
      sectionTotalMap[s.subjectId] = Number(s.sectionTotalMarks) || 0;
      return {
        sectionId: s.subjectId,
        sectionCode: s.sectionCode,
        sectionName: s.sectionName,
        subjectId: s.subjectId,
        numberOfQuestions: s.numberOfQuestions || 0,
        totalMarks: Number(s.sectionTotalMarks) || 0,
        sortOrder: s.sortOrder ?? i
      };
    });

    const students = this.parsedStudents.map((s: any) => ({
      admissionNo: s.admissionNo,
      obtainedMarks: s.obtainedMarks,
      classNo: f.classNo,
      sectionResults: (s.sectionResults || []).map((sr: any) => ({
        ...sr,
        totalMarks: sectionTotalMap[sr.sectionId] || 0
      }))
    }));

    const payload: any = {
      entiId: this.tenantId,
      userId: localStorage.getItem('userId'),
      examCode: f.examCode,
      examName: f.examName,
      classNo: f.classNo,
      totalMarks: this.sectionTotalMarksSum,
      sections,
      students
    };

    if (f.totalQuestions) payload.totalQuestions = f.totalQuestions;
    if (f.duration) payload.duration = f.duration;
    if (f.examDate) payload.startTime = new Date(f.examDate).getTime();
    if (f.description) payload.description = f.description;

    this.submitting = true;
    this.commonApi.fetchData(payload, 'exam', 'result/bulk-upload-historical').subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.status) {
          this.alert.success(res.message || `Marks imported successfully. ${res.data?.insertedCount || ''} results saved.`);
          this.router.navigate(['/app/exams/exams']);
        } else {
          this.alert.error(res?.message || 'Failed to import marks.');
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.alert.error(err?.error?.message || 'Error importing marks.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/app/exams/exams']);
  }
}
