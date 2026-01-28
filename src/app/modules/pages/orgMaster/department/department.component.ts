import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

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

  loading: boolean = false;
  dataArray: any[] = [];
  totalRecords = 0;

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
    private alert: AlertService) {
    this.breadcrump.set([{ label: 'Department' }])
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




  deleteCenter(row: any) {
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


  // Create & Edit
  openCreate() {
    this.isEditMode = false;
    this.selectedRow = null;
    this.open();
  }

  editCenter(row: any) {
    this.isEditMode = true;
    this.selectedRow = row;
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

  // onSave(data: any) {
  //   if (this.isEditMode) {
  //     console.log('Update center', data);
  //   } else {
  //     console.log('Create center', data);
  //   }
  //   this.close();
  // }

  onSave(savedData: any) {
    if (this.isEditMode) {
      // Update existing row
      const index = this.dataArray.findIndex(d => d._id === savedData._id);
      if (index > -1) this.dataArray[index] = savedData;
    } else {
      // Add new row
      this.dataArray.push(savedData);
      this.totalRecords++;
    }

    this.close(); // hide modal
  }

}
