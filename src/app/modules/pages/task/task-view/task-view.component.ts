import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-task-view',
  standalone: false,
  templateUrl: './task-view.component.html',
  styleUrl: './task-view.component.scss'
})
export class TaskViewComponent implements OnInit {

  tenantId = localStorage.getItem('tenantId');
  userId = localStorage.getItem('userid');

  taskData: any = {};

  isStatus: boolean = false;
  selectedStatus: string | null = null;
  remarks: string = '';

  statusOptions = [
    { label: 'COMPLETED', checked: false },
    { label: 'NOT_COMPLETED', checked: false },
    { label: 'IN_PROGRESS', checked: false },
    { label: 'NEED_MORE_TIME', checked: false },
  ];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const stateData = navigation?.extras?.state as any;

    if (stateData?.taskData) {
      this.taskData = stateData.taskData;
      console.log("Satsyass ",this.taskData);
      
    }
    this.breadcrump.set([
      { label: 'Task', link: '/app/task' },
      { label: 'View' }
    ]);
  }

  ngOnInit(): void {

    // else {
    //   this.alert.error('Task data not found');
    //   this.router.navigate(['/app/task']);
    // }
  }

  // ===============================
  // FORMAT DATE
  // ===============================

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toISOString().split('T')[0];
  }

  // ===============================
  // POPUP CONTROL
  // ===============================

  onAct() {
    this.isStatus = true;
  }

  onClose() {
    this.isStatus = false;
  }

  selectStatus(index: number) {
    this.statusOptions.forEach((item, i) => {
      item.checked = i === index;
    });
  }

  // ===============================
  // UPDATE STATUS
  // ===============================

  onConfirm() {

    const selected = this.statusOptions.find(s => s.checked);

    if (!selected || !this.remarks.trim()) {
      this.alert.error('Please select status and enter remarks');
      return;
    }

    const payload = {
      tenantId: this.tenantId,
      taskId: this.taskData.taskId,
      userId: this.userId,
      status: selected.label,
      remarks: this.remarks
    };

    this.commonApi.fetchData(
      payload,
      'teacher/task',
      'update-status'
    ).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.alert.success('Status updated successfully');
          this.taskData.status = selected.label;
          this.taskData.remarks = this.remarks;
          this.isStatus = false;
          this.remarks = '';
          this.statusOptions.forEach(s => s.checked = false);
        }
      },
      error: () => {
        this.alert.error('Failed to update status');
      }
    });
  }

  // ===============================
  // QUICK MARK IN PROGRESS
  // ===============================

  markInProgress() {

    const payload = {
      tenantId: this.tenantId,
      taskId: this.taskData.taskId
    };

    this.commonApi.fetchData(
      payload,
      'teacher/task',
      'mark-in-progress'
    ).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.alert.success('Marked as In Progress');
          this.taskData.status = 'IN_PROGRESS';
        }
      },
      error: () => {
        this.alert.error('Failed to mark In Progress');
      }
    });
  }

}