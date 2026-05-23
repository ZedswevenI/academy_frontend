import { Component, OnInit, HostListener } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

interface ReportItem {
  key: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-reportsnew',
  standalone: false,
  templateUrl: './reportsnew.component.html',
  styleUrl: './reportsnew.component.scss',
})
export class ReportsnewComponent implements OnInit {
  tenantId = '';
  activeTab: 'batch' | 'student' | 'teacher' = 'batch';
  batchReports: ReportItem[] = [
    {
      key: 'batch-info',
      label: 'Batch Info',
      icon: 'fa-solid fa-building',
      description: 'Overview of all batches with student & staff counts',
    },
    {
      key: 'batch-students',
      label: 'Student List',
      icon: 'fa-solid fa-users',
      description: 'Students enrolled in a batch',
    },
    {
      key: 'batch-staff',
      label: 'Staff List',
      icon: 'fa-solid fa-chalkboard-teacher',
      description: 'Teaching staff assigned to a batch',
    },
    {
      key: 'batch-timetable',
      label: 'Timetable',
      icon: 'fa-solid fa-calendar-week',
      description: 'Daily timetable with periods & subjects',
    },
    {
      key: 'batch-late-entries',
      label: 'Late Entries',
      icon: 'fa-solid fa-clock',
      description: 'Late arrivals & early departures in a batch',
    },
    {
      key: 'batch-phase-allotment',
      label: 'Phase Allotment',
      icon: 'fa-solid fa-tasks',
      description: 'Subject phase plan progress & allotment',
    },
    {
      key: 'batch-subject-hours',
      label: 'Subject Hours',
      icon: 'fa-solid fa-hourglass-half',
      description: 'Hours allotted per subject in a batch',
    },
    {
      key: 'batch-assignments',
      label: 'Assignments',
      icon: 'fa-solid fa-file-alt',
      description: 'Assignment completion status per batch',
    },
    {
      key: 'batch-exams',
      label: 'Exams',
      icon: 'fa-solid fa-graduation-cap',
      description: 'Mock exam completion status per batch',
    },
    {
      key: 'batch-feedback',
      label: 'PTM Feedback',
      icon: 'fa-solid fa-comments',
      description: 'PTM feedback & remarks summary',
    },
    {
      key: 'batch-ptm',
      label: 'PTM Sessions',
      icon: 'fa-solid fa-handshake',
      description: 'PTM session-level completion report',
    },
  ];
  studentReports: ReportItem[] = [
    {
      key: 'student-attendance',
      label: 'Attendance',
      icon: 'fa-solid fa-clipboard-check',
      description: 'Period & school attendance with subject breakdown',
    },
    {
      key: 'student-remarks',
      label: 'Remarks',
      icon: 'fa-solid fa-comment-dots',
      description: 'Academic & behavioural remarks for a student',
    },
    {
      key: 'student-late-entries',
      label: 'Late Entries',
      icon: 'fa-solid fa-clock',
      description: 'Late arrivals & early departures for a student',
    },
  ];
  teacherReports: ReportItem[] = [
    {
      key: 'teacher-batches',
      label: 'Batches',
      icon: 'fa-solid fa-layer-group',
      description: 'Batches assigned to a teacher',
    },
    {
      key: 'teacher-tasks',
      label: 'Tasks',
      icon: 'fa-solid fa-list-check',
      description: 'Task completion & delay report',
    },
    {
      key: 'teacher-late-entries',
      label: 'Late Entries',
      icon: 'fa-solid fa-clock',
      description: 'Late entry records for a teacher',
    },
    {
      key: 'teacher-early-leaving',
      label: 'Early Leaving',
      icon: 'fa-solid fa-right-from-bracket',
      description: 'Early leaving records for a teacher',
    },
    {
      key: 'teacher-assignments',
      label: 'Assignments',
      icon: 'fa-solid fa-file-alt',
      description: 'Assignments created & completion rates',
    },
    {
      key: 'teacher-attendance',
      label: 'Attendance Marking',
      icon: 'fa-solid fa-clipboard-check',
      description: 'Period attendance marking report',
    },
    {
      key: 'teacher-feedback',
      label: 'PTM Feedback',
      icon: 'fa-solid fa-comments',
      description: 'PTM feedback given by a teacher',
    },
    {
      key: 'teacher-exams',
      label: 'Exams',
      icon: 'fa-solid fa-graduation-cap',
      description: 'Exams managed by a teacher',
    },
  ];
  selectedReport: ReportItem | null = null;
  reportLoading = false;
  reportData: any = null;
  reportTableData: any[] = [];
  reportColumns: any[] = [];
  reportSummary: any = null;
  summaryItems: { label: string; value: any }[] = [];
  phaseDetailData: any[] = [];
  staffSummaryData: any[] = [];
  periodDetailData: any[] = [];
  remarksDetailData: any[] = [];
  examBatchData: any[] = [];
  schoolAttData: any[] = [];
  subjectSummaryData: any[] = [];
  sessionStudentsData: any[] = [];
  selectedDetailLabel = '';
  showDetailPanel = false;
  batchOptions: any[] = [];
  selectedBatchId = '';
  selectedBatchCode = '';
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  batchDropdownOpen = false;
  studentBatchDropdownOpen = false;
  teacherBatchDropdownOpen = false;
  studentBatchSearch = '';
  teacherBatchSearch = '';
  studentSearch = '';
  studentOptions: any[] = [];
  selectedStudentId = '';
  selectedAdmissionNo = '';
  staffOptions: any[] = [];
  filteredStaffOptions: any[] = [];
  staffSearch = '';
  selectedStaffId = '';
  fromDate = '';
  toDate = '';
  filterStatus = '';
  filterProgramId = '';
  filterSubjectId = '';
  filterType = '';
  filterEntryType = '';
  subjectOptions: any[] = [];
  programOptions: any[] = [];
  centerOptions: any[] = [];
  selectedProgramIds: string[] = [];
  selectedCenterIds: string[] = [];
  programDropdownOpen = false;
  centerDropdownOpen = false;
  programSearch = '';
  centerSearch = '';
  filterMode = '';

