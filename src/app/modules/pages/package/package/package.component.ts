import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

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

  columnsArray = [
    { key: 'packageCode', label: 'Code', sortable: true },
    { key: 'classNo', label: 'Class', sortable: false },
    { key: 'subjectName', label: 'Subject', sortable: false },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', sortable: false }
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.onView(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      callback: (row: any) => this.router.navigate(['/app/package/create'], { state: { package: row } })
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-toggle-on',
      tooltip: 'Enable',
      color: '#6B7280',
      hoverColor: '#2563EB',
      callback: (row: any) => this.openEnableModal(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-toggle-off',
      tooltip: 'Disable',
      color: '#6B7280',
      hoverColor: '#DC2626',
      callback: (row: any) => row.enablementId ? this.openDisableModal(row) : null
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      callback: (row: any) => this.openDeleteModal(row)
    }
  ];



  // Modals state
  selectedPackage: any = null;
  packageToDelete: any = null;
  packageToDisable: any = null;

  // ── Enable modal ───────────────────────────────────────
  enableForm!: FormGroup;
  enableLoading = false;

  // Replace scope_options — remove STUDENT as separate, handle both
  scope_options = [
    { label: 'Batch', value: 'BATCH' },
    { label: 'Student', value: 'STUDENT' }
  ];

  // Add student list
  students: any[] = [];
  selectAllBatches = false;
  selectAllStudents = false;

  // Selected arrays (manage manually instead of form control)
  selectedBatchIds: string[] = [];
  selectedStudentIds: string[] = [];

  target_options: any[] = [];
  target_label = 'Target';
  batches: any[] = [];

  // Add these new properties
  studentBatchCode = '';   // selected batch for student loading
  studentsLoading = false;

  // Replace loadStudents — now takes batchCode
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

  // Update openEnableModal — reset studentBatchCode too


  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Packages' }]);
  }

  ngOnInit(): void {
    this.buildEnableForm();
    this.loadBatches();
    this.fetchList(1, 10);
  }

  private buildEnableForm(): void {
    this.enableForm = this.fb.group({
      scope: ['BATCH'],
      targetIds: [[]],
      enableDate: [''],
      disableDate: ['']
    });

    this.enableForm.get('scope')?.valueChanges.subscribe(val => {
      this.onScopeChange(val);
    });

    // Init target options
    this.onScopeChange('BATCH');
  }

  // ====================================================
  // LOAD BATCHES
  // ====================================================

  private loadBatches(): void {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.batches = res?.data || [];
          this.onScopeChange(this.enableForm.get('scope')?.value || 'BATCH');
        },
        error: () => { }
      });
  }

  private onScopeChange(scope: string): void {
    this.enableForm.patchValue({ targetIds: [] }, { emitEvent: false });

    if (scope === 'BATCH') {
      this.target_label = 'Batch';
      this.target_options = this.batches.map(b => ({
        label: b.batchName,
        value: b.batchCode
      }));
    } else {
      this.target_label = 'Student';
      this.target_options = [];
    }
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
          this.alert.error('Error loading packages');
          this.loading = false;
        }
      });
  }

  loadTableData(req: { page: number; pageSize: number; search?: string }): void {
    this.fetchList(req.page, req.pageSize, req.search);
  }

  // ====================================================
  // VIEW
  // ====================================================

  onView(row: any): void {
    this.selectedPackage = row;
    this.openModal('packageViewModal');
  }

  // ====================================================
  // DISABLE
  // ====================================================

  openDisableModal(row: any): void {
    this.packageToDisable = row;
    this.openModal('packageDisableModal');
  }

  confirmDisable(): void {
    if (!this.packageToDisable?.enablementId) return;

    const payload = {
      tenantId: this.tenantId,
      enablementId: this.packageToDisable.enablementId
    };

    this.commonApi.fetchData(payload, 'ims/package', 'disable')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Package disabled successfully');
            this.packageToDisable = null;
            this.fetchList(1, 10);
          }
        },
        error: () => this.alert.error('Error disabling package')
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
          this.alert.success('Package deleted successfully');
          this.dataArray = this.dataArray.filter(d => d.packageId !== this.packageToDelete.packageId);
          this.totalRecords = this.dataArray.length;
          this.packageToDelete = null;
        }
      },
      error: () => this.alert.error('Error deleting package')
    });
  }

  // ====================================================
  // HELPERS
  // ====================================================

  hasEnablement(row: any): boolean {
    return !!row.enablementId;
  }

  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) new (window as any).bootstrap.Modal(el).show();
  }

  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }

  private loadStudents(): void {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'student', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.students = (res?.data || []).map((s: any) => ({
            label: `${s.student?.name} (${s.admissionNo})`,
            value: s.studentId
          }));
        },
        error: () => { }
      });
  }

  // Call loadStudents() inside ngOnInit alongside loadBatches()

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

  openEnableModal(row: any): void {
    this.selectedPackage = row;
    this.selectedBatchIds = [];
    this.selectedStudentIds = [];
    this.selectAllBatches = false;
    this.selectAllStudents = false;
    this.studentBatchCode = '';
    this.students = [];
    this.enableForm.reset({ scope: 'BATCH', enableDate: '', disableDate: '' });
    this.openModal('packageEnableModal');
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
            this.alert.success('Package enabled successfully');
            this.closeModal('packageEnableModal');
            this.fetchList(1, 10);
          }
        },
        error: () => {
          this.enableLoading = false;
          this.alert.error('Error enabling package');
        }
      });
  }
}