import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import jsPDF from 'jspdf';
import { PermissionService } from '../../../../shared/permission.service';

@Component({
  selector: 'app-template',
  standalone: false,
  templateUrl: './template.component.html',
  styleUrl: './template.component.scss',
})
export class TemplateComponent implements OnInit {
  loading = false;
  tenantId: any;
  dataArray: any[] = [];
  totalRecords = 0;
  templateForm!: FormGroup;
  isEditMode = false;
  editId: string | null = null;
  saving = false;
  templateToDelete: any = null;

  category_options = [
    { label: 'Staff / Teacher', value: 'STAFF' },
    { label: 'Batch / Class', value: 'BATCH' },
    { label: 'Facility', value: 'FACILITY' },
    { label: 'Course Content', value: 'COURSE' },
  ];

  // Score type added — used for STAFF category numeric rating questions
  fieldType_options = [
    { label: 'Score (0–10)', value: 'score' },
    { label: 'Text (open answer)', value: 'text' },
    { label: 'Radio (single)', value: 'radio' },
    { label: 'Checkbox (multi)', value: 'checkbox' },
  ];

  part_options = [
    { label: 'Part A (Teaching Effectiveness)', value: 'A' },
    { label: 'Part B (Research / Other)', value: 'B' },
  ];

  columnsArray = [
    { key: 'title', label: 'Title', sortable: false },
    { key: 'categoryLabel', label: 'Category', sortable: false },
    { key: 'questionCount', label: 'Questions', sortable: false },
    { key: 'partSummary', label: 'Parts', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'createdAt', label: 'Created', sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      show: () => !this.permissionService.hasPermission('feedbackTemplate:edit'),
      callback: (row: any) => this.openEditModal(row),
    },
    {
      type: 'toggle',
      tooltip: 'Toggle Status',
      isActive: (row: any) => row.status !== 'INACTIVE',
      show: () => !this.permissionService.hasPermission('feedbackTemplate:toggleStatus'),
      callback: (row: any) => this.toggleStatus(row),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      show: () => !this.permissionService.hasPermission('feedbackTemplate:delete'),
      callback: (row: any) => this.openDeleteModal(row),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-file-pdf',
      tooltip: 'Export PDF',
      color: '#6B7280',
      hoverColor: '#DC2626',
      show: () => !this.permissionService.hasPermission('feedbackTemplate:export'),
      callback: (row: any) => this.exportTemplatePdf(row),
    },
  ];

  categoryMap: Record<string, string> = {
    STAFF: 'Staff / Teacher',
    BATCH: 'Batch / Class',
    FACILITY: 'Facility',
    COURSE: 'Course Content',
  };

  previewSubjects = ['Maths', 'Physics', 'Chemistry'];

  constructor(
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
    private permissionService: PermissionService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([
      { label: 'Feedback', link: '/app/feedback' },
      { label: 'Templates' },
    ]);
  }

  ngOnInit(): void {
    this.buildForm();
    this.fetchTemplates(1, 10);
  }

