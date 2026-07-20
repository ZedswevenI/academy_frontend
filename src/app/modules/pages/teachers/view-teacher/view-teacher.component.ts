import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';

@Component({
  selector: 'app-view-teacher',
  standalone: false,
  templateUrl: './view-teacher.component.html',
  styleUrl: './view-teacher.component.scss',
})
export class ViewTeacherComponent implements OnInit {
  private moduleName = 'teacher';
  entiId: any;
  staffId = '';
  loading = false;
  saving = false;
  basicInfo: any = null;
  stats: any = null;
  showAssignmentTab = true;
  private readonly excludedSubjectCodes = new Set([
    'ENGLISH', 'TAMIL', 'SOCIAL SCIENCE', 'PET', 'YOGA', 'ART', 'COMPUTER SCIENCE', 'HINDI'
  ]);
  showRelievingModal = false;
  newRelievingDate = '';
  columnsBatches = [
    { key: 'batchName', label: 'Batch Name', sortable: false },
    { key: 'batchCode', label: 'Batch Code', sortable: false },
    { key: 'programName', label: 'Program', sortable: false },
    { key: 'centerName', label: 'Center', sortable: false },
    { key: 'subjects', label: 'Subjects', sortable: false },
  ];
  dataBatches: any[] = [];
  columnsAssignments = [
    { key: 'testNo', label: 'Test No', sortable: false },
    { key: 'batchId', label: 'Batch', sortable: false },
    { key: 'subjectId', label: 'Subject', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'enabledOn', label: 'Enabled On', sortable: false },
  ];
  dataAssignments: any[] = [];
  columnsMaterials = [
    { key: 'title', label: 'Title', sortable: false },
    { key: 'classNo', label: 'Class', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'uploadedOn', label: 'Uploaded On', sortable: false },
  ];
  dataMaterials: any[] = [];
  columnsFeedback = [
    { key: 'admissionNo', label: 'Admission No', sortable: false },
    { key: 'academicYear', label: 'Academic Year', sortable: false },
    { key: 'remarks', label: 'Feedback', sortable: false },
    { key: 'givenOn', label: 'Given On', sortable: false },
  ];
  dataFeedback: any[] = [];
  columnsRelieving = [
    { key: 'name', label: 'Staff Name', sortable: false },
    { key: 'code', label: 'Staff Code', sortable: false },
    { key: 'empId', label: 'Employee ID', sortable: false },
    { key: 'joining', label: 'Joining Date', sortable: false },
    { key: 'relieve', label: 'Relieving Date', sortable: false },
  ];
  dataRelieving: any[] = [];
  actionsRelieving = [
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Update Date',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (_row: any) => { this.showRelievingModal = true; },
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
    private backNav: BackNavigationService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([
      { label: 'Teachers', link: '/app/teacher' },
      { label: 'View' },
    ]);
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/teacher' });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.staffId = params['staffId'] || '';
      if (this.staffId) {
        this.loadStaffDetails();
      }
    });
  }

  loadStaffDetails() {
    const payload = { entiId: this.entiId, staffId: this.staffId };
    this.loading = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'view')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.status && res?.data) {
            this.mapResponse(res.data);
          } else {
            this.alert.error(res?.message || 'Failed to load staff details');
          }
        },
        error: () => this.alert.error('Failed to load staff details'),
      });
  }

  private mapResponse(data: any) {
    this.basicInfo = data.basicInfo || null;
    this.stats = data.stats || null;
    const subjects: any[] = data.basicInfo?.subject || [];
    if (subjects.length) {
      this.showAssignmentTab = subjects.some(
        (s: any) => !this.excludedSubjectCodes.has(String(s.subjectName || '').trim())
      );
    } else {
      this.showAssignmentTab = true;
    }
    this.dataBatches = (data.assignedBatches || []).map((b: any) => ({
      batchName: b.batchName || '—',
      batchCode: b.batchCode || '—',
      programName: b.programName || '—',
      centerName: b.centerName || '—',
      subjects: (b.subjectsAssigned || []).join(', ') || '—',
    }));
    this.dataAssignments = (data.enabledAssignments || []).map((a: any) => ({
      testNo: a.testNo || '—',
      batchId: a.batchId || '—',
      subjectId: a.subjectId || '—',
      status: a.status || '—',
      enabledOn: a.enabledAt
        ? new Date(a.enabledAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
        : '—',
    }));
    this.dataMaterials = (data.uploadedMaterials || []).map((m: any) => ({
      title: m.title || '—',
      classNo: m.classNo ? `Class ${m.classNo}` : '—',
      status: m.status || '—',
      uploadedOn: m.createdAt
        ? new Date(m.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
        : '—',
    }));
    this.dataFeedback = (data.studentFeedbacks || []).map((f: any) => ({
      admissionNo: f.admissionNo || '—',
      academicYear: f.academicYear || '—',
      remarks: f.remarks || '—',
      givenOn: f.addedAt
        ? new Date(f.addedAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
        : '—',
    }));
    const b = this.basicInfo;
    if (b) {
      this.dataRelieving = [{
        name: b.staffName || '—',
        code: b.staffCode || '—',
        empId: b.employeeId || '—',
        joining: b.joiningDate
          ? new Date(b.joiningDate).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
          : '—',
        relieve: b.relievingDate
          ? new Date(b.relievingDate).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
          : 'Not Set',
      }];
      this.newRelievingDate = b.relievingDate
        ? new Date(b.relievingDate).toISOString().split('T')[0]
        : '';
    }
  }

  get avatarText(): string {
    if (!this.basicInfo?.staffName) return '??';
    return this.basicInfo.staffName
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('');
  }

  fmt(val: any): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  updateRelievingDate() {
    if (!this.newRelievingDate || this.saving) return;
    const payload = {
      entiId: this.entiId,
      userId: localStorage.getItem('userId') || '',
      staffId: this.staffId,
      relievingDate: new Date(this.newRelievingDate).getTime(),
    };
    this.saving = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'update')
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.status === false) {
            this.alert.error(res?.message || 'Update failed');
            return;
          }
          this.alert.success('Relieving date updated');
          this.showRelievingModal = false;
          this.loadStaffDetails();
        },
        error: () => this.alert.error('Update failed'),
      });
  }

  retireEmployee() {
    if (this.saving) return;
    const payload = {
      entiId: this.entiId,
      userId: localStorage.getItem('userId') || '',
      staffId: this.staffId,
      status: 'Inactive',
    };
    this.saving = true;
    this.commonApi
      .fetchData(payload, this.moduleName, 'update')
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.status === false) {
            this.alert.error(res?.message || 'Retire failed');
            return;
          }
          this.alert.success('Employee retired');
          this.showRelievingModal = false;
          this.router.navigate(['/app/teacher']);
        },
        error: () => this.alert.error('Retire failed'),
      });
  }

  cancelRelieving() {
    if (this.saving) return;
    this.showRelievingModal = false;
  }

  exportToExcel() {
    if (!this.basicInfo) {
      this.alert.error('No data to export');
      return;
    }
    const wb = XLSX.utils.book_new();
    const b = this.basicInfo;
    const profileRows = [
      { Field: 'Staff Name', Value: b.staffName || '—' },
      { Field: 'Staff Code', Value: b.staffCode || '—' },
      { Field: 'Employee ID', Value: b.employeeId || '—' },
      { Field: 'Status', Value: b.status || '—' },
      { Field: 'Phone', Value: b.phone || '—' },
      { Field: 'Email', Value: b.email || '—' },
      { Field: 'Department', Value: b.department?.departmentName || '—' },
      { Field: 'Center', Value: b.centerName || '—' },
      { Field: 'Role', Value: b.role || b.facultyType || '—' },
      { Field: 'Payroll', Value: b.payroll || '—' },
      { Field: 'Faculty Type', Value: b.facultyType || '—' },
      { Field: 'Subject', Value: b.subject || '—' },
      { Field: 'Week Off', Value: b.weekoff[0]|| '—' },
      { Field: 'Address', Value: b.address || '—' },
      { Field: 'Joining Date', Value: this.fmt(b.joiningDate) },
      { Field: 'Relieving Date', Value: this.fmt(b.relievingDate) || 'Not Set' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profileRows), 'Profile');
    if (this.dataBatches.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        this.dataBatches.map(r => ({
          'Batch Name': r.batchName,
          'Batch Code': r.batchCode,
          Program: r.programName,
          Center: r.centerName,
          Subjects: r.subjects,
        }))
      ), 'Batches');
    }
    if (this.dataAssignments.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        this.dataAssignments.map(r => ({
          'Test No': r.testNo,
          Batch: r.batchId,
          Subject: r.subjectId,
          Status: r.status,
          'Enabled On': r.enabledOn,
        }))
      ), 'Assignments');
    }
    if (this.dataMaterials.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        this.dataMaterials.map(r => ({
          Title: r.title,
          Class: r.classNo,
          Status: r.status,
          'Uploaded On': r.uploadedOn,
        }))
      ), 'Study Materials');
    }
    if (this.dataFeedback.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        this.dataFeedback.map(r => ({
          'Admission No': r.admissionNo,
          'Academic Year': r.academicYear,
          Feedback: r.remarks,
          'Given On': r.givenOn,
        }))
      ), 'Feedback');
    }
    if (this.dataRelieving.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        this.dataRelieving.map(r => ({
          'Staff Name': r.name,
          'Staff Code': r.code,
          'Employee ID': r.empId,
          'Joining Date': r.joining,
          'Relieving Date': r.relieve,
        }))
      ), 'Relieving');
    }
    const fileName = `Teacher_${b.staffCode || b.staffName || 'Export'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}