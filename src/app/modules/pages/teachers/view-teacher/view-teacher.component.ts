import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

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
  loading  = false;
  saving   = false;

  // ── Resolved data ────────────────────────────────────────────────────────
  basicInfo: any = null;
  stats:     any = null;

  // ── Relieving popup ──────────────────────────────────────────────────────
  showRelievingModal = false;
  newRelievingDate   = '';

  // ── Batches tab ──────────────────────────────────────────────────────────
  columnsBatches = [
    { key: 'batchName',   label: 'Batch Name',  sortable: false },
    { key: 'batchCode',   label: 'Batch Code',  sortable: false },
    { key: 'programName', label: 'Program',     sortable: false },
    { key: 'centerName',  label: 'Center',      sortable: false },
    { key: 'subjects',    label: 'Subjects',    sortable: false },
  ];
  dataBatches: any[] = [];

  // ── Assignments tab ──────────────────────────────────────────────────────
  columnsAssignments = [
    { key: 'testNo',    label: 'Test No',    sortable: false },
    { key: 'batchId',   label: 'Batch',      sortable: false },
    { key: 'subjectId', label: 'Subject',    sortable: false },
    { key: 'status',    label: 'Status',     sortable: false },
    { key: 'enabledOn', label: 'Enabled On', sortable: false },
  ];
  dataAssignments: any[] = [];

  // ── Study Materials tab ──────────────────────────────────────────────────
  columnsMaterials = [
    { key: 'title',      label: 'Title',       sortable: false },
    { key: 'classNo',    label: 'Class',        sortable: false },
    { key: 'status',     label: 'Status',       sortable: false },
    { key: 'uploadedOn', label: 'Uploaded On',  sortable: false },
  ];
  dataMaterials: any[] = [];

  // ── Feedback Given tab ───────────────────────────────────────────────────
  columnsFeedback = [
    { key: 'admissionNo',  label: 'Admission No',  sortable: false },
    { key: 'academicYear', label: 'Academic Year', sortable: false },
    { key: 'remarks',      label: 'Feedback',      sortable: false },
    { key: 'givenOn',      label: 'Given On',      sortable: false },
  ];
  dataFeedback: any[] = [];

  // ── Relieving Date tab ───────────────────────────────────────────────────
  columnsRelieving = [
    { key: 'name',    label: 'Staff Name',     sortable: false },
    { key: 'code',    label: 'Staff Code',     sortable: false },
    { key: 'empId',   label: 'Employee ID',    sortable: false },
    { key: 'joining', label: 'Joining Date',   sortable: false },
    { key: 'relieve', label: 'Relieving Date', sortable: false },
  ];
  dataRelieving: any[] = [];

  actionsRelieving = [
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Update Date',
      callback: (_row: any) => { this.showRelievingModal = true; },
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumb: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([
      { label: 'Teachers', link: '/app/teacher' },
      { label: 'View' },
    ]);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.staffId = params['staffId'] || '';
      if (this.staffId) {
        this.loadStaffDetails();
      }
    });
  }

  // ── Fetch ────────────────────────────────────────────────────────────────
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
    this.stats     = data.stats     || null;

    // Batches
    this.dataBatches = (data.assignedBatches || []).map((b: any) => ({
      batchName:   b.batchName   || '—',
      batchCode:   b.batchCode   || '—',
      programName: b.programName || '—',
      centerName:  b.centerName  || '—',
      subjects:    (b.subjectsAssigned || []).join(', ') || '—',
    }));

    // Assignments
    this.dataAssignments = (data.enabledAssignments || []).map((a: any) => ({
      testNo:    a.testNo    || '—',
      batchId:   a.batchId   || '—',
      subjectId: a.subjectId || '—',
      status:    a.status    || '—',
      enabledOn: a.enabledAt
        ? new Date(a.enabledAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—',
    }));

    // Study Materials
    this.dataMaterials = (data.uploadedMaterials || []).map((m: any) => ({
      title:      m.title   || '—',
      classNo:    m.classNo ? `Class ${m.classNo}` : '—',
      status:     m.status  || '—',
      uploadedOn: m.createdAt
        ? new Date(m.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—',
    }));

    // Student Feedback
    this.dataFeedback = (data.studentFeedbacks || []).map((f: any) => ({
      admissionNo:  f.admissionNo  || '—',
      academicYear: f.academicYear || '—',
      remarks:      f.remarks      || '—',
      givenOn: f.addedAt
        ? new Date(f.addedAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—',
    }));

    // Relieving row
    const b = this.basicInfo;
    if (b) {
      this.dataRelieving = [{
        name:    b.staffName  || '—',
        code:    b.staffCode  || '—',
        empId:   b.employeeId || '—',
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

  // ── Avatar initials ───────────────────────────────────────────────────────
  get avatarText(): string {
    if (!this.basicInfo?.staffName) return '??';
    return this.basicInfo.staffName
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('');
  }

  // ── Date formatter ────────────────────────────────────────────────────────
  fmt(val: any): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  // ── Relieving update ──────────────────────────────────────────────────────
  updateRelievingDate() {
    if (!this.newRelievingDate || this.saving) return;

    const payload = {
      entiId:        this.entiId,
      userId:        localStorage.getItem('userId') || '',
      staffId:       this.staffId,
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

  // ── Retire ────────────────────────────────────────────────────────────────
  retireEmployee() {
    if (this.saving) return;

    const payload = {
      entiId:  this.entiId,
      userId:  localStorage.getItem('userId') || '',
      staffId: this.staffId,
      status:  'Inactive',
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
}