  constructor(
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Reports' }]);
    this.loadBatches();
    this.loadStaff();
  }

  switchTab(tab: 'batch' | 'student' | 'teacher') {
    this.activeTab = tab;
    this.clearReport();
  }

  selectReport(report: ReportItem) {
    this.selectedReport = report;
    this.reportData = null;
    this.reportTableData = [];
    this.reportColumns = [];
    this.reportSummary = null;
    this.showDetailPanel = false;
    this.resetFilters();
    if (report.key === 'batch-info') {
      this.loadPrograms();
      this.loadCenters();
    }
    if (
      report.key === 'batch-phase-allotment' ||
      report.key === 'batch-assignments' ||
      report.key === 'batch-subject-hours' ||
      report.key === 'batch-timetable' ||
      report.key === 'batch-subject-hours'
    ) {
      this.loadSubjects();
    }
  }

  clearReport() {
    this.selectedReport = null;
    this.reportData = null;
    this.reportTableData = [];
    this.reportColumns = [];
    this.reportSummary = null;
    this.summaryItems = [];
    this.showDetailPanel = false;
    this.resetFilters();
  }

  resetFilters() {
    this.fromDate = '';
    this.toDate = '';
    this.filterStatus = '';
    this.filterProgramId = '';
    this.filterSubjectId = '';
    this.filterType = '';
    this.filterEntryType = '';
    this.selectedBatchId = '';
    this.selectedBatchCode = '';
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.batchDropdownOpen = false;
    this.studentBatchDropdownOpen = false;
    this.teacherBatchDropdownOpen = false;
    this.selectedStudentId = '';
    this.selectedAdmissionNo = '';
    this.selectedStaffId = '';
    this.studentSearch = '';
    this.phaseDetailData = [];
    this.staffSummaryData = [];
    this.periodDetailData = [];
    this.remarksDetailData = [];
    this.examBatchData = [];
    this.schoolAttData = [];
    this.subjectSummaryData = [];
    this.sessionStudentsData = [];
    this.selectedProgramIds = [];
    this.selectedCenterIds = [];
    this.programDropdownOpen = false;
    this.centerDropdownOpen = false;
    this.programSearch = '';
    this.centerSearch = '';
    this.filterMode = '';
  }

