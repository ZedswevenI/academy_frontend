import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';
import { PermissionService } from '../../../../shared/permission.service';
import { ListStateService } from '../../../../shared/list-state.service';

const PACKAGE_LIST_STATE_KEY = 'package-list';

@Component({
  selector: 'app-package',
  standalone: false,
  templateUrl: './package.component.html',
  styleUrl: './package.component.scss'
})
export class PackageComponent implements OnInit {

  tenantId: any;
  loading = false;

  dataArray: any[] = [];
  totalRecords = 0;
  currentPage = 1;
  restoredPage = 1;

  columnsArray = [
    { key: 'packageCode', label: 'Code', sortable: false },
    { key: 'classNo', label: 'Class', sortable: false },
    { key: 'subjectName', label: 'Subject', sortable: false },
    { key: 'title', label: 'Title', sortable: false },
    { key: 'status', label: 'Status', sortable: false }
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('package:view'),
      callback: (row: any) => this.onView(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      show: () => !this.permissionService.hasPermission('package:edit'),
      callback: (row: any) => this.goToEdit(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-sliders',
      tooltip: 'Enable / Disable',
      color: '#6B7280',
      hoverColor: '#2563EB',
      show: () => !this.permissionService.hasAny(['package:enable', 'package:disable']),
      callback: (row: any) => this.openEnableDisableModal(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-key',
      tooltip: 'Change Password',
      color: '#6B7280',
      hoverColor: '#D97706',
      show: () => !this.permissionService.hasPermission('package:edit'),
      callback: (row: any) => this.openChangePasswordModal(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      show: () => !this.permissionService.hasPermission('package:delete'),
      callback: (row: any) => this.openDeleteModal(row)
    }
  ];

  // Modals state
  selectedPackage: any = null;
  packageToDelete: any = null;

  // ── Change Password modal ────────────────────────────
  changePasswordForm!: FormGroup;
  changePasswordLoading = false;
  packageForPasswordChange: any = null;

  // ── Enable/Disable modal ─────────────────────────────
  enableForm!: FormGroup;
  enableLoading = false;
  showAddNew = false;

  // Existing enablements list
  enablements: any[] = [];
  enablementsLoading = false;

  scope_options = [
    { label: 'Batch', value: 'BATCH' },
    { label: 'Student', value: 'STUDENT' }
  ];

  batches: any[] = [];
  students: any[] = [];
  selectedBatchIds: string[] = [];
  selectedStudentIds: string[] = [];
  selectAllBatches = false;
  selectAllStudents = false;
  studentBatchCode = '';
  studentsLoading = false;
  todayDate = new Date().toISOString().split('T')[0];
  minDisableDate = this.todayDate;

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    public router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private permissionService: PermissionService,
    private listStateService: ListStateService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Study Materials' }]);
    this.restoredPage = this.listStateService.consumePage(PACKAGE_LIST_STATE_KEY);
  }

  goToEdit(row: any): void {
    this.listStateService.savePage(PACKAGE_LIST_STATE_KEY, this.currentPage);
    this.router.navigate(['/app/package/create'], { state: { package: row } });
  }

  ngOnInit(): void {
    this.buildEnableForm();
    this.changePasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
    this.loadBatches();
    // this.fetchList(1, 10);
  }

  private buildEnableForm(): void {
    this.enableForm = this.fb.group({
      scope: ['BATCH'],
      enableDate: [''],
      disableDate: ['']
    });

    this.enableForm.get('scope')?.valueChanges.subscribe(() => {
      this.selectedBatchIds = [];
      this.selectedStudentIds = [];
      this.selectAllBatches = false;
      this.selectAllStudents = false;
      this.studentBatchCode = '';
      this.students = [];
    });

    this.enableForm.get('enableDate')?.valueChanges.subscribe((val: string) => {
      this.minDisableDate = val || this.todayDate;
      const disableDate = this.enableForm.get('disableDate')?.value;
      if (disableDate && disableDate < this.minDisableDate) {
        this.enableForm.get('disableDate')?.setValue('');
      }
    });
  }

  // ====================================================
  // LOAD BATCHES
  // ====================================================

  private loadBatches(): void {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.batches = res?.data || [];
        },
        error: () => { }
      });
  }

  loadStudentsByBatch(batchCode: string): void {
    if (!batchCode) return;

    this.studentsLoading = true;
    this.students = [];
    this.selectedStudentIds = [];
    this.selectAllStudents = false;
    this.studentBatchCode = batchCode;

    this.commonApi.fetchData(
      { tenantId: this.tenantId },
      'student',
      `list?page=1&limit=20&batchCode=${batchCode}`
    ).subscribe({
      next: (res: any) => {
        this.students = (res?.data || []).map((s: any) => ({
          label: `${s.student?.name} (${s.admissionNo})`,
          value: s.studentId
        }));
        this.studentsLoading = false;
      },
      error: () => {
        this.studentsLoading = false;
        this.alert.error('Error loading students');
      }
    });
  }

  // ====================================================
  // LIST
  // ====================================================

  fetchList(page: number, limit: number, search?: string): void {
    this.loading = true;
    const query = `list?page=${page}&limit=${limit}${search ? '&search=' + search : ''}`;

    this.commonApi.fetchData({ tenantId: this.tenantId }, 'ims/package', query)
      .subscribe({
        next: (res: any) => {
          this.dataArray = res?.data || [];
          this.totalRecords = res?.count || this.dataArray.length;
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading study materials');
          this.loading = false;
        }
      });
  }

  loadTableData(req: { page: number; pageSize: number; search?: string }): void {
    this.currentPage = req.page;
    this.fetchList(req.page, req.pageSize, req.search);
  }

  // ====================================================
  // VIEW
  // ====================================================

  viewEnablements: any[] = [];
  viewEnablementsLoading = false;

  onView(row: any): void {
    this.selectedPackage = row;
    this.viewEnablements = [];
    this.viewEnablementsLoading = true;
    this.commonApi.fetchData(
      { tenantId: this.tenantId, packageId: row.packageId },
      'ims/package',
      'list/enadisa'
    ).subscribe({
      next: (res: any) => {
        this.viewEnablements = res?.data || [];
        this.viewEnablementsLoading = false;
      },
      error: () => {
        this.viewEnablementsLoading = false;
      }
    });
    this.openModal('packageViewModal');
  }

  exportPackage(): void {
    if (!this.selectedPackage) return;
    const pkg = this.selectedPackage;
    const formatDate = (ts: number | null) => {
      if (!ts) return '';
      return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const wb = XLSX.utils.book_new();

    // Sheet 1: Package Details
    const infoRows = [
      { Field: 'Package Code', Value: pkg.packageCode || '' },
      { Field: 'Title', Value: pkg.title || '' },
      { Field: 'Class', Value: pkg.classNo || '' },
      { Field: 'Subject', Value: pkg.subjectName || '' },
      { Field: 'Description', Value: pkg.description || '' },
      { Field: 'Status', Value: pkg.status || '' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(infoRows), 'Details');

    // Sheet 2: Enablements
    const enableRows: any[] = [];
    for (const en of this.viewEnablements) {
      const targets = (en.resolvedTargets || []).map((t: any) => t.name).join(', ');
      enableRows.push({
        'Scope': en.scope || '',
        'Status': en.status || '',
        'Targets': targets,
        'Enable Date': formatDate(en.enableDate),
        'Disable Date': formatDate(en.disableDate),
      });
    }
    if (enableRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(enableRows), 'Enablements');
    }

    XLSX.writeFile(wb, `StudyMaterial_${pkg.packageCode || pkg.title}.xlsx`);
  }

  // ====================================================
  // ENABLE / DISABLE MODAL
  // ====================================================

  openEnableDisableModal(row: any): void {
    this.selectedPackage = row;
    this.showAddNew = false;
    this.enablements = [];
    this.resetEnableForm();
    this.fetchEnablements(row.packageId);
    this.openModal('packageEnableDisableModal');
  }

  private fetchEnablements(packageId: string): void {
    this.enablementsLoading = true;
    this.commonApi.fetchData(
      { tenantId: this.tenantId, packageId },
      'ims/package',
      'list/enadisa'
    ).subscribe({
      next: (res: any) => {
        this.enablements = res?.data || [];
        this.enablementsLoading = false;
      },
      error: () => {
        this.enablementsLoading = false;
        this.alert.error('Error loading enablements');
      }
    });
  }

  disableEnablement(enablement: any): void {
    const payload = {
      tenantId: this.tenantId,
      enablementId: enablement.enablementId
    };

    enablement._disabling = true;
    this.commonApi.fetchData(payload, 'ims/package', 'disable')
      .subscribe({
        next: (res: any) => {
          enablement._disabling = false;
          if (res?.status) {
            this.alert.success('Enablement disabled successfully');
            this.fetchEnablements(this.selectedPackage.packageId);
            this.fetchList(1, 5);
          }
        },
        error: () => {
          enablement._disabling = false;
          this.alert.error('Error disabling enablement');
        }
      });
  }

  toggleAddNew(): void {
    this.showAddNew = !this.showAddNew;
    if (this.showAddNew) {
      this.resetEnableForm();
    }
  }

  private resetEnableForm(): void {
    this.enableForm.reset({ scope: 'BATCH', enableDate: '', disableDate: '' });
    this.selectedBatchIds = [];
    this.selectedStudentIds = [];
    this.selectAllBatches = false;
    this.selectAllStudents = false;
    this.studentBatchCode = '';
    this.students = [];
    this.enableLoading = false;
  }

  submitEnable(): void {
    const f = this.enableForm.value;
    const scope = f.scope;
    const targetIds = scope === 'BATCH' ? this.selectedBatchIds : this.selectedStudentIds;

    if (!scope || !targetIds.length || !f.enableDate || !f.disableDate) {
      this.alert.error('Please fill all required fields and select at least one target');
      return;
    }

    const payload = {
      tenantId: this.tenantId,
      packageId: this.selectedPackage.packageId,
      scope: scope,
      targetIds: targetIds,
      enableDate: new Date(f.enableDate).getTime(),
      disableDate: new Date(f.disableDate).getTime()
    };

    this.enableLoading = true;
    this.commonApi.fetchData(payload, 'ims/package', 'enable')
      .subscribe({
        next: (res: any) => {
          this.enableLoading = false;
          if (res?.status) {
            this.alert.success('Study material enabled successfully');
            this.showAddNew = false;
            this.resetEnableForm();
            this.fetchEnablements(this.selectedPackage.packageId);
            this.fetchList(1, 10);
          }
        },
        error: () => {
          this.enableLoading = false;
          this.alert.error('Error enabling package');
        }
      });
  }

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  openChangePasswordModal(row: any): void {
    this.packageForPasswordChange = row;
    this.changePasswordForm.reset({ password: '' });
    this.openModal('packageChangePasswordModal');
  }

  confirmChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }
    const payload = {
      tenantId: this.tenantId,
      packageId: this.packageForPasswordChange.packageId,
      userId: localStorage.getItem('userId'),
      password: this.changePasswordForm.value.password
    };

    this.changePasswordLoading = true;
    this.commonApi.fetchData(payload, 'ims/package', 'password/change')
      .subscribe({
        next: (res: any) => {
          this.changePasswordLoading = false;
          if (res?.status) {
            this.alert.success('Password updated successfully');
            this.closeModal('packageChangePasswordModal');
          } else {
            this.alert.error(res?.message || 'Error updating password');
          }
        },
        error: (err: any) => {
          this.changePasswordLoading = false;
          this.alert.error(err?.error?.message || 'Error updating password');
        }
      });
  }

  // ====================================================
  // DELETE
  // ====================================================

  openDeleteModal(row: any): void {
    this.packageToDelete = row;
    this.openModal('packageDeleteModal');
  }

  confirmDelete(): void {
    if (!this.packageToDelete) return;

    this.commonApi.fetchData(
      { tenantId: this.tenantId, packageId: this.packageToDelete.packageId },
      'ims/package', 'delete'
    ).subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Study material deleted successfully');
          this.dataArray = this.dataArray.filter(d => d.packageId !== this.packageToDelete.packageId);
          this.totalRecords = this.dataArray.length;
          this.packageToDelete = null;
        }
      },
      error: () => this.alert.error('Error deleting package')
    });
  }

  // ====================================================
  // BATCH / STUDENT MULTI-SELECT
  // ====================================================

  toggleBatch(value: string, checked: boolean): void {
    if (checked) {
      this.selectedBatchIds = [...this.selectedBatchIds, value];
    } else {
      this.selectedBatchIds = this.selectedBatchIds.filter(id => id !== value);
      this.selectAllBatches = false;
    }
    this.selectAllBatches = this.selectedBatchIds.length === this.batches.length;
  }

  toggleAllBatches(checked: boolean): void {
    this.selectAllBatches = checked;
    this.selectedBatchIds = checked ? this.batches.map(b => b.batchCode) : [];
  }

  isBatchSelected(value: string): boolean {
    return this.selectedBatchIds.includes(value);
  }

  toggleStudent(value: string, checked: boolean): void {
    if (checked) {
      this.selectedStudentIds = [...this.selectedStudentIds, value];
    } else {
      this.selectedStudentIds = this.selectedStudentIds.filter(id => id !== value);
      this.selectAllStudents = false;
    }
    this.selectAllStudents = this.selectedStudentIds.length === this.students.length;
  }

  toggleAllStudents(checked: boolean): void {
    this.selectAllStudents = checked;
    this.selectedStudentIds = checked ? this.students.map(s => s.value) : [];
  }

  isStudentSelected(value: string): boolean {
    return this.selectedStudentIds.includes(value);
  }

  // ====================================================
  // HELPERS
  // ====================================================

  downloadFile(url: string): void {
    this.commonApi.downloadByUrl({ url }, 'ims', 'download').subscribe({
      next: (res: any) => {
        const fileName = url.split('/').pop() || 'download';
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(res);
        a.href = objectUrl;
        a.download = fileName;
        a.click();
      },
      error: () => this.alert.error('Error downloading file')
    });
  }

  formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
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

  onRowSelected(row: any) {
    // Row click bypasses the View icon's `show` gate — same open-fetch-modal
    // path as onView(), so it needs the same check independently.
    if (!this.permissionService.hasPermission('package:view')) return;
     this.selectedPackage = row;
    this.viewEnablements = [];
    this.viewEnablementsLoading = true;
    this.commonApi.fetchData(
      { tenantId: this.tenantId, packageId: row.packageId },
      'ims/package',
      'list/enadisa'
    ).subscribe({
      next: (res: any) => {
        this.viewEnablements = res?.data || [];
        this.viewEnablementsLoading = false;
      },
      error: () => {
        this.viewEnablementsLoading = false;
      }
    });
    this.openModal('packageViewModal');
  }
}
