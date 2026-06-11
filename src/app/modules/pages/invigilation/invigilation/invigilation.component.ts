import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { InvigilationPrintService } from '../invigilationPrint.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-invigilation',
  standalone: false,
  templateUrl: './invigilation.component.html',
  styleUrl: './invigilation.component.scss'
})
export class InvigilationComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId') || '';
  filterFromDate = '';
  filterToDate = '';
  filterSession = '';
  filterExamName = '';
  records: any[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loading = false;
  deleteTarget: any = null;
  deleteLoading = false;
  printLoadingId: string | null = null;
  readonly sessionOptions = [{ value: 'MORNING', label: 'Morning' }, { value: 'AFTERNOON', label: 'Afternoon' }];
  columnsArray = [
    { key: 'examName', label: 'Exam Name', sortable: true },
    { key: 'examDateFormatted', label: 'Date', sortable: false },
    { key: 'examDay', label: 'Day', sortable: false },
    { key: 'session', label: 'Session', sortable: false },
    { key: 'examStartTime', label: 'Exam Time', sortable: false },
    { key: 'roomCount', label: 'Rooms', sortable: false }
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.view(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      callback: (row: any) => this.edit(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-print',
      tooltip: 'Print',
      color: '#6B7280',
      hoverColor: '#0891B2',
      callback: (row: any) => this.print(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#DC2626',
      callback: (row: any) => this.confirmDelete(row)
    }
  ];

  constructor(private commonApi: CommonapiService, private alert: AlertService, private printSvc: InvigilationPrintService, private router: Router) {}

  ngOnInit(): void {}

  loadTableData(req: { page: number; pageSize: number; search?: string }): void {
    this.page = req.page;
    this.limit = req.pageSize;
    this.load(req.page, req.pageSize, req.search);
  }

  load(page: any, pageSize: any, search: any): void {
    this.loading = true;
    const payload: any = {
      entiId: this.tenantId,
      page: page,
      limit: pageSize
    };
    // if (this.filterFromDate) payload.fromDate = new Date(this.filterFromDate).setHours(0, 0, 0, 0);
    // if (this.filterToDate) payload.toDate = new Date(this.filterToDate).setHours(23, 59, 59, 999);
    if (this.filterFromDate) {
      const [y, m, d] = this.filterFromDate.split('-').map(Number);
      payload.fromDate = Date.UTC(y, m - 1, d);
    }
    if (this.filterToDate) {
      const [y, m, d] = this.filterToDate.split('-').map(Number);
      payload.toDate = Date.UTC(y, m - 1, d + 1) - 1;
    }
    if (this.filterSession) payload.session = this.filterSession;
    if (this.filterExamName) payload.examName = this.filterExamName;
    this.commonApi.fetchData(payload, 'invigi', 'list').subscribe({
      next: (res: any) => {
        this.records = res.data || [];
        this.total = res.total || 0;
        this.loading = false;
      },
      error: () => {
        this.alert.error('Failed to load invigilation records');
        this.loading = false;
      }
    });
  }

  clearFilter(): void {
    this.filterFromDate = '';
    this.filterToDate = '';
    this.filterSession = '';
    this.filterExamName = '';
    this.page = 1;
    this.load(1, this.limit, undefined);
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  create(): void {
    this.router.navigate(['/app/invigilation/create']);
  }

  edit(r: any): void {
    this.router.navigate(['/app/invigilation/edit', r._id]);
  }

  view(r: any): void {
    this.router.navigate(['/app/invigilation/view', r._id]);
  }

  confirmDelete(r: any): void {
    this.deleteTarget = r;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteLoading = true;
    this.commonApi.fetchData({ entiId: this.tenantId }, 'invigi', `delete/${this.deleteTarget._id}`).subscribe({
      next: () => {
        this.alert.success('Invigilation deleted');
        this.deleteTarget = null;
        this.deleteLoading = false;
        this.load(this.page, this.limit, '');
      },
      error: () => {
        this.alert.error('Failed to delete');
        this.deleteLoading = false;
      }
    });
  }

  print(r: any): void {
    if (this.printLoadingId) return;
    this.printLoadingId = r._id;
    this.commonApi.fetchData({ entiId: this.tenantId }, 'invigi', `by-date/${r.examDate}`).subscribe({
      next: (res: any) => {
        this.printLoadingId = null;
        this.printSvc.print(res);
      },
      error: () => {
        this.printLoadingId = null;
        this.alert.error('Failed to load print data');
      }
    });
  }

  downloadSample(): void {
    const wb = XLSX.utils.book_new();
    const data = [
      {
        'Room No': 'Room-1',
        'Slot 1 Staff Code': 'CSR',
        'Slot 2 Staff Code': 'HST'
      },
      {
        'Room No': 'Room-2',
        'Slot 1 Staff Code': 'PAKG',
        'Slot 2 Staff Code': 'PSS'
      },
      {
        'Room No': 'Room-3',
        'Slot 1 Staff Code': 'EPK',
        'Slot 2 Staff Code': ''
      }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Rooms');
    XLSX.writeFile(wb, 'invigilation_rooms_sample.xlsx');
  }

  sessionLabel(s: string): string {
    const map: any = {
      MORNING: 'Morning',
      AFTERNOON: 'Afternoon',
      EVENING: 'Evening'
    };
    return map[s] || s;
  }
}
