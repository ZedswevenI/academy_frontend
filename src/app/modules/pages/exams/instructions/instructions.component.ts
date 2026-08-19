import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PermissionService } from '../../../../shared/permission.service';

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

  /* ================= IMAGE URL MAP (edit mode) ================= */
  private imageUrlMap = new Map<string, string>();

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
      show: () => !this.permissionService.hasPermission('examContent:view'),
      callback: (row: any) => this.viewInstruction(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('examContent:edit'),
      callback: (row: any) => this.editInstruction(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc2626',
      show: () => !this.permissionService.hasPermission('examContent:delete'),
      callback: (row: any) => this.deleteInstruction(row)
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private permissionService: PermissionService,
  ) { }

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

  async openEditForm(row: any) {
    this.isEditMode = true;
    this.editRecId = row._id;
    this.imageUrlMap.clear();

    const contentHtml = await this.replaceDownloadUrls(row.contentHtml || '');

    this.instructionForm.patchValue({
      title: row.title,
      contentHtml: contentHtml,
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

  /* ================= IMAGE DOWNLOAD (edit mode) ================= */

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
          const hashedUrl = downloadRes.url;
          this.imageUrlMap.set(hashedUrl, originalUrl);
          updatedHtml = updatedHtml.replace(originalUrl, hashedUrl);
        }
      } catch (err) {
        console.error('Image download error:', err);
      }
    }
    return updatedHtml;
  }

  /* ================= IMAGE UPLOAD ================= */

  private base64SizeKB(base64: string): number {
    const base64String = base64.split(',')[1];
    const padding = (base64String.match(/=+$/) || [''])[0].length;
    return ((base64String.length * 3) / 4 - padding) / 1024;
  }

  private compressBase64Image(base64: string, maxSizeKB = 60): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('Canvas not supported'); return; }

        let quality = 0.8;
        let compressed = base64;
        let attempts = 0;

        while (attempts < 15) {
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          compressed = canvas.toDataURL('image/jpeg', quality);
          if (this.base64SizeKB(compressed) <= maxSizeKB) { resolve(compressed); return; }
          if (quality > 0.3) { quality -= 0.1; } else { width *= 0.9; height *= 0.9; }
          attempts++;
        }
        resolve(compressed);
      };
      img.onerror = () => reject('Image load failed');
      img.src = base64;
    });
  }

  private async prepareFile(base64: string): Promise<File> {
    const compressed = await this.compressBase64Image(base64, 60);
    const arr = compressed.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], `img-${Date.now()}.jpg`, { type: mime });
  }

  private async uploadImage(base64: string): Promise<string | null> {
    try {
      const file = await this.prepareFile(base64);
      const formData = new FormData();
      formData.append('files', file);
      const res: any = await firstValueFrom(
        this.commonApi.uploadImage(formData, 'exam/instruction', 'upload-image')
      );
      if (res?.status && res?.files?.length) { return res.files[0].s3Url; }
      return null;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  }

  private async replaceImagesWithUrls(html: string): Promise<string> {
    if (!html || !html.includes('<img')) return html;
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let updatedHtml = html;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const currentSrc = match[1];
      if (currentSrc.startsWith('data:image')) {
        const uploadRes = await this.uploadImage(currentSrc);
        if (uploadRes) {
          updatedHtml = updatedHtml.replace(`src="${currentSrc}"`, `src="${uploadRes}"`);
        }
      } else if (this.imageUrlMap.has(currentSrc)) {
        const originalUrl = this.imageUrlMap.get(currentSrc);
        updatedHtml = updatedHtml.replace(`src="${currentSrc}"`, `src="${originalUrl}"`);
      }
    }
    return updatedHtml;
  }

  /* ================= CRUD ================= */

  async submitInstruction() {
    if (this.instructionForm.invalid) {
      this.instructionForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const formValue = this.instructionForm.value;
    formValue.contentHtml = await this.replaceImagesWithUrls(formValue.contentHtml);

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

  async viewInstruction(row: any): Promise<void> {
    this.viewData = row;
    this.showViewModal = true;

    let html = row.contentHtml || '';
    html = await this.replaceDownloadUrls(html);
    this.viewContentHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewData = null;
    this.viewContentHtml = '';
  }

  async onRowSelected(row: any) {
    if (!this.permissionService.hasPermission('examContent:view')) return;
    this.viewData = row;
    this.showViewModal = true;

    let html = row.contentHtml || '';
    html = await this.replaceDownloadUrls(html);
    this.viewContentHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