  // ── Form builders ────────────────────────────────────────────────────────────
  private buildForm(): void {
    this.templateForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      questions: this.fb.array([]),
    });
  }

  get questions(): FormArray {
    return this.templateForm.get('questions') as FormArray;
  }

  newQuestion(): FormGroup {
    return this.fb.group({
      fieldId: [''],
      fieldType: ['score', Validators.required],
      fieldText: ['', Validators.required],
      optionsList: this.fb.array([]), // [{label, score}] for radio/checkbox
      part: ['A'],
      weightage: [1],
      maxScore: [10],
      isSubjectBased: [false],
    });
  }

  newOption(label = '', score = 0): FormGroup {
    return this.fb.group({
      label: [label, Validators.required],
      score: [score],
    });
  }

  getOptions(i: number): FormArray {
    return this.questions.at(i).get('optionsList') as FormArray;
  }

  addOption(i: number): void {
    this.getOptions(i).push(this.newOption());
  }

  removeOption(qi: number, oi: number): void {
    this.getOptions(qi).removeAt(oi);
  }

  addQuestion(): void {
    this.questions.push(this.newQuestion());
  }
  removeQuestion(i: number): void {
    this.questions.removeAt(i);
  }

  needsOptions(i: number): boolean {
    return ['radio', 'checkbox'].includes(
      this.questions.at(i).get('fieldType')?.value,
    );
  }

  isScoreType(i: number): boolean {
    return this.questions.at(i).get('fieldType')?.value === 'score';
  }

  isSubjectBasedQ(i: number): boolean {
    return this.questions.at(i).get('isSubjectBased')?.value === true;
  }

  getPreviewText(i: number, subject: string): string {
    const text =
      this.questions.at(i).get('fieldText')?.value || 'Question text';
    return text.replace(/\{subject\}/g, subject);
  }

  hasSubjectPlaceholder(i: number): boolean {
    return (this.questions.at(i).get('fieldText')?.value || '').includes(
      '{subject}',
    );
  }

  getSubjectBasedCount(): number {
    return this.questions.controls.filter(
      (c) => c.get('isSubjectBased')?.value === true,
    ).length;
  }

  getPartACount(): number {
    return this.questions.controls.filter((c) => c.get('part')?.value === 'A')
      .length;
  }

  getPartBCount(): number {
    return this.questions.controls.filter((c) => c.get('part')?.value === 'B')
      .length;
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  fetchTemplates(page: number, limit: number): void {
    this.loading = true;
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId },
        'feedback/template',
        `list?page=${page}&limit=${limit}`,
      )
      .subscribe({
        next: (res: any) => {
          this.dataArray = (res?.data || []).map((t: any) => ({
            ...t,
            categoryLabel: this.categoryMap[t.category] || t.category,
            questionCount: (t.questions?.length || 0) + ' questions',
            partSummary: this.buildPartSummary(t.questions || []),
            createdAt: this.formatDate(t.createdAt),
          }));
          this.totalRecords = res?.count || this.dataArray.length;
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading templates');
          this.loading = false;
        },
      });
  }

  private buildPartSummary(questions: any[]): string {
    const a = questions.filter((q) => q.part === 'A').length;
    const b = questions.filter((q) => q.part === 'B').length;
    if (!a && !b) return '—';
    const parts = [];
    if (a) parts.push(`A:${a}`);
    if (b) parts.push(`B:${b}`);
    return parts.join(' · ');
  }

  loadTableData(req: { page: number; pageSize: number }): void {
    this.fetchTemplates(req.page, req.pageSize);
  }

  // ── Create modal ─────────────────────────────────────────────────────────────
  openCreateModal(): void {
    this.isEditMode = false;
    this.editId = null;
    this.buildForm();
    this.addQuestion();
    this.openModal('templateFormModal');
  }

  // ── Edit modal ───────────────────────────────────────────────────────────────
  openEditModal(row: any): void {
    this.isEditMode = true;
    this.editId = row._id;
    this.buildForm();
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, templateId: row._id },
        'feedback/template',
        'view',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.data) {
            const d = res.data;
            this.templateForm.patchValue({
              title: d.title,
              description: d.description || '',
              category: d.category,
            });
            (d.questions || []).forEach((q: any) => {
              this.questions.push(
                this.fb.group({
                  fieldId: [q.fieldId],
                  fieldType: [q.fieldType, Validators.required],
                  fieldText: [q.fieldText, Validators.required],
                  optionsList: this.fb.array(
                    (q.fieldOptions || []).map((o: any) =>
                      this.fb.group({
                        label: [o.label || o, Validators.required],
                        score: [o.score || 0],
                      }),
                    ),
                  ),
                  part: [q.part || 'A'],
                  weightage: [q.weightage || 1],
                  maxScore: [q.maxScore || 10],
                  isSubjectBased: [q.isSubjectBased || false],
                }),
              );
            });
          }
          this.openModal('templateFormModal');
        },
        error: () => this.alert.error('Error loading template'),
      });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  saveTemplate(): void {
    if (this.templateForm.invalid || !this.questions.length) {
      this.templateForm.markAllAsTouched();
      this.alert.error(
        'Please fill all required fields and add at least one question',
      );
      return;
    }
    // Validate subject-based questions have {subject} placeholder
    const subjectWarnings: number[] = [];
    this.questions.controls.forEach((ctrl, i) => {
      if (
        ctrl.value.isSubjectBased &&
        !ctrl.value.fieldText.includes('{subject}')
      )
        subjectWarnings.push(i + 1);
    });
    if (subjectWarnings.length) {
      this.alert.error(
        `Question(s) ${subjectWarnings.join(', ')} are marked subject-based but missing {subject} placeholder`,
      );
      return;
    }

    const f = this.templateForm.value;
    const questions = this.questions.controls.map((ctrl, i) => {
      const qv = ctrl.value;
      const optionsList = (qv.optionsList || []) as {
        label: string;
        score: number;
      }[];
      const options = optionsList.filter((o) => o.label?.trim());
      return {
        fieldId: qv.fieldId || `q_${i + 1}`,
        fieldType: qv.fieldType,
        fieldText: qv.fieldText,
        fieldOptions:
          qv.fieldType === 'text' || qv.fieldType === 'score' ? [] : options,
        part: qv.part || 'A',
        weightage: Number(qv.weightage) || 1,
        maxScore: Number(qv.maxScore) || 10,
        isSubjectBased: qv.isSubjectBased || false,
        sortOrder: i + 1,
      };
    });

    const payload: any = {
      tenantId: this.tenantId,
      userId: localStorage.getItem('userId'),
      title: f.title,
      description: f.description || null,
      category: f.category,
      questions,
    };
    if (this.isEditMode) payload.templateId = this.editId;

    this.saving = true;
    this.commonApi
      .fetchData(
        payload,
        'feedback/template',
        this.isEditMode ? 'update' : 'create',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success(
              this.isEditMode ? 'Template updated' : 'Template created',
            );
            this.closeModal('templateFormModal');
            this.fetchTemplates(1, 10);
          }
          this.saving = false;
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Error saving template');
          this.saving = false;
        },
      });
  }

  toggleStatus(row: any): void {
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, templateId: row._id },
        'feedback/template',
        'togglestatus',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success(res.message);
            this.fetchTemplates(1, 10);
          }
        },
        error: () => this.alert.error('Error toggling status'),
      });
  }

  openDeleteModal(row: any): void {
    this.templateToDelete = row;
    this.openModal('templateDeleteModal');
  }

  confirmDelete(): void {
    if (!this.templateToDelete) return;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          templateId: this.templateToDelete._id,
          userId: localStorage.getItem('userId'),
        },
        'feedback/template',
        'delete',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Template deleted');
            this.templateToDelete = null;
            this.fetchTemplates(1, 10);
          }
        },
        error: (err: any) =>
          this.alert.error(err?.error?.message || 'Error deleting template'),
      });
  }

  private formatDate(ts: any): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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

  exportTemplatePdf(row: any): void {
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, templateId: row._id },
        'feedback/template',
        'view',
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.data) {
            this.alert.error('Failed to load template');
            return;
          }
          const d = res.data;
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
          });
          const pageW = doc.internal.pageSize.getWidth();
          const margin = 15;
          const contentW = pageW - margin * 2;
          let y = 20;
          const fieldTypeLabel: Record<string, string> = {
            score: 'Score (0–10)',
            text: 'Text (open answer)',
            radio: 'Radio (single choice)',
            checkbox: 'Checkbox (multiple choice)',
          };
          const partLabel: Record<string, string> = {
            A: 'Part A — Teaching Effectiveness',
            B: 'Part B — Research / Other',
          };
          const checkPage = (needed = 10) => {
            if (y + needed > doc.internal.pageSize.getHeight() - 15) {
              doc.addPage();
              y = 20;
            }
          };
          doc.setFontSize(16).setFont('helvetica', 'bold');
          doc.text(d.title || 'Feedback Template', margin, y);
          y += 8;
          doc.setFontSize(10).setFont('helvetica', 'normal');
          const catLabel = this.categoryMap[d.category] || d.category || '';
          const qCount = (d.questions || []).length;
          doc.text(
            `Category: ${catLabel}   |   Total Questions: ${qCount}`,
            margin,
            y,
          );
          y += 5;
          doc.setDrawColor(180).line(margin, y, pageW - margin, y);
          y += 8;
          // ── Group by Part ──
          const questions: any[] = d.questions || [];
          const partA = questions.filter((q) => (q.part || 'A') === 'A');
          const partB = questions.filter((q) => q.part === 'B');
          const noPart = questions.filter((q) => !q.part);
          let sno = 1;
          const renderGroup = (label: string, group: any[]) => {
            if (!group.length) return;
            checkPage(12);
            doc.setFontSize(11).setFont('helvetica', 'bold');
            doc.text(label, margin, y);
            y += 4;
            doc.setDrawColor(200).line(margin, y, pageW - margin, y);
            y += 7;

            group.forEach((q: any) => {
              const qText = `${sno}. ${q.fieldText || ''}`;
              const lines = doc.splitTextToSize(qText, contentW - 5);
              checkPage(lines.length * 6 + 16);
              doc.setFontSize(10).setFont('helvetica', 'bold');
              doc.text(lines, margin + 2, y);
              y += lines.length * 5 + 2;
              if (q.isSubjectBased) {
                doc
                  .setFontSize(8)
                  .setFont('helvetica', 'italic')
                  .setTextColor(100);
                doc.text('[Subject-based]', margin + 4, y);
                doc.setTextColor(0);
                y += 5;
              }
              const opts: any[] = q.fieldOptions || [];
              if (opts.length) {
                const optLabels = opts
                  .map((o: any) => o.label || o)
                  .join('  /  ');
                const optLines = doc.splitTextToSize(
                  `Options: ${optLabels}`,
                  contentW - 8,
                );
                checkPage(optLines.length * 5 + 4);
                doc.text(optLines, margin + 4, y);
                y += optLines.length * 5;
              }
              y += 5;
              sno++;
            });
            y += 4;
          };
          renderGroup(partLabel['A'], partA);
          renderGroup(partLabel['B'], partB);
          if (noPart.length) renderGroup('Other', noPart);
          doc.save(`${d.title || 'template'}.pdf`);
        },
        error: () => this.alert.error('Error loading template for export'),
      });
  }
}
