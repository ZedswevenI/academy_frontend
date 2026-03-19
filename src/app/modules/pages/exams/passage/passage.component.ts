import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

declare var katex: any;
declare var renderMathInElement: any;

@Component({
  selector: 'app-exam-passage',
  standalone: false,
  templateUrl: './passage.component.html',
  styleUrl: './passage.component.scss',
})
export class ExamPassageComponent implements OnInit {

  loading = false;
  totalRecords = 0;
  showForm = false;
  isEditMode = false;
  editRecId = '';

  passageForm!: FormGroup;
  filterForm!: FormGroup;
  showFilters = false;

  tagInput = '';
  tags: string[] = [];

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
    { key: 'tagsDisplay', label: 'Tags', sortable: false },
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

  /* ================= ACTIONS ================= */
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#10b981',
      callback: (row: any) => this.viewPassage(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editPassage(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc2626',
      callback: (row: any) => this.deletePassage(row)
    }
  ];

  /* ================= VIEW MODAL ================= */
  showViewModal = false;
  viewData: any = null;
  viewPassageHtml: SafeHtml = '';
  @ViewChild('passageViewContent') passageViewContent!: ElementRef;

  constructor(
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
  ) { }

  ngOnInit(): void {
    this.breadcrumb.set([
      { label: 'Exams' },
      { label: 'Passage' },
    ]);
    this.initForms();
  }

  /* ================= FORMS ================= */

  initForms() {
    this.passageForm = this.fb.group({
      title: ['', Validators.required],
      passageHtml: ['', Validators.required],
      language: ['en', Validators.required]
    });

    this.filterForm = this.fb.group({
      status: [''],
      language: [''],
      tag: ['']
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
    this.passageForm.reset({ language: 'en' });
    this.tags = [];
    this.tagInput = '';
    this.showForm = true;
  }

  openEditForm(row: any) {
    this.isEditMode = true;
    this.editRecId = row._id;
    this.passageForm.patchValue({
      title: row.title,
      passageHtml: row.passageHtml,
      language: row.language
    });
    this.tags = [...(row.tags || [])];
    this.tagInput = '';
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.passageForm.reset({ language: 'en' });
    this.tags = [];
    this.tagInput = '';
  }

  /* ================= TAGS ================= */

  addTag() {
    const tag = this.tagInput.trim().toLowerCase();
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    this.tagInput = '';
  }

  onTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  removeTag(index: number) {
    this.tags.splice(index, 1);
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
    if (filters.tag) query.tag = filters.tag;

    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    this.commonApi.fetchData({ entiId: localStorage.getItem('tenantId') }, 'exam/passage', `list?${queryString}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = res.data.map((item: any) => ({
              ...item,
              id: item._id,
              tagsDisplay: (item.tags || []).join(', '),
              createdAt: new Date(item.createdAt).toLocaleDateString()
            }));
            this.totalRecords = res.count || 0;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error loading passages');
        }
      });
  }

  /* ================= CRUD ================= */

  submitPassage() {
    if (this.passageForm.invalid) {
      this.passageForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const formValue = this.passageForm.value;

    if (this.isEditMode) {
      this.updatePassage(formValue);
    } else {
      this.createPassage(formValue);
    }
  }

  private createPassage(formValue: any) {
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      title: formValue.title,
      passageHtml: formValue.passageHtml,
      language: formValue.language,
      tags: this.tags
    };

    this.commonApi.fetchData(payload, 'exam/passage', 'create').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Passage created successfully');
          this.closeForm();
          this.refresh();
        }
      },
      error: () => this.alert.error('Error creating passage')
    });
  }

  private updatePassage(formValue: any) {
    const payload = {
      recId: this.editRecId,
      entiId: localStorage.getItem('tenantId'),
      title: formValue.title,
      passageHtml: formValue.passageHtml,
      language: formValue.language,
      tags: this.tags
    };

    this.commonApi.fetchData(payload, 'exam/passage', 'update').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Passage updated successfully');
          this.closeForm();
          this.refresh();
        }
      },
      error: () => this.alert.error('Error updating passage')
    });
  }

  editPassage(row: any) {
    this.openEditForm(row);
  }

  deletePassage(row: any) {
    if (!confirm('Are you sure you want to delete this passage?')) return;

    const payload = {
      recId: row._id,
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(payload, 'exam/passage', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Passage deleted successfully');
          this.refresh();
        }
      },
      error: () => this.alert.error('Error deleting passage')
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

  viewPassage(row: any): void {
    this.viewData = row;
    const normalized = this.normalizeDelimiters(row.passageHtml || '');
    this.viewPassageHtml = this.sanitizer.bypassSecurityTrustHtml(normalized);
    this.showViewModal = true;

    setTimeout(() => this.renderMathInView(), 200);
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewData = null;
    this.viewPassageHtml = '';
  }

  private normalizeDelimiters(html: string): string {
    if (!html) return html;

    let normalized = html.replace(/\\\(/g, '\\(');
    normalized = normalized.replace(/\\\)/g, '\\)');
    normalized = normalized.replace(/\\\[/g, '\\[');
    normalized = normalized.replace(/\\\]/g, '\\]');

    normalized = normalized.replace(/\\\((.*?)\\\)/gs, (_match, content) => `$${content}$`);
    normalized = normalized.replace(/\\\[(.*?)\\\]/gs, (_match, content) => `$$${content}$$`);

    return normalized;
  }

  private renderMathInView(): void {
    if (!this.passageViewContent?.nativeElement) return;

    try {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(this.passageViewContent.nativeElement, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false,
          strict: false,
          trust: true
        });
      } else if (typeof katex !== 'undefined') {
        this.processElementForMath(this.passageViewContent.nativeElement);
      }
    } catch (err) {
      console.error('Error rendering math in passage view:', err);
    }
  }

  private processElementForMath(element: HTMLElement): void {
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text.includes('$')) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        const mathRegex = /\$\$([^\$][\s\S]*?)\$\$|\$([^\$][\s\S]*?)\$/g;
        let match;

        while ((match = mathRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
          }

          const mathText = (match[1] || match[2]).trim();
          const isDisplay = !!match[1];

          try {
            const mathHtml = katex.renderToString(mathText, {
              throwOnError: false,
              displayMode: isDisplay,
              strict: 'ignore'
            });
            const container = document.createElement(isDisplay ? 'div' : 'span');
            container.innerHTML = mathHtml;
            fragment.appendChild(container);
          } catch {
            fragment.appendChild(document.createTextNode(match[0]));
          }

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        if (lastIndex > 0) {
          node.parentNode?.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'CODE', 'PRE'].includes(el.tagName)) return;
        Array.from(node.childNodes).forEach(child => walk(child));
      }
    };

    walk(element);
  }

  /* ================= EDITOR ================= */

  execCommand(command: string, value: string | null = null) {
    document.execCommand(command, false, value || '');
  }

  onEditorInput(event: Event) {
    const target = event.target as HTMLDivElement;
    if (!target) return;
    this.passageForm.patchValue({ passageHtml: target.innerHTML });
  }
}
