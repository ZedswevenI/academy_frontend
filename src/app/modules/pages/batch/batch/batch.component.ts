import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { forkJoin } from 'rxjs';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

@Component({
  selector: 'app-batch',
  standalone: false,
  templateUrl: './batch.component.html',
  styleUrl: './batch.component.scss'
})
export class BatchComponent {
  batchForm!: FormGroup;
  editorForm!: FormGroup;
  showAssignPanel: boolean = false;
  showEditorModal: boolean = false;
  modalVisible = false;
  loading: boolean = false;
  editorMode: 'create' | 'edit' = 'create';

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  status_options = [
    { label: 'All', value: 'All' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Active', value: 'Active' },
    { label: 'Close', value: 'Close' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  ay_options = [
    { label: 'All', value: 'All' },
    { label: '2024-2025', value: '2024-2025' },
    { label: '2025-2026', value: '2025-2026' },
    { label: '2026-2027', value: '2026-2027' },
  ];

  program_options = [];
  center_options = [];

  columnsArray = [
    { key: 'batchName', label: 'Batch Name', sortable: true },
    { key: 'batchCode', label: 'Batch Code', sortable: true },
    { key: 'academicYear', label: 'AY', sortable: true },
    { key: 'programName', label: 'Program', sortable: false },
    { key: 'centerName', label: 'Center', sortable: false },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'studentCount', label: 'Students', sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewbatch(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editbatch(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-users-gear',
      tooltip: 'Add Faculty',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.add(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-user-plus',
      tooltip: 'Assign Student',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.assign(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-lock',
      tooltip: 'Close Batch',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.close(row)
    },
  ]

  constructor(
    private breadcrumb: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService) {
    this.breadcrumb.set([{ label: 'Batch' }]);
  }

  ngOnInit(): void {
    this.initForms();
    this.loadAllLookupsAndInit();
  }
  // -------------- Forms ----------------
  initForms() {
    this.batchForm = this.fb.group({
      search: [''],
      status: [''],
      ay: [''],
      program: [''],
      center: ['']
    });

    this.editorForm = this.fb.group({
      batchId: [null],
      batchName: ['', [Validators.required]],
      batchCode: ['', [Validators.required]],
      academicYear: ['', [Validators.required]],
      programId: ['', [Validators.required]],
      programName: [''],
      programCode: [''],
      centerId: ['', [Validators.required]],
      centerName: [''],
      centerCode: [''],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      status: ['ACTIVE', [Validators.required]],
      remarks: [''],
    });
  }

  // List
  fetchBatchData(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  }) {
    this.loading = true;

    // Pagination & Sort
    let sortParam = '';
    if (params.sortKey) {
      sortParam =
        params.sortDirection === 'desc'
          ? `-${params.sortKey}`
          : params.sortKey;
    }

    const query: any = {
      page: params.page,
      limit: params.pageSize
    };
    if (sortParam) query.sort = sortParam;
    if (params.search) query.search = params.search;

    //filter (optional)
    // if (this.statusFilter && this.statusFilter !== 'all') {
    //   query.status = this.statusFilter;
    // }
    // if (this.selectedProgram) {
    //   query.programId = this.selectedProgram;
    // }
    // if (this.selectedCenter) {
    //   query.centerId = this.selectedCenter;
    // }

    // Build query string
    const queryString = Object.keys(query)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
      )
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'batch', `list?${queryString}`).subscribe({
      next: (res: any) => {
        this.dataArray = res.data;
        this.totalRecords = res?.count || 0;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.alert.error('Error loading admissions');
      }
    });
  }

  //Options {Program, Center}  
  loadAllLookupsAndInit() {
    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.loading = true;

    forkJoin({
      program: this.commonApi.fetchData(body, 'ims', 'program/list?list=full'),
      center: this.commonApi.fetchData(body, 'ims', 'center/list?list=full'),
    }).subscribe({
      next: ({ program, center }) => {
        this.program_options = program.data || [];
        this.center_options = center.data || [];
      },
      error: (err) => {
        this.loading = false;
        this.alert.error(`Unable to load initial data!`);
      }
    });
  }


  viewbatch(row: any) {
    // this.router.navigate(['/app/batch/view'])
    const b = row?._raw || row;
    this.router.navigate(['/app/batch/view', b?.batchId]);
  }

  private epochMsToDateInput(ms: any): string {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '';
    const d = new Date(n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }


  editbatch(row: any) {
    // const b = row?._raw || row;
    // this.editorMode = 'edit';
    // this.editorForm.patchValue({
    //   batchId: b?.batchId,
    //   batchName: b?.batchName,
    //   batchCode: b?.batchCode,
    //   academicYear: b?.academicYear,
    //   programId: b?.programId,
    //   programName: b?.programName,
    //   programCode: b?.programCode,
    //   centerId: b?.centerId,
    //   centerName: b?.centerName,
    //   centerCode: b?.centerCode,
    //   startDate: this.epochMsToDateInput(b?.startDate),
    //   endDate: this.epochMsToDateInput(b?.endDate),
    //   status: b?.status || 'ACTIVE',
    //   remarks: b?.remarks || '',
    // });

    // const count = Number(b?.studentCount || 0);
    // if (count > 0) {
    //   this.editorForm.get('programId')?.disable();
    //   this.editorForm.get('centerId')?.disable();
    //   this.editorForm.get('academicYear')?.disable();
    // } else {
    //   this.editorForm.get('programId')?.enable();
    //   this.editorForm.get('centerId')?.enable();
    //   this.editorForm.get('academicYear')?.enable();
    // }

    // this.showEditorModal = true;
    this.router.navigate(['/app/batch/edit'])
  }

  closeEditorModal() {
    this.showEditorModal = false;
  }

  // ---------------- SAVE ----------------
  saveBatch() {
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      this.alert.error('Please fill all required fields');
      return;
    }

    const v = this.editorForm.getRawValue() || {};

    const startMs = this.dateToEpochMs(v.startDate);
    const endMs = this.dateToEpochMs(v.endDate);

    if (startMs >= endMs) {
      this.alert.error('End Date must be after Start Date');
      return;
    }

    const payload: any = {
      entiId: localStorage.getItem('tenantId'),
      batchName: safeTrim(v.batchName),
      batchCode: safeTrim(v.batchCode),
      academicYear: safeTrim(v.academicYear),
      programId: safeTrim(v.programId),
      programName: safeTrim(v.programName) || null,
      programCode: safeTrim(v.programCode) || null,
      centerId: safeTrim(v.centerId),
      centerName: safeTrim(v.centerName) || null,
      centerCode: safeTrim(v.centerCode) || null,
      startDate: startMs,
      endDate: endMs,
      status: safeTrim(v.status) || 'ACTIVE',
      remarks: safeTrim(v.remarks) || null,
    };

    const endpoint = this.editorMode === 'create' ? 'create' : 'update';
    if (this.editorMode === 'edit') payload.batchId = safeTrim(v.batchId);

    this.loading = true;
    this.commonApi.fetchData(payload, 'batch', endpoint).subscribe({
      next: () => {
        this.loading = false;
        this.alert.success(
          this.editorMode === 'create'
            ? 'Batch created successfully'
            : 'Batch updated successfully'
        );
        this.showEditorModal = false;
        this.refresh();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Operation failed');
      },
    });
  }

  refresh() {
    this.fetchBatchData({ page: 1, pageSize: 20 });
  }

  private dateToEpochMs(dateStr: any): number {
    const s = safeTrim(dateStr);
    if (!s) return 0;
    // Forces midnight local time for the date picker string
    const d = new Date(`${s}T00:00:00`);
    const t = d.getTime();
    return Number.isFinite(t) ? t : 0;
  }


  add(row: any) {
    // this.router.navigate(['/app/batch/addFaculty'])
    this.router.navigate(['/app/batch/view'])
  }
  assign(row: any) {
    this.router.navigate(['/app/batch/assign'])
  }


  close(row: any) {
    // this.router.navigate(['/app/batch/close'])
    this.openModal()
  }
  openModal() {
    this.modalVisible = true;
  }
  onModalClosed(result: boolean) {
    console.log('Modal closed. Confirmed:', result);
    this.modalVisible = false;
    if (result) {
      alert('User confirmed the action!');
    } else {
      alert('User cancelled the action.');
    }
  }

}
