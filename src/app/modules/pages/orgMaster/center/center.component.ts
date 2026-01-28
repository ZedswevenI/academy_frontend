import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-center',
  standalone: false,
  templateUrl: './center.component.html',
  styleUrl: './center.component.scss'
})
export class CenterComponent {
  modalVisible = false;
  isEditMode: boolean = false;
  deleteTarget: any;

  loading: boolean = false;
  dataArray: any[] = [];
  totalRecords = 0;
  row: any;
  deleteMessage: string = '';
  deleteTitle: string = '';

  columnsArray = [
    { key: 'centerName', label: 'Center Name', sortable: false },
    { key: 'centerCode', label: 'Code', sortable: false },
    { key: 'city', label: 'City', sortable: false },
    { key: 'state', label: 'State', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
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
    this.breadcrump.set([{ label: 'Center' }])
  }

  fetchCenterData(params: {
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

    this.commonApi.fetchData(body, 'ims/center', `list?${queryString}`).subscribe({
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

  editCenter(row: any) {
    // this.router.navigate(['/app/org-master/center/add'], {
    //   state: {
    //     isEditMode: true,
    //     rowData: row   
    //   }
    // });
    this.router.navigate(['/app/org-master/center/add'],
      {
        state: {
          isEditMode: true,
          rowData: row
        }
      });
  }

  addCenter() {
    this.router.navigate(['/app/org-master/center/add'],
      {
        state: {
          isEditMode: false,
        }
      });
  }



  deleteCenter(row: any) {
    this.deleteTarget = row;
    this.deleteTitle = `Delete Center`
    this.deleteMessage = `Are you sure you want to delete center "${row.centerName}"?`;
    this.modalVisible = true;
  }

  onModalClosed(confirmed: boolean) {
    if (!confirmed || !this.deleteTarget) {
      this.deleteTarget = null;
      return;
    }

    const deleteBody = {
      entiId: localStorage.getItem('tenantId'),
      recId: this.deleteTarget._id
    };

    this.commonApi.fetchData(deleteBody, 'ims/center', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Center deleted successfully!');
          this.fetchCenterData({ page: 1, pageSize: 5, search: '', sortKey: '', sortDirection: 'asc' });
        } else {
          this.alert.error(res?.message || 'Failed to delete center');
        }
      },
      error: (err) => {
        this.alert.error(err?.message || 'Server error while deleting center');
      }
    });

    this.modalVisible = false;
    this.deleteTarget = null;
  }

}
