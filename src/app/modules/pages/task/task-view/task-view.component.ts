import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';

@Component({
  selector: 'app-task-view',
  standalone: false,
  templateUrl: './task-view.component.html',
  styleUrl: './task-view.component.scss',
})
export class TaskViewComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId');
  userId = localStorage.getItem('userid');
  taskData: any = {};
  isStatus: boolean = false;
  selectedStatus: string | null = null;
  remarks: string = '';
  formSubmitted: boolean = false;

  statusOptions = [
    { label: 'COMPLETED', value: 'COMPLETED', checked: false },
    { label: 'NOT COMPLETED', value: 'NOT_COMPLETED', checked: false },
    { label: 'INPROGRESS', value: 'IN_PROGRESS', checked: false },
    { label: 'NEED MORE TIME', value: 'NEED_MORE_TIME', checked: false },
  ];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private route: ActivatedRoute,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private backNav: BackNavigationService,
  ) {
    this.breadcrump.set([
      { label: 'Task', link: '/app/task' },
      { label: 'View' },
    ]);
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/task' });
  }

  ngOnInit(): void {
    const stateData = history.state as any;
    if (stateData?.taskData) {
      this.taskData = stateData.taskData;
    }
    this.route.queryParams.subscribe((params) => {
      if (params['taskId']) {
        this.fetchTaskDetails(params['taskId']);
      }
    });
  }

  fetchTaskDetails(taskId: string) {
    const payload = { tenantId: this.tenantId, taskId: taskId };
    this.commonApi.fetchData(payload, 'teacher/task', 'view').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.taskData = res.data;
        }
      },
      error: () => {
        this.alert.error('Failed to load latest task details');
      },
    });
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toISOString().split('T')[0];
  }

  onAct() {
    this.isStatus = true;
    this.formSubmitted = false;
  }

  onClose() {
    this.isStatus = false;
    this.formSubmitted = false;
    this.remarks = '';
    this.statusOptions.forEach((s) => (s.checked = false));
  }

  selectStatus(index: number) {
    this.statusOptions.forEach((item, i) => {
      item.checked = i === index;
    });
  }

  isStatusSelected(): boolean {
    return this.statusOptions.some((s) => s.checked);
  }

  needTime() {
    const payload = {
      tenantId: this.tenantId,
      taskId: this.taskData.taskId,
      userId: this.userId,
      status: 'NEED_MORE_TIME',
      remarks: null,
    };
    this.commonApi
      .fetchData(payload, 'teacher/task', 'update-status')
      .subscribe({
        next: (res: any) => {
          if (res.status) {
            this.alert.success('Status updated successfully');
            this.taskData.status = 'NEED_MORE_TIME';
            this.taskData.remarks = this.remarks;
            this.isStatus = false;
            this.remarks = '';
            this.statusOptions.forEach((s) => (s.checked = false));
          }
        },
        error: () => {
          this.alert.error('Failed to update status');
        },
      });
  }

  onConfirm() {
    this.formSubmitted = true;
    const selected = this.statusOptions.find((s) => s.checked);
    if (!selected || !this.remarks.trim()) {
      return; 
    }
    const payload = {
      tenantId: this.tenantId,
      taskId: this.taskData.taskId,
      userId: this.userId,
      status: selected.value,
      remarks: this.remarks.trim(),
    };
    this.commonApi
      .fetchData(payload, 'teacher/task', 'update-status')
      .subscribe({
        next: (res: any) => {
          if (res.status) {
            this.alert.success('Status updated successfully');
            this.taskData.status = selected.label;
            this.taskData.remarks = this.remarks;
            this.onClose();
          }
        },
        error: () => {
          this.alert.error('Failed to update status');
        },
      });
  }

  markInProgress() {
    const payload = {
      tenantId: this.tenantId,
      taskId: this.taskData.taskId,
    };
    this.commonApi
      .fetchData(payload, 'teacher/task', 'mark-in-progress')
      .subscribe({
        next: (res: any) => {
          if (res.status) {
            this.alert.success('Marked as In Progress');
            this.taskData.status = 'IN_PROGRESS';
          }
        },
        error: () => {
          this.alert.error('Failed to mark In Progress');
        },
      });
  }

  downloadAttachment(url: string): void {
    this.commonApi.downloadByUrl({ url }, 'ims', 'download').subscribe({
      next: (blob: Blob) => {
        const fileName = url;
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: () => console.error('Download failed'),
    });
  }
}
