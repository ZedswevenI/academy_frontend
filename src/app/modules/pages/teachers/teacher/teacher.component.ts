import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { PermissionService } from '../../../../shared/permission.service';

@Component({
  selector: 'app-teacher',
  standalone: false,
  templateUrl: './teacher.component.html',
  styleUrl: './teacher.component.scss',
})
export class TeacherComponent implements OnInit {
  private moduleName = 'teacher';
  entiId: any;

  loading = false;
  totalRecords = 0;
  dataArray: any[] = [];

  columns = [
    { key: 'staffCode', label: 'Staff Code', sortable: false },
    { key: 'staffName', label: 'Teacher Name', sortable: false },
    { key: 'joiningDate', label: 'Joined On', sortable: false },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'subject.subjectName', label: 'Subject', sortable: false },
    { key: 'department', label: 'Department', sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('teacher:view'),
      callback: (row: any) => this.viewTeacher(row),
    },
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
    private router: Router,
    private permissionService: PermissionService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([{ label: 'Teachers' }]);
  }

  ngOnInit(): void {
    this.fetchTableData({ page: 1, pageSize: 10 });
  }

  fetchTableData(event?: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    const page = event?.page || 1;
    const limit = event?.pageSize || 10;
    const search = (event?.search || '').toString().trim();
    const payload: any = {
      entiId: this.entiId,
      page,
      limit,
    };
    if (search) payload.search = search;
    this.loading = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'list')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          this.totalRecords = res?.count || 0;

          this.dataArray = rows.map((s: any) => ({
            staffId: s.staffId,
            staffCode: s.staffCode || s.employeeId || '—',
            staffName: s.staffName || '—',
            joiningDate: s.joiningDate
              ? new Date(s.joiningDate).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
              : '—',
            phone: s.phone || '—',
            subject: s.subject || '—',
            department: s.department?.departmentName || '—',
            _raw: s,
          }));
        },
        error: () => this.alert.error('Failed to load teachers'),
      });
  }

  viewTeacher(row: any) {
    this.router.navigate(['/app/teacher/view'], {
      queryParams: { staffId: row.staffId },
    });
  }

  onRowSelected(row: any) {
    // custom-table's (rowClick) bypasses the View icon's `show` gate — guard here too.
    if (!this.permissionService.hasPermission('teacher:view')) return;
    this.router.navigate(['/app/teacher/view'], {
      queryParams: { staffId: row.staffId },
    });
  }
}