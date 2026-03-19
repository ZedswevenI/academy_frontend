import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-exam-instructions',
  standalone: false,
  templateUrl: './instructions.component.html',
  styleUrl: './instructions.component.scss',
})
export class ExamInstructionsComponent implements OnInit {

  loading = false;
  totalRecords = 0;
  showForm = false;
  isEditMode = false;
  editRecId = '';

  instructionForm!: FormGroup;
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
    { key: 'title', label: 'Title', sortable: true },
    { key: 'language', label: 'Language', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdAt', label: 'Created At', sortable: true }
  ];

  dataArray: any[] = [];

  /* ================= FILTER OPTIONS ================= */
  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ];

  languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Tamil', value: 'ta' }
  ];

  /* ================= VIEW MODAL ================= */
  showViewModal = false;
  viewData: any = null;
  viewContentHtml: SafeHtml = '';

  /* ================= ACTIONS ================= */
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#10b981',
      callback: (row: any) => this.viewInstruction(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editInstruction(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc2626',
      callback: (row: any) => this.deleteInstruction(row)
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams' },
      { label: 'Instructions' },
    ]);
    this.initForms();
  }

  /* ================= FORMS ================= */

  initForms() {
    this.instructionForm = this.fb.group({
      title: ['', Validators.required],
      contentHtml: ['', Validators.required],
      language: ['en', Validators.required]
    });

    this.filterForm = this.fb.group({
      status: [''],
      language: ['']
    });
  }

  toggleFilters() { this.showFilters = !this.showFilters; }

  clearFilters() {
    this.filterForm.reset();
    if (this.lastTableParams) this.fetchTableData(this.lastTableParams);
  }

  openCreateForm() {
    this.isEditMode = false;
    this.editRecId = '';
    this.instructionForm.reset({ language: 'en' });
    this.showForm = true;
  }

  openEditForm(row: any) {
    this.isEditMode = true;
    this.editRecId = row._id;
    this.instructionForm.patchValue({
      title: row.title,
      contentHtml: row.contentHtml,
      language: row.language
    });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.instructionForm.reset({ language: 'en' });
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
    if (filters.language) query.language = filters.language;

    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'exam/instruction', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              id: item._id,
              createdAt: new Date(item.createdAt).toLocaleDateString()
            }));
            this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error loading instructions');
        }
      });
  }

  /* ================= CRUD ================= */

  submitInstruction() {
    if (this.instructionForm.invalid) {
      this.instructionForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const formValue = this.instructionForm.value;

    if (this.isEditMode) {
      this.updateInstruction(formValue);
    } else {
      this.createInstruction(formValue);
    }
  }

  private createInstruction(formValue: any) {
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      title: formValue.title,
      contentHtml: formValue.contentHtml,
      language: formValue.language
    };

    this.commonApi.fetchData(payload, 'exam/instruction', 'create').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Instruction created successfully');
          this.closeForm();
          this.refresh();
        }
      },
      error: () => this.alert.error('Error creating instruction')
    });
  }

  private updateInstruction(formValue: any) {
    const payload = {
      recId: this.editRecId,
      entiId: localStorage.getItem('tenantId'),
      title: formValue.title,
      contentHtml: formValue.contentHtml,
      language: formValue.language
    };

    this.commonApi.fetchData(payload, 'exam/instruction', 'update').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Instruction updated successfully');
          this.closeForm();
          this.refresh();
        }
      },
      error: () => this.alert.error('Error updating instruction')
    });
  }

  editInstruction(row: any) {
    this.openEditForm(row);
  }

  deleteInstruction(row: any) {
    if (!confirm('Are you sure you want to delete this instruction?')) return;

    const payload = {
      recId: row._id,
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(payload, 'exam/instruction', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Instruction deleted successfully');
          this.refresh();
        }
      },
      error: () => this.alert.error('Error deleting instruction')
    });
  }

  refresh() {
    if (this.lastTableParams) {
      this.fetchTableData(this.lastTableParams);
      return;
    }
    this.fetchTableData({ page: 1, pageSize: 10 });
  }

  /* ================= VIEW ================= */

  viewInstruction(row: any): void {
    this.viewData = row;
    this.viewContentHtml = this.sanitizer.bypassSecurityTrustHtml(row.contentHtml || '');
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewData = null;
    this.viewContentHtml = '';
  }

  /* ================= EDITOR ================= */

  execCommand(command: string, value: string | null = null) {
    document.execCommand(command, false, value || '');
  }

  onEditorInput(event: Event) {
    const target = event.target as HTMLDivElement;
    if (!target) return;
    this.instructionForm.patchValue({ contentHtml: target.innerHTML });
  }
}
