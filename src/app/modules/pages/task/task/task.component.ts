import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-task',
  standalone: false,
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit {

  tenantId = localStorage.getItem('tenantId');

  columnsArray = [
    { key: 'taskName', label: 'Task Name', sortable: false },
    { key: 'assignedDate', label: 'Assigned Date', sortable: false },
    { key: 'dueDate', label: 'Due Date', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];

  dataArray: any[] = [];
  totalRecords = 0;

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewTask(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      callback: (row: any) => this.editTask(row),
      hidden: (row: any) => row.status.toUpperCase() === 'COMPLETED'
    }
  ];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.breadcrump.set([{ label: 'Task' }]);
  }

  ngOnInit(): void {
    // this.loadTableData({ page: 1, pageSize: 10 });
  }

  // ================================
  // LOAD TASK LIST FROM API
  // ================================

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {

    const endpoint = `list?page=${req.page}&limit=${req.pageSize}&search=${req.search}`;

    this.commonApi.fetchData(
      { entiId: this.tenantId },
      'teacher/task',
      endpoint
    ).subscribe({
      next: (res: any) => {
        if (res.status) {

          this.totalRecords = res.count;

          this.dataArray = res.data.map((task: any) => ({
            ...task,
            taskName: task.taskName,
            assignedDate: this.formatDate(task.createdAt),
            dueDate: this.formatDate(task.dueDate),
            status: this.formatStatus(task.status)
          }));

        }
      },
      error: () => {
        this.alert.error('Failed to load task list');
      }
    });
  }

  // ================================
  // FORMAT DATE
  // ================================

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toISOString().split('T')[0];
  }

  // ================================
  // FORMAT STATUS (Optional Styling)
  // ================================

  formatStatus(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  }

  // ================================
  // VIEW TASK
  // ================================
  viewTask(row: any) {
    console.log("row cav",row);
    
    this.router.navigate(['/app/task/view'], {
      state: { taskData: row }
    });
  }

  // ================================
  // EDIT TASK
  // ================================

  editTask(row: any) {
    this.router.navigate(['/app/task/create'], {
      state: { taskData: row }
    });
  }

}