  private loadBatches() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.batchOptions = (res?.data || []).map((b: any) => ({
            value: b.batchId || b._id,
            label: b.batchCode + ' - ' + b.batchName,
            batchCode: b.batchCode,
            batchId: b.batchId || b._id,
          }));
        },
      });
  }

  private loadStaff() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims', 'staff/list?list=full')
      .subscribe({
        next: (res: any) => {
          this.staffOptions = (res?.data || []).map((s: any) => ({
            value: s.staffId || s._id,
            label: (s.staffCode ? s.staffCode + ' - ' : '') + s.staffName,
          }));
          this.filteredStaffOptions = [...this.staffOptions];
        },
      });
  }

  filterStaffOptions() {
    const q = (this.staffSearch || '').toLowerCase().trim();
    if (!q) {
      this.filteredStaffOptions = [...this.staffOptions];
      return;
    }
    this.filteredStaffOptions = this.staffOptions.filter((s: any) =>
      s.label.toLowerCase().includes(q),
    );
  }

  private loadSubjects() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims', 'subject/list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjectOptions = (res?.data || []).map((s: any) => ({
            value: s._id,
            label: s.subjectName,
          }));
        },
      });
  }

  private loadPrograms() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims/program', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.programOptions = (res?.data || []).map((p: any) => ({
            value: p.programId || p._id,
            label: p.programName,
          }));
        },
      });
  }

  private loadCenters() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'ims/center', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.centerOptions = (res?.data || []).map((c: any) => ({
            value: c.centerId || c._id,
            label: c.centerName,
          }));
        },
      });
  }

  onBatchChange(val: string) {
    const batch = this.batchOptions.find((b: any) => b.value === val);
    this.selectedBatchCode = batch?.batchCode || '';
    this.selectedBatchId = val;
    this.selectedStudentId = '';
    this.selectedAdmissionNo = '';
    this.studentOptions = [];
  }

  get allBatchesSelected(): boolean {
    return (
      this.batchOptions.length > 0 &&
      this.selectedBatchIds.length === this.batchOptions.length
    );
  }

  get batchSelectionLabel(): string {
    if (!this.selectedBatchIds.length) return 'All Batches';
    if (this.allBatchesSelected) return 'All Batches';
    if (this.selectedBatchIds.length === 1)
      return (
        this.batchOptions.find((b: any) => b.value === this.selectedBatchIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedBatchIds.length} batches selected`;
  }

  toggleBatchDropdown() {
    this.batchDropdownOpen = !this.batchDropdownOpen;
  }

  get allStudentBatchesSelected(): boolean {
    return (
      this.batchOptions.length > 0 &&
      this.selectedBatchIds.length === this.batchOptions.length
    );
  }

  get studentBatchSelectionLabel(): string {
    if (!this.selectedBatchIds.length) return 'All Batches';
    if (this.allStudentBatchesSelected) return 'All Batches';
    if (this.selectedBatchIds.length === 1)
      return (
        this.batchOptions.find((b: any) => b.value === this.selectedBatchIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedBatchIds.length} batches selected`;
  }

  get filteredStudentBatchOptions(): any[] {
    const q = this.studentBatchSearch.toLowerCase().trim();
    return q
      ? this.batchOptions.filter((b: any) => b.label.toLowerCase().includes(q))
      : this.batchOptions;
  }

  get filteredTeacherBatchOptions(): any[] {
    const q = this.teacherBatchSearch.toLowerCase().trim();
    return q
      ? this.batchOptions.filter((b: any) => b.label.toLowerCase().includes(q))
      : this.batchOptions;
  }

  toggleStudentBatchDropdown() {
    this.studentBatchDropdownOpen = !this.studentBatchDropdownOpen;
    if (!this.studentBatchDropdownOpen) this.studentBatchSearch = '';
  }

  toggleStudentBatchSelection(value: string) {
    this.toggleBatchSelection(value);
    this.selectedStudentId = '';
    this.selectedAdmissionNo = '';
    this.loadStudentsByBatches(this.selectedBatchIds);
  }

  toggleSelectAllStudentBatches() {
    this.toggleSelectAllBatches();
    this.selectedStudentId = '';
    this.selectedAdmissionNo = '';
    this.loadStudentsByBatches(this.selectedBatchIds);
  }

  get allTeacherBatchesSelected(): boolean {
    return (
      this.batchOptions.length > 0 &&
      this.selectedBatchIds.length === this.batchOptions.length
    );
  }

  get teacherBatchSelectionLabel(): string {
    if (!this.selectedBatchIds.length) return 'All Batches';
    if (this.allTeacherBatchesSelected) return 'All Batches';
    if (this.selectedBatchIds.length === 1)
      return (
        this.batchOptions.find((b: any) => b.value === this.selectedBatchIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedBatchIds.length} batches selected`;
  }

  toggleTeacherBatchDropdown() {
    this.teacherBatchDropdownOpen = !this.teacherBatchDropdownOpen;
    if (!this.teacherBatchDropdownOpen) this.teacherBatchSearch = '';
  }

  toggleSelectAllTeacherBatches() {
    this.toggleSelectAllBatches();
  }

  isBatchSelected(value: string): boolean {
    return this.selectedBatchIds.includes(value);
  }

  toggleBatchSelection(value: string) {
    const batch = this.batchOptions.find((b: any) => b.value === value);
    if (this.isBatchSelected(value)) {
      this.selectedBatchIds = this.selectedBatchIds.filter(
        (id) => id !== value,
      );
      this.selectedBatchCodes = this.selectedBatchCodes.filter(
        (c) => c !== batch?.batchCode,
      );
    } else {
      this.selectedBatchIds = [...this.selectedBatchIds, value];
      if (batch?.batchCode)
        this.selectedBatchCodes = [...this.selectedBatchCodes, batch.batchCode];
    }
  }

  toggleSelectAllBatches() {
    if (this.allBatchesSelected) {
      this.selectedBatchIds = [];
      this.selectedBatchCodes = [];
    } else {
      this.selectedBatchIds = this.batchOptions.map((b: any) => b.value);
      this.selectedBatchCodes = this.batchOptions.map((b: any) => b.batchCode);
    }
  }

  private loadStudentsByBatches(batchIds: string[]) {
    if (!batchIds.length) {
      this.studentOptions = [];
      return;
    }
    const endpoint = `list?list=full&batchIds=${batchIds.join(',')}`;
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'student', endpoint)
      .subscribe({
        next: (res: any) => {
          this.studentOptions = (res?.data || []).map((s: any) => ({
            value: s.studentId || s._id,
            label:
              (s.admissionNo || '') +
              ' - ' +
              (s.student?.name || s.name || s.studentName || ''),
            admissionNo: s.admissionNo,
            studentId: s.studentId || s._id,
          }));
        },
      });
  }

  onStudentChange(val: string) {
    const student = this.studentOptions.find((s: any) => s.value === val);
    this.selectedAdmissionNo = student?.admissionNo || '';
    this.selectedStudentId = val;
  }

  generateReport() {
    if (!this.selectedReport) return;
    this.reportLoading = true;
    this.reportData = null;
    this.reportTableData = [];
    this.showDetailPanel = false;
    const key = this.selectedReport.key;
    let module = '';
    let endpoint = '';
    const payload: any = { entiId: this.tenantId };
    switch (key) {
      case 'batch-info':
        module = 'reports/batch';
        endpoint = 'batch-info';
        if (this.selectedProgramIds.length)
          payload.programIds = this.selectedProgramIds;
        if (this.selectedCenterIds.length)
          payload.centerIds = this.selectedCenterIds;
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'batch-students':
        module = 'reports/batch';
        endpoint = 'students';
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'batch-staff':
        module = 'reports/batch';
        endpoint = 'staff';
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        break;
      case 'batch-timetable':
        module = 'reports/batch';
        endpoint = 'timetable';
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        if (this.filterMode) payload.mode = this.filterMode;
        break;
      case 'batch-late-entries':
        module = 'reports/batch';
        endpoint = 'late-entries';
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterType) payload.type = this.filterType;
        if (this.filterEntryType) payload.entryType = this.filterEntryType;
        break;
      case 'batch-phase-allotment':
        module = 'reports/batch';
        endpoint = 'phase-allotment';
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        break;
      case 'batch-subject-hours':
        module = 'reports/batch';
        endpoint = 'subject-hours';
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'batch-assignments':
        module = 'reports/batch';
        endpoint = 'assignments';
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        break;
      case 'batch-exams':
        module = 'reports/batch';
        endpoint = 'exams';
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        break;
      case 'batch-feedback':
        module = 'reports/batch';
        endpoint = 'feedback';
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'batch-ptm':
        module = 'reports/batch';
        endpoint = 'ptm';
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'student-attendance':
        module = 'reports/student';
        endpoint = 'attendance';
        payload.admissionNo = this.selectedAdmissionNo;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'student-remarks':
        module = 'reports/student';
        endpoint = 'remarks';
        payload.admissionNo = this.selectedAdmissionNo;
        if (this.filterType) payload.type = this.filterType;
        if (this.filterStatus) payload.status = this.filterStatus;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'student-late-entries':
        module = 'reports/student';
        endpoint = 'late-entries';
        payload.admissionNo = this.selectedAdmissionNo;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterEntryType) payload.entryType = this.filterEntryType;
        break;
      case 'teacher-batches':
        module = 'reports/teacher';
        endpoint = 'batches';
        payload.staffId = this.selectedStaffId;
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'teacher-tasks':
        module = 'reports/teacher';
        endpoint = 'tasks';
        payload.staffId = this.selectedStaffId;
        if (this.filterStatus) payload.status = this.filterStatus;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-late-entries':
        module = 'reports/teacher';
        endpoint = 'late-entries';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-early-leaving':
        module = 'reports/teacher';
        endpoint = 'early-leaving';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-assignments':
        module = 'reports/teacher';
        endpoint = 'assignments';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-attendance':
        module = 'reports/teacher';
        endpoint = 'attendance';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-feedback':
        module = 'reports/teacher';
        endpoint = 'feedback';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length)
          payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-exams':
        module = 'reports/teacher';
        endpoint = 'exams';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
    }
    this.commonApi.fetchData(payload, module, endpoint).subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.reportData = res;
          this.buildTable(key, res);
        } else {
          this.alert.error(res?.message || 'No data found');
        }
        this.reportLoading = false;
      },
      error: (err: any) => {
        this.reportLoading = false;
        this.alert.error(err?.error?.message || 'Error generating report');
      },
    });
  }

  private buildTable(key: string, res: any) {
    const data = res.data || [];
    this.reportSummary = res.summary || res.batchSummary || null;
    this.summaryItems = [];
    if (this.reportSummary && typeof this.reportSummary === 'object') {
      Object.keys(this.reportSummary).forEach((k) => {
        const val = this.reportSummary[k];
        if (val !== null && val !== undefined && typeof val !== 'object') {
          this.summaryItems.push({
            label: this.formatSummaryKey(k),
            value: val,
          });
        }
      });
    }
    switch (key) {
      case 'batch-info':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'batchCode', label: 'Batch Code' },
          { key: 'batchName', label: 'Batch Name' },
          { key: 'programName', label: 'Program' },
          { key: 'centerName', label: 'Center' },
          { key: 'academicYear', label: 'Year' },
          { key: 'studentCount', label: 'Students' },
          { key: 'staffCount', label: 'Staff' },
          { key: 'classTeacherName', label: 'Class Teacher' },
          { key: 'status', label: 'Status' },
        ];
        this.reportTableData = data.map((r: any, i: number) => ({
          slNo: i + 1,
          ...r,
        }));
        break;
      case 'batch-students':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          ...(!this.selectedBatchIds.length || this.allBatchesSelected
            ? [{ key: 'batchCode', label: 'Batch' }]
            : []),
          { key: 'admissionNo', label: 'Enrollment No' },
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'parentName', label: 'Parent' },
          { key: 'status', label: 'Status' },
        ];
        this.reportTableData = data.map((r: any, i: number) => ({
          slNo: i + 1,
          ...r,
        }));
        break;
      case 'batch-staff':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          ...(!this.selectedBatchIds.length || this.allBatchesSelected
            ? [{ key: 'batchCode', label: 'Batch' }]
            : []),
          { key: 'staffName', label: 'Name' },
          { key: 'staffCode', label: 'Code' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'facultyType', label: 'Type' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
        ];
        this.reportTableData = res.currentStaff || [];
        break;
      case 'batch-timetable':
        this.reportColumns = [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'day', label: 'Day' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'periodType', label: 'Type' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'facultyName', label: 'Faculty' },
          { key: 'startTime', label: 'Start' },
          { key: 'endTime', label: 'End' },
          { key: 'venue', label: 'Venue' },
          { key: 'topic', label: 'Topic' },
        ];
        const ttRows: any[] = [];
        (data || []).forEach((d: any) => {
          (d.periods || [])
            .filter((p: any) => !p.isCancelled)
            .forEach((p: any) => {
              ttRows.push({
                dateFormatted: this.formatEpoch(d.date),
                day: d.day,
                batchCode: d.batchCode || '-',
                ...p,
              });
            });
        });
        this.reportTableData = ttRows;
        break;
      case 'batch-late-entries':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'personName', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'entryType', label: 'Entry Type' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' },
          { key: 'reason', label: 'Reason' },
        ];
        this.reportTableData = data;
        break;
      case 'batch-phase-allotment':
        this.reportColumns = [
          { key: 'subjectName', label: 'Subject' },
          { key: 'subjectCode', label: 'Code' },
          { key: 'totalEstHours', label: 'Est Hours' },
          { key: 'totalAllottedHours', label: 'Allotted' },
          { key: 'totalRemainingHours', label: 'Remaining' },
          { key: 'overallProgressPct', label: 'Progress %' },
          { key: 'unassignedHours', label: 'Unassigned Hrs' },
          { key: 'phaseCount', label: 'Phases' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          phaseCount: (r.phases || []).length,
          totalEstHours: this.formatHours(r.totalEstHours),
          totalAllottedHours: this.formatHours(r.totalAllottedHours),
          totalRemainingHours: this.formatHours(r.totalRemainingHours),
          unassignedHours: this.formatHours(r.unassignedHours),
        }));
        this.phaseDetailData = data.flatMap((r: any) =>
          (r.phases || []).map((ph: any) => ({
            subjectName: r.subjectName,
            subjectCode: r.subjectCode,
            phaseName: ph.phaseName,
            estHours: this.formatHours(ph.estHours),
            allottedHours: this.formatHours(ph.allottedHours),
            remainingHours: this.formatHours(ph.remainingHours),
            progressPct: ph.progressPct !== null ? ph.progressPct + '%' : '-',
          })),
        );
        break;
      case 'batch-subject-hours':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch' },
          { key: 'batchName', label: 'Batch Name' }, 
          { key: 'subjectName', label: 'Subject' },
          { key: 'subjectCode', label: 'Code' },
          { key: 'allottedHours', label: 'Allotted Hours' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          allottedHours: this.formatHours(r.allottedHours),
        }));
        break;
      case 'batch-assignments':
        this.reportColumns = [
          { key: 'testCode', label: 'Code' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'completed', label: 'Completed' },
          { key: 'inProgress', label: 'In Progress' },
          { key: 'assigned', label: 'Assigned' },
          { key: 'completionPct', label: 'Completion %' },
        ];
        this.reportTableData = data;
        break;
      case 'batch-exams':
        this.reportColumns = [
          { key: 'examCode', label: 'Code' },
          { key: 'examName', label: 'Name' },
          { key: 'totalMarks', label: 'Marks' },
          { key: 'duration', label: 'Duration' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'completed', label: 'Completed' },
          { key: 'completionPct', label: 'Completion %' },
          { key: 'examStatus', label: 'Status' },
        ];
        this.reportTableData = data;
        break;
      case 'batch-feedback':
        this.reportColumns = [
          { key: 'admissionNo', label: 'Admission No' },
          { key: 'studentName', label: 'Student' },
          { key: 'status', label: 'Status' },
          { key: 'ptmDateFormatted', label: 'PTM Date' },
          { key: 'staffFeedbackCount', label: 'Feedbacks' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          ptmDateFormatted: this.formatEpoch(r.ptmDate),
        }));
        this.staffSummaryData = res.staffSummary || [];
        this.reportSummary = res.batchSummary || null;
        if (this.reportSummary) {
          this.summaryItems = Object.keys(this.reportSummary)
            .filter(
              (k) =>
                typeof this.reportSummary[k] !== 'object' &&
                this.reportSummary[k] !== null,
            )
            .map((k) => ({
              label: this.formatSummaryKey(k),
              value: this.reportSummary[k],
            }));
        }
        break;
      case 'batch-ptm':
        this.reportColumns = [
          { key: 'ptmDateFormatted', label: 'Date' },
          { key: 'venue', label: 'Venue' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'completed', label: 'Completed' },
          { key: 'noShow', label: 'No Show' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'prePtmSubmissionPct', label: 'Pre-PTM %' },
          { key: 'postPtmSubmissionPct', label: 'Post-PTM %' },
        ];
        this.reportTableData = (res.sessions || []).map((s: any) => ({
          ...s,
          ptmDateFormatted: this.formatEpoch(s.ptmDate),
        }));
        this.reportSummary = res.summary || null;
        if (this.reportSummary) {
          this.summaryItems = Object.keys(this.reportSummary)
            .filter(
              (k) =>
                typeof this.reportSummary[k] !== 'object' &&
                this.reportSummary[k] !== null,
            )
            .map((k) => ({
              label: this.formatSummaryKey(k),
              value: this.reportSummary[k],
            }));
        }
        break;
      case 'student-attendance':
        this.reportColumns = [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'periodNo', label: 'Period' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'status', label: 'Status' },
          { key: 'remarks', label: 'Remarks' },
          { key: 'topicTaught', label: 'Topic' },
        ];
        this.reportTableData = res?.periodAttendance?.detail || [];
        this.reportSummary = {
          periodTotal: res?.periodAttendance?.total || 0,
          periodPresent: res?.periodAttendance?.present || 0,
          periodAbsent: res?.periodAttendance?.absent || 0,
          periodPresentPct: res?.periodAttendance?.presentPct || 0,
          schoolTotal: res?.schoolAttendance?.total || 0,
          schoolPresent: res?.schoolAttendance?.present || 0,
          schoolPresentPct: res?.schoolAttendance?.presentPct || 0,
        };
        this.summaryItems = [
          { label: 'Period Total', value: this.reportSummary.periodTotal },
          { label: 'Period Present', value: this.reportSummary.periodPresent },
          { label: 'Period Absent', value: this.reportSummary.periodAbsent },
          {
            label: 'Period Present %',
            value: this.reportSummary.periodPresentPct + '%',
          },
          { label: 'School Total', value: this.reportSummary.schoolTotal },
          { label: 'School Present', value: this.reportSummary.schoolPresent },
          {
            label: 'School Present %',
            value: this.reportSummary.schoolPresentPct + '%',
          },
        ];
        this.schoolAttData = res?.schoolAttendance?.detail || [];
        this.subjectSummaryData = res?.subjectSummary || [];
        break;
      case 'student-remarks':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'type', label: 'Type' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'remark', label: 'Remark' },
          { key: 'status', label: 'Status' },
        ];
        this.reportTableData = data;
        break;
      case 'student-late-entries':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'entryType', label: 'Type' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' },
          { key: 'reason', label: 'Reason' },
        ];
        this.reportTableData = data;
        break;
      case 'teacher-batches':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch Code' },
          { key: 'batchName', label: 'Batch' },
          { key: 'programName', label: 'Program' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'academicYear', label: 'Year' },
          { key: 'studentCount', label: 'Students' },
          { key: 'isClassTeacher', label: 'Class Teacher' },
          { key: 'status', label: 'Status' },
        ];
        this.reportTableData = data;
        break;
      case 'teacher-tasks':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'taskName', label: 'Task' },
          { key: 'dueDateFormatted', label: 'Due Date' },
          { key: 'status', label: 'Status' },
          { key: 'isDelayed', label: 'Delayed' },
          { key: 'daysOverdue', label: 'Overdue Days' },
          { key: 'remarks', label: 'Remarks' },
        ];
        this.reportTableData = data;
        break;
      case 'teacher-late-entries':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' },
          { key: 'reason', label: 'Reason' },
        ];
        this.reportTableData = data;
        break;
      case 'teacher-early-leaving':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'earlyByMinutes', label: 'Early (min)' },
          { key: 'reason', label: 'Reason' },
        ];
        this.reportTableData = data;
        break;
      case 'teacher-assignments':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'enabledAtFormatted', label: 'Enabled' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'completed', label: 'Completed' },
          { key: 'completionPct', label: 'Completion %' },
        ];
        this.reportTableData = data;
        break;
      case 'teacher-attendance':
        this.reportColumns = [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'day', label: 'Day' },
          { key: 'totalPeriods', label: 'Total Periods' },
          { key: 'markedCount', label: 'Marked' },
          { key: 'notMarkedCount', label: 'Not Marked' },
        ];
        this.reportTableData = data;
        this.periodDetailData = data.flatMap((d: any) =>
          (d.periods || []).map((p: any) => ({
            dateFormatted: d.dateFormatted,
            day: d.day,
            batchCode: p.batchCode,
            periodNo: p.periodNo,
            subjectName: p.subjectName,
            startTime: p.startTime,
            endTime: p.endTime,
            isMarked: p.isMarked,
            presentCount: p.presentCount,
            absentCount: p.absentCount,
            totalStudents: p.totalStudents,
          })),
        );
        break;
      case 'teacher-feedback':
        this.reportColumns = [
          { key: 'admissionNo', label: 'Admission No' },
          { key: 'studentName', label: 'Student' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'ptmDateFormatted', label: 'PTM Date' },
          { key: 'ptmStatus', label: 'Status' },
          { key: 'remarksCount', label: 'Remarks' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          ptmDateFormatted: r.ptmDateFormatted || this.formatEpoch(r.ptmDate),
          remarksCount: (r.myRemarks || []).length,
        }));
        this.remarksDetailData = data.flatMap((r: any) =>
          (r.myRemarks || []).map((rm: any) => ({
            admissionNo: r.admissionNo,
            studentName: r.studentName,
            subjectName: rm.subjectName,
            remarks: rm.remarks,
            submittedAt: rm.submittedAt
              ? this.formatEpoch(rm.submittedAt)
              : '-',
          })),
        );
        break;
      case 'teacher-exams':
        this.reportColumns = [
          { key: 'examCode', label: 'Code' },
          { key: 'examName', label: 'Name' },
          { key: 'totalMarks', label: 'Marks' },
          { key: 'examStatus', label: 'Status' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'totalCompleted', label: 'Completed' },
          { key: 'overallCompletionPct', label: 'Completion %' },
          { key: 'batchCount', label: 'Batches' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          batchCount: (r.batches || []).length,
        }));
        this.examBatchData = data.flatMap((r: any) =>
          (r.batches || []).map((b: any) => ({
            examName: r.examName,
            examCode: r.examCode,
            batchCode: b.batchCode,
            batchName: b.batchName,
            totalStudents: b.totalStudents,
            completed: b.completed,
            completionPct: b.completionPct,
          })),
        );
        break;
      default:
        this.reportTableData = data;
    }
  }

  showPhaseDetail() {
    this.selectedDetailLabel = 'Phase Breakdown';
    this.showDetailPanel = true;
  }

  showStaffSummary() {
    this.selectedDetailLabel = 'Staff Feedback Summary';
    this.showDetailPanel = true;
  }

  showSchoolAttDetail() {
    this.selectedDetailLabel = 'School Attendance Detail';
    this.showDetailPanel = true;
  }

  showSubjectSummary() {
    this.selectedDetailLabel = 'Subject-wise Summary';
    this.showDetailPanel = true;
  }

  showPeriodDetail() {
    this.selectedDetailLabel = 'Period-level Detail';
    this.showDetailPanel = true;
  }

  showRemarksDetail() {
    this.selectedDetailLabel = 'Remarks Detail';
    this.showDetailPanel = true;
  }

  showExamBatchDetail() {
    this.selectedDetailLabel = 'Per-Batch Breakdown';
    this.showDetailPanel = true;
  }

  closeDetailPanel() {
    this.showDetailPanel = false;
  }

  getActiveDetailData(): any[] {
    switch (this.selectedDetailLabel) {
      case 'Phase Breakdown':
        return this.phaseDetailData;
      case 'Staff Feedback Summary':
        return this.staffSummaryData;
      case 'School Attendance Detail':
        return this.schoolAttData;
      case 'Subject-wise Summary':
        return this.subjectSummaryData;
      case 'Period-level Detail':
        return this.periodDetailData;
      case 'Remarks Detail':
        return this.remarksDetailData;
      case 'Per-Batch Breakdown':
        return this.examBatchData;
      default:
        return [];
    }
  }

  getActiveDetailColumns(): any[] {
    switch (this.selectedDetailLabel) {
      case 'Phase Breakdown':
        return [
          { key: 'subjectName', label: 'Subject' },
          { key: 'phaseName', label: 'Phase' },
          { key: 'estHours', label: 'Est Hrs' },
          { key: 'allottedHours', label: 'Allotted' },
          { key: 'remainingHours', label: 'Remaining' },
          { key: 'progressPct', label: 'Progress %' },
        ];
      case 'Staff Feedback Summary':
        return [
          { key: 'staffName', label: 'Staff' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'remarksCount', label: 'Remarks' },
          { key: 'studentsCovered', label: 'Students Covered' },
        ];
      case 'School Attendance Detail':
        return [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'status', label: 'Status' },
          { key: 'remarks', label: 'Remarks' },
          { key: 'markedByName', label: 'Marked By' },
        ];
      case 'Subject-wise Summary':
        return [
          { key: 'subjectId', label: 'Subject ID' },
          { key: 'total', label: 'Total' },
          { key: 'present', label: 'Present' },
          { key: 'absent', label: 'Absent' },
          { key: 'presentPct', label: 'Present %' },
        ];
      case 'Period-level Detail':
        return [
          { key: 'dateFormatted', label: 'Date' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'periodNo', label: 'Period' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'startTime', label: 'Start' },
          { key: 'isMarked', label: 'Marked' },
          { key: 'presentCount', label: 'Present' },
          { key: 'absentCount', label: 'Absent' },
        ];
      case 'Remarks Detail':
        return [
          { key: 'admissionNo', label: 'Admission No' },
          { key: 'studentName', label: 'Student' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'remarks', label: 'Remarks' },
          { key: 'submittedAt', label: 'Submitted At' },
        ];
      case 'Per-Batch Breakdown':
        return [
          { key: 'examCode', label: 'Exam' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'batchName', label: 'Batch Name' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'completed', label: 'Completed' },
          { key: 'completionPct', label: 'Completion %' },
        ];
      default:
        return [];
    }
  }

  exportToExcel() {
    if (!this.reportTableData.length || !this.selectedReport) return;
    const headers = this.reportColumns.map((c: any) => c.label);
    const keys = this.reportColumns.map((c: any) => c.key);
    const rows = this.reportTableData.map((row: any) =>
      keys.reduce((obj: any, key: string, idx: number) => {
        let val = row[key];
        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
        obj[headers[idx]] = val ?? '';
        return obj;
      }, {}),
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.selectedReport.label);
    XLSX.writeFile(
      wb,
      `${this.selectedReport.label.replace(/\s+/g, '_')}_Report.xlsx`,
    );
  }

  formatCellValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  formatSummaryKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  formatEpoch(epoch: number): string {
    if (!epoch) return '-';
    return new Date(epoch).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  needsBatchFilter(): boolean {
    if (!this.selectedReport) return false;
    return (
      this.selectedReport.key.startsWith('batch-') &&
      this.selectedReport.key !== 'batch-info'
    );
  }

  needsDateFilter(): boolean {
    if (!this.selectedReport) return false;
    return [
      'batch-timetable',
      'batch-late-entries',
      'batch-feedback',
      'batch-ptm',
      'batch-subject-hours',
      'student-attendance',
      'student-remarks',
      'student-late-entries',
      'teacher-tasks',
      'teacher-late-entries',
      'teacher-early-leaving',
      'teacher-assignments',
      'teacher-attendance',
      'teacher-feedback',
      'teacher-exams',
    ].includes(this.selectedReport.key);
  }

  needsStudentFilter(): boolean {
    if (!this.selectedReport) return false;
    return this.selectedReport.key.startsWith('student-');
  }

  needsBatchFilterForStudent(): boolean {
    if (!this.selectedReport) return false;
    return this.selectedReport.key.startsWith('student-');
  }

  needsStaffFilter(): boolean {
    if (!this.selectedReport) return false;
    return this.selectedReport.key.startsWith('teacher-');
  }

  needsBatchFilterForTeacher(): boolean {
    if (!this.selectedReport) return false;
    return [
      'teacher-late-entries',
      'teacher-early-leaving',
      'teacher-assignments',
      'teacher-attendance',
      'teacher-feedback',
      'teacher-exams',
    ].includes(this.selectedReport.key);
  }

  canGenerate(): boolean {
    if (!this.selectedReport) return false;
    const key = this.selectedReport.key;
    const needsDates = [
      'batch-late-entries',
      'batch-timetable',
      'teacher-late-entries',
      'teacher-early-leaving',
      'teacher-attendance',
    ].includes(key);
    if (needsDates && (!this.fromDate || !this.toDate)) return false;
    if (key === 'student-attendance' && (!this.fromDate || !this.toDate))
      return false;
    if (this.needsStudentFilter() && !this.selectedAdmissionNo) return false;
    if (this.needsStaffFilter() && !this.selectedStaffId) return false;
    return true;
  }

  get hasPhaseDetail(): boolean {
    return (
      this.selectedReport?.key === 'batch-phase-allotment' &&
      this.phaseDetailData.length > 0
    );
  }

  get hasStaffSummary(): boolean {
    return (
      this.selectedReport?.key === 'batch-feedback' &&
      this.staffSummaryData.length > 0
    );
  }

  get hasSchoolAttDetail(): boolean {
    return (
      this.selectedReport?.key === 'student-attendance' &&
      this.schoolAttData.length > 0
    );
  }

  get hasSubjectSummary(): boolean {
    return (
      this.selectedReport?.key === 'student-attendance' &&
      this.subjectSummaryData.length > 0
    );
  }

  get hasPeriodDetail(): boolean {
    return (
      this.selectedReport?.key === 'teacher-attendance' &&
      this.periodDetailData.length > 0
    );
  }

  get hasRemarksDetail(): boolean {
    return (
      this.selectedReport?.key === 'teacher-feedback' &&
      this.remarksDetailData.length > 0
    );
  }

  get hasExamBatchDetail(): boolean {
    return (
      this.selectedReport?.key === 'teacher-exams' &&
      this.examBatchData.length > 0
    );
  }

  get allProgramsSelected(): boolean {
    return (
      this.programOptions.length > 0 &&
      this.selectedProgramIds.length === this.programOptions.length
    );
  }

  get programSelectionLabel(): string {
    if (!this.selectedProgramIds.length) return 'All Programs';
    if (this.allProgramsSelected) return 'All Programs';
    if (this.selectedProgramIds.length === 1)
      return (
        this.programOptions.find((p) => p.value === this.selectedProgramIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedProgramIds.length} programs selected`;
  }

  get filteredProgramOptions(): any[] {
    const q = this.programSearch.toLowerCase().trim();
    return q
      ? this.programOptions.filter((p) => p.label.toLowerCase().includes(q))
      : this.programOptions;
  }

  get allCentersSelected(): boolean {
    return (
      this.centerOptions.length > 0 &&
      this.selectedCenterIds.length === this.centerOptions.length
    );
  }

  get centerSelectionLabel(): string {
    if (!this.selectedCenterIds.length) return 'All Centers';
    if (this.allCentersSelected) return 'All Centers';
    if (this.selectedCenterIds.length === 1)
      return (
        this.centerOptions.find((c) => c.value === this.selectedCenterIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedCenterIds.length} centers selected`;
  }

  get filteredCenterOptions(): any[] {
    const q = this.centerSearch.toLowerCase().trim();
    return q
      ? this.centerOptions.filter((c) => c.label.toLowerCase().includes(q))
      : this.centerOptions;
  }

  toggleProgramDropdown() {
    this.programDropdownOpen = !this.programDropdownOpen;
  }

  toggleCenterDropdown() {
    this.centerDropdownOpen = !this.centerDropdownOpen;
  }

  isProgramSelected(value: string): boolean {
    return this.selectedProgramIds.includes(value);
  }

  isCenterSelected(value: string): boolean {
    return this.selectedCenterIds.includes(value);
  }

  toggleProgramSelection(value: string) {
    if (this.isProgramSelected(value))
      this.selectedProgramIds = this.selectedProgramIds.filter(
        (id) => id !== value,
      );
    else this.selectedProgramIds = [...this.selectedProgramIds, value];
  }

  toggleSelectAllPrograms() {
    if (this.allProgramsSelected) this.selectedProgramIds = [];
    else this.selectedProgramIds = this.programOptions.map((p) => p.value);
  }

  toggleCenterSelection(value: string) {
    if (this.isCenterSelected(value))
      this.selectedCenterIds = this.selectedCenterIds.filter(
        (id) => id !== value,
      );
    else this.selectedCenterIds = [...this.selectedCenterIds, value];
  }

  toggleSelectAllCenters() {
    if (this.allCentersSelected) this.selectedCenterIds = [];
    else this.selectedCenterIds = this.centerOptions.map((c) => c.value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.batch-multiselect-wrapper'))
      this.batchDropdownOpen = false;
    if (!target.closest('.student-batch-multiselect-wrapper')) {
      this.studentBatchDropdownOpen = false;
      this.studentBatchSearch = '';
    }
    if (!target.closest('.teacher-batch-multiselect-wrapper')) {
      this.teacherBatchDropdownOpen = false;
      this.teacherBatchSearch = '';
    }
    if (!target.closest('.program-multiselect-wrapper')) {
      this.programDropdownOpen = false;
      this.programSearch = '';
    }
    if (!target.closest('.center-multiselect-wrapper')) {
      this.centerDropdownOpen = false;
      this.centerSearch = '';
    }
  }

  formatHours(decimalHours: any): string {
    if (
      decimalHours === null ||
      decimalHours === undefined ||
      decimalHours === ''
    )
      return '-';
    const total = Math.round(Number(decimalHours) * 60);
    if (!Number.isFinite(total)) return '-';
    const hrs = Math.floor(total / 60);
    const mins = total % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
  }
}
