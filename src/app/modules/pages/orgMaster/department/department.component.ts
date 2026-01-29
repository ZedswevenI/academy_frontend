import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-department',
  standalone: false,
  templateUrl: './department.component.html',
  styleUrl: './department.component.scss'
})
export class DepartmentComponent {
  modalVisible = false;
  isEditMode: boolean = false;
  selectedRow: any = null;
  centerForm!: FormGroup;

  loading: boolean = false;
  dataArray: any[] = [];
  totalRecords = 0;

  deleteTarget: any;
  deleteMessage: string = '';
  deleteTitle: string = '';

  columnsArray = [
    { key: 'departmentName', label: 'Department Name', sortable: false },
    { key: 'departmentCode', label: 'Code', sortable: false },
    { key: 'isActive', label: 'Active', sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-edit',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editCenter(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc3545',
      callback: (row: any) => this.deleteCenter(row)
    },
  ]

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Department' }])
  }

  ngOnInit() {
    this.centerForm = this.fb.group({
      departmentName: ['', [Validators.required]],
      departmentCode: ['', [Validators.required]],
      isActive: [false]
    })
  }

  fetchDepartmentData(params: {
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

    // Build query string
    const queryString = Object.keys(query)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
      )
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'ims', `dept/list?${queryString}`).subscribe({
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




  // deleteCenter(row: any) {
  //   this.openModal()
  // }
  // openModal() {
  //   this.modalVisible = true;
  // }
  // onModalClosed(result: boolean) {
  //   console.log('Modal closed. Confirmed:', result);
  //   this.modalVisible = false;
  //   if (result) {
  //     alert('User confirmed the action!');
  //   } else {
  //     alert('User cancelled the action.');
  //   }
  // }

  deleteCenter(row: any) {
    this.deleteTarget = row;
    this.deleteTitle = `Delete Department`
    this.deleteMessage = `Are you sure you want to delete department "${row.departmentName}"?`;
    this.modalVisible = true;
  }

  onModalClosed(confirmed: boolean) {
    if (!confirmed || !this.deleteTarget) {
      this.deleteTarget = null;
      return;
    }

    const deleteBody = {
      entiId: localStorage.getItem('tenantId'),
      departmentId: this.deleteTarget._id
    };

    this.commonApi.fetchData(deleteBody, 'ims', 'dept/delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Department deleted successfully!');
          this.fetchDepartmentData({ page: 1, pageSize: 5, search: '', sortKey: '', sortDirection: 'asc' });
        } else {
          this.alert.error(res?.message || 'Failed to delete department');
        }
      },
      error: (err) => {
        this.alert.error(err?.message || 'Server error while deleting department');
      }
    });

    this.modalVisible = false;
    this.deleteTarget = null;
  }


  // Create & Edit
  openCreate() {
    this.isEditMode = false;
    this.selectedRow = null;

    this.centerForm.reset({
      isActive: false
    });

    this.open();
  }

  editCenter(row: any) {
    this.isEditMode = true;
    this.selectedRow = row;
    this.centerForm.patchValue({
      departmentName: row.departmentName,
      departmentCode: row.departmentCode,
      isActive: row.isActive
    });
    this.open();
  }

  open() {
    const modal = new (window as any).bootstrap.Modal(
      document.getElementById('centerModal')
    );
    modal.show();
  }

  close() {
    const modalEl = document.getElementById('centerModal');
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
  }

  submit() {
    console.log('Form value before create:', this.centerForm.value);

    if (this.isEditMode) {
      const form = this.centerForm.value;
      const editingId = this.selectedRow._id;
      const payload = {
        ...form,
        entiId: localStorage.getItem('tenantId'),
        departmentId: editingId
      };
      this.commonApi.fetchData(payload, 'ims', 'dept/update').subscribe({
        next: (res: any) => {
          if (!res.status) {
            this.alert.error(res.message || 'Failed to update department');
            return;
          }
          this.alert.success('Department updated successfully');
          this.router.navigate(['/app/org-master/department']);
          this.close();
          this.fetchDepartmentData({ page: 1, pageSize: 5, search: '', sortKey: '', sortDirection: 'asc' });
        },
        error: () => this.alert.error('Server error while updating Department')
      });
    } else {
      const form = this.centerForm.value;
      const payload = {
        departmentName: form.departmentName,
        departmentCode: form.departmentCode,
        isActive: form.isActive ? 'Active' : 'Inactive',
        entiId: localStorage.getItem('tenantId'),
      };
      this.commonApi.fetchData(payload, 'ims', 'dept/create').subscribe({
        next: (res: any) => {
          console.log('create:', res)
          if (!res.status) {
            this.alert.error(res.message || 'Failed to create Department');
            return;
          }
          this.alert.success('Department created successfully');
          this.router.navigate(['/app/org-master/department']);
          this.close();
          this.fetchDepartmentData({ page: 1, pageSize: 5, search: '', sortKey: '', sortDirection: 'asc' });
        },
        error: () => this.alert.error('Server error while Create department')
      });
    }

  }
}
