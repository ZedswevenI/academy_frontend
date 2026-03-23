import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

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
  fieldType_options = [
    { label: 'Text (open answer)', value: 'text' },
    { label: 'Radio (single)', value: 'radio' },
    { label: 'Checkbox (multi)', value: 'checkbox' },
  ];
  columnsArray = [
    { key: 'title', label: 'Title', sortable: false },
    { key: 'categoryLabel', label: 'Category', sortable: false },
    { key: 'questionCount', label: 'Questions', sortable: false },
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
      callback: (row: any) => this.openEditModal(row),
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-toggle-on',
      tooltip: 'Toggle Status',
      color: '#6B7280',
      hoverColor: '#854F0B',
      callback: (row: any) => this.toggleStatus(row),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      callback: (row: any) => this.openDeleteModal(row),
    },
  ];
  categoryMap: Record<string, string> = {
    STAFF: 'Staff / Teacher',
    BATCH: 'Batch / Class',
    FACILITY: 'Facility',
    COURSE: 'Course Content',
  };

  constructor(
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
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
      fieldType: ['radio', Validators.required],
      fieldText: ['', Validators.required],
      optionsRaw: [''],
    });
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

  fetchTemplates(page: number, limit: number): void {
    this.loading = true;
    const body = { tenantId: this.tenantId };
    const query = `list?page=${page}&limit=${limit}`;
    this.commonApi.fetchData(body, 'feedback/template', query).subscribe({
      next: (res: any) => {
        this.dataArray = (res?.data || []).map((t: any) => ({
          ...t,
          categoryLabel: this.categoryMap[t.category] || t.category,
          questionCount: (t.questions?.length || 0) + ' questions',
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

  loadTableData(req: { page: number; pageSize: number }): void {
    this.fetchTemplates(req.page, req.pageSize);
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editId = null;
    this.buildForm();
    this.addQuestion();
    this.openModal('templateFormModal');
  }

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
                  optionsRaw: [q.fieldOptions?.join(', ') || ''],
                }),
              );
            });
          }
          this.openModal('templateFormModal');
        },
        error: () => this.alert.error('Error loading template'),
      });
  }

  saveTemplate(): void {
    if (this.templateForm.invalid || !this.questions.length) {
      this.templateForm.markAllAsTouched();
      this.alert.error(
        'Please fill all required fields and add at least one question',
      );
      return;
    }
    const f = this.templateForm.value;
    const questions = this.questions.controls.map((ctrl, i) => {
      const qv = ctrl.value;
      const options = qv.optionsRaw
        ? qv.optionsRaw
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
      return {
        fieldId: qv.fieldId || `q_${i + 1}`,
        fieldType: qv.fieldType,
        fieldText: qv.fieldText,
        fieldOptions: qv.fieldType === 'text' ? [] : options,
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
    const endpoint = this.isEditMode ? 'update' : 'create';
    this.commonApi
      .fetchData(payload, 'feedback/template', endpoint)
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
        {
          tenantId: this.tenantId,
          templateId: row._id
        },
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
}
