import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../service/auth/auth.service';
import { PermissionService } from '../../../../shared/permission.service';

@Component({
  selector: 'app-knowledge-list',
  standalone: false,
  templateUrl: './knowledge-list.component.html',
  styleUrl: './knowledge-list.component.scss'
})
export class KnowledgeListComponent implements OnInit {

  filterForm!: FormGroup;
  tenantId: any;
  deleteModalVisible = false;
  deleteTarget: any = null;
  deleteMessage = '';

  columnsArray = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'classNo', label: 'Class', sortable: false },
    { key: 'subjectName', label: 'Subject', sortable: false },
    { key: 'batchName', label: 'Batch', sortable: false },
    { key: 'availableUntilDate', label: 'Available Until', sortable: true }
  ];

  dataArray: any[] = [];
  totalRecords = 0;
  loading = false;

  // Track current pagination so delete reloads the same page
  currentPage = 1;
  currentPageSize = 10;

  // Last used filter + pagination — in-memory only, survives modal actions
  private lastRequest: { page: number; pageSize: number; search?: string } = { page: 1, pageSize: 10 };

  class_options = Array.from({ length: 8 }, (_, i) => ({
    label: (i + 6).toString(),
    value: i + 6
  }));

  subjects: any[] = [];
  batch_options: any[] = [];

  actions = [
    {
      type: 'icon', icon: 'fa-regular fa-eye',
      tooltip: 'View',
       color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('knowledge:view'),
      callback: (row: any) => this.view(row)
    },
    {
      type: 'icon', icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('knowledge:edit'),
      callback: (row: any) => this.edit(row)
    },
    {
      type: 'icon', icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#ee384a',
      show: () => !this.permissionService.hasPermission('knowledge:delete'),
      callback: (row: any) => this.openDelete(row)
    }
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private fb: FormBuilder,
    private authService: AuthService,
    private permissionService: PermissionService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrumb.set([{ label: 'Library' }]);
  }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      classNo: [''],
      subjectId: [''],
      batchId: ['']
    });

    const role = this.authService.getRole();
    if (role === 'L4') {
      this.loadTeacherMaps();
    } else {
      this.loadSubjects();
      this.loadBatches();
    }
  }

  private loadTeacherMaps(): void {
    const staffId = this.authService.getStaffId();
    this.commonApi.fetchData({ tenantId: this.tenantId, staffId }, 'teacher', 'getstaffmaps').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          const data = res.data;

          // Classes
          this.class_options = (data.classes || []).map((c: any) => ({
            label: c.classNo.toString(),
            value: c.classNo
          }));

          // Subjects
          this.subjects = (data.subjects || []).map((s: any) => ({
            label: s.subjectName,
            value: s._id
          }));

          // Batches
          this.batch_options = (data.batches || []).map((b: any) => ({
            label: `${b.batchName} (${b.batchCode})`,
            value: b.batchCode
          }));
        }
      }
    });
  }

  // ── Dropdowns ──────────────────────────────────────────────────────────────

  private loadSubjects(): void {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full')
      .subscribe((res: any) => {
        this.subjects = (res?.data || []).map((s: any) => ({
          label: s.subjectName,
          value: s._id
        }));
      });
  }

  private loadBatches(): void {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe((res: any) => {
        this.batch_options = (res?.data || []).map((b: any) => ({
          label: `${b.batchName} (${b.batchCode})`,
          value: b.batchCode
        }));
      });
  }

  // ── Fetch list ─────────────────────────────────────────────────────────────

  fetchTableData(req: { page: number; pageSize: number; search?: string }): void {
    // Store so delete / back-navigation reloads the same page + filters
    this.currentPage = req.page;
    this.currentPageSize = req.pageSize;
    this.lastRequest = { ...req };

    const f = this.filterForm.value;
    this.loading = true;

    let endpoint = `list?page=${req.page}&limit=${req.pageSize}`;
    if (f.classNo) endpoint += `&classNo=${f.classNo}`;
    if (f.subjectId) endpoint += `&subjectId=${f.subjectId}`;
    if (f.batchId) endpoint += `&batchId=${f.batchId}`;
    if (req.search) endpoint += `&search=${req.search}`;

    this.commonApi.fetchData({ tenantId: this.tenantId }, 'institue/library', endpoint)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.totalRecords = res.total || res.count || 0;
            this.dataArray = (res.data || []).map((d: any) => ({
              ...d,
              subjectName: d.subjectId?.subjectName || '',
              batchName: d.batchIds?.length ? d.batchIds.join(', ') : '-',
              availableUntilDate: d.availableUntil
                ? new Date(d.availableUntil).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })
                : '-'
            }));
          }
        },
        error: () => { this.loading = false; }
      });
  }

  // Separate handler for filter button — always resets to page 1
  applyFilter(): void {
    this.fetchTableData({ page: 1, pageSize: this.currentPageSize });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  openDelete(row: any): void {
    this.deleteTarget = row;
    this.deleteMessage = `Are you sure you want to delete "${row.title}"?`;
    this.deleteModalVisible = true;
  }

  onDeleteModalClosed(confirmed: boolean): void {
    this.deleteModalVisible = false;
    if (!confirmed || !this.deleteTarget) return;

    this.commonApi.fetchData(
      { tenantId: this.tenantId, materialId: this.deleteTarget.materialId },
      'institue/library', 'delete'
    ).subscribe((res: any) => {
      if (res?.status) {
        this.deleteTarget = null;

        // If this was the last item on a page > 1, go back one page
        const remainingOnPage = this.dataArray.length - 1;
        const reloadPage = remainingOnPage === 0 && this.currentPage > 1
          ? this.currentPage - 1
          : this.currentPage;

        this.fetchTableData({ ...this.lastRequest, page: reloadPage });
      }
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  view(row: any): void {
    this.router.navigate(['/app/knowledge/view'], { state: { material: row } });
  }

  edit(row: any): void {
    this.router.navigate(['/app/knowledge/create'], { state: { material: row } });
  }
  
  onRowSelected(row: any) {
   this.router.navigate(['/app/knowledge/view'], { state: { material: row } });
  }

}