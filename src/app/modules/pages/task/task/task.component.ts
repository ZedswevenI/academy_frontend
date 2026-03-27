import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { AuthService } from '../../../../service/auth/auth.service';

@Component({
  selector: 'app-task',
  standalone: false,
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId');
  columnsArray = [{ key: 'taskName', label: 'Task Name', sortable: false }, { key: 'assignedDate', label: 'Assigned Date', sortable: false }, { key: 'dueDate', label: 'Due Date', sortable: false }, { key: 'status', label: 'Status', sortable: false }];
  dataArray: any[] = [];
  totalRecords = 0;
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#16A34A',
      callback: (row: any) => this.editTask(row),
      hidden: (row: any) => row.status.toUpperCase() === 'COMPLETED'
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewTask(row)
    }
  ];

  constructor(private breadcrump: BredcrumpService, private router: Router, private commonApi: CommonapiService, private alert: AlertService, private authService: AuthService) {
    this.breadcrump.set([{ label: 'Task' }]);
  }

  ngOnInit(): void {}

  loadTableData(req: { page: number; pageSize: number; search?: string; sortKey?: string; sortDirection?: 'asc' | 'desc' }) {
    let endpoint = '';
    if (this.authService.getRole() === 'L4') {
      const staffId = this.authService.getStaffId();
      console.log('staffId ', staffId);
      endpoint = `list?staffId=${staffId}&page=${req.page}&limit=${req.pageSize}&search=${req.search}`;
    } else {
      endpoint = `list?page=${req.page}&limit=${req.pageSize}&search=${req.search}`;
    }
    this.commonApi.fetchData({ entiId: this.tenantId }, 'teacher/task', endpoint).subscribe({
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

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toISOString().split('T')[0];
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'NEED_MORE_TIME':
        return 'NEED MORE TIME';
      case 'NOT_COMPLETED':
        return 'NOT COMPLETED';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  }

  viewTask(row: any) {
    this.router.navigate(['/app/task/view'], {
      queryParams: { taskId: row.taskId },
      state: { taskData: row }
    });
  }

  editTask(row: any) {
    this.router.navigate(['/app/task/create'], {
      state: { taskData: row }
    });
  }
}
