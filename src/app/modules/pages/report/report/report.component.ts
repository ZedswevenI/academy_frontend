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
  selector: 'app-report',
  standalone: false,
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent implements OnInit {

  tenantId = '';
  activeTab: 'batch' | 'student' | 'teacher' = 'batch';

  /* ================= REPORT DEFINITIONS ================= */
  batchReports: ReportItem[] = [
    { key: 'batch-info', label: 'Batch Info', icon: 'fa-solid fa-building', description: 'Overview of all batches with student & staff counts' },
    { key: 'batch-students', label: 'Student List', icon: 'fa-solid fa-users', description: 'Students enrolled in a batch' },
    { key: 'batch-staff', label: 'Staff List', icon: 'fa-solid fa-chalkboard-teacher', description: 'Teaching staff assigned to a batch' },
    { key: 'batch-timetable', label: 'Timetable', icon: 'fa-solid fa-calendar-week', description: 'Daily timetable with periods & subjects' },
    { key: 'batch-late-entries', label: 'Late Entries', icon: 'fa-solid fa-clock', description: 'Late arrivals & early departures in a batch' },
    { key: 'batch-phase-allotment', label: 'Phase Allotment', icon: 'fa-solid fa-tasks', description: 'Subject phase plan progress & allotment' },
    { key: 'batch-subject-hours', label: 'Subject Hours', icon: 'fa-solid fa-hourglass-half', description: 'Hours allotted per subject in a batch' },
    { key: 'batch-assignments', label: 'Assignments', icon: 'fa-solid fa-file-alt', description: 'Assignment completion status per batch' },
    { key: 'batch-exams', label: 'Exams', icon: 'fa-solid fa-graduation-cap', description: 'Mock exam completion status per batch' },
    { key: 'batch-feedback', label: 'PTM Feedback', icon: 'fa-solid fa-comments', description: 'PTM feedback & remarks summary' },
    { key: 'batch-ptm', label: 'PTM Sessions', icon: 'fa-solid fa-handshake', description: 'PTM session-level completion report' }
  ];

  studentReports: ReportItem[] = [
    { key: 'student-attendance', label: 'Attendance', icon: 'fa-solid fa-clipboard-check', description: 'Period & school attendance with subject breakdown' },
    { key: 'student-remarks', label: 'Remarks', icon: 'fa-solid fa-comment-dots', description: 'Academic & behavioural remarks for a student' },
    { key: 'student-late-entries', label: 'Late Entries', icon: 'fa-solid fa-clock', description: 'Late arrivals & early departures for a student' }
  ];

  teacherReports: ReportItem[] = [
    { key: 'teacher-batches', label: 'Batches', icon: 'fa-solid fa-layer-group', description: 'Batches assigned to a teacher' },
    { key: 'teacher-tasks', label: 'Tasks', icon: 'fa-solid fa-list-check', description: 'Task completion & delay report' },
    { key: 'teacher-late-entries', label: 'Late Entries', icon: 'fa-solid fa-clock', description: 'Late entry records for a teacher' },
    { key: 'teacher-early-leaving', label: 'Early Leaving', icon: 'fa-solid fa-right-from-bracket', description: 'Early leaving records for a teacher' },
    { key: 'teacher-assignments', label: 'Assignments', icon: 'fa-solid fa-file-alt', description: 'Assignments created & completion rates' },
    { key: 'teacher-attendance', label: 'Attendance Marking', icon: 'fa-solid fa-clipboard-check', description: 'Period attendance marking report' },
    { key: 'teacher-feedback', label: 'PTM Feedback', icon: 'fa-solid fa-comments', description: 'PTM feedback given by a teacher' },
    { key: 'teacher-exams', label: 'Exams', icon: 'fa-solid fa-graduation-cap', description: 'Exams managed by a teacher' }
  ];

  /* ================= SELECTED REPORT ================= */
  selectedReport: ReportItem | null = null;
  reportLoading = false;
  reportData: any = null;
  reportTableData: any[] = [];
  reportColumns: any[] = [];
  reportSummary: any = null;
  summaryItems: { label: string; value: any }[] = [];

  /* ================= FILTERS ================= */
  // Batch filters
  batchOptions: any[] = [];
  selectedBatchId = '';
  selectedBatchCode = '';
  // Multi-select for all tabs
  selectedBatchIds: string[] = [];
  selectedBatchCodes: string[] = [];
  batchDropdownOpen = false;
  studentBatchDropdownOpen = false;
  teacherBatchDropdownOpen = false;
  studentBatchSearch = '';
  teacherBatchSearch = '';

  // Student filters
  studentSearch = '';
  studentOptions: any[] = [];
  selectedStudentId = '';
  selectedAdmissionNo = '';

  // Staff filters
  staffOptions: any[] = [];
  filteredStaffOptions: any[] = [];
  staffSearch = '';
  selectedStaffId = '';

  // Common filters
  fromDate = '';
  toDate = '';
  filterStatus = '';
  filterSubjectId = '';
  filterType = '';
  filterEntryType = '';

  // Dropdown data
  subjectOptions: any[] = [];
  programOptions: any[] = [];
  centerOptions: any[] = [];

  constructor(
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId') || '';
  }

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Reports' }]);
    this.loadBatches();
    this.loadStaff();
  }

  /* ================= TAB ================= */

  switchTab(tab: 'batch' | 'student' | 'teacher') {
    this.activeTab = tab;
    this.clearReport();
  }

  /* ================= SELECT REPORT ================= */

  selectReport(report: ReportItem) {
    this.selectedReport = report;
    this.reportData = null;
    this.reportTableData = [];
    this.reportColumns = [];
    this.reportSummary = null;
    this.resetFilters();

    // Load dependent data
    if (report.key.startsWith('batch-') && report.key !== 'batch-info') {
      // need batch selector
    }
    if (report.key === 'batch-info') {
      this.loadPrograms();
      this.loadCenters();
    }
    if (report.key === 'batch-phase-allotment' || report.key === 'batch-assignments' || report.key === 'batch-subject-hours') {
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
    this.resetFilters();
  }

  resetFilters() {
    this.fromDate = '';
    this.toDate = '';
    this.filterStatus = '';
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
  }

  /* ================= LOAD MASTERS ================= */

  private loadBatches() {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full').subscribe({
      next: (res: any) => {
        this.batchOptions = (res?.data || []).map((b: any) => ({
          value: b.batchId || b._id,
          label: b.batchCode + ' - ' + b.batchName,
          batchCode: b.batchCode,
          batchId: b.batchId || b._id
        }));
      }
    });
  }

  private loadStaff() {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/staff', 'list?list=full').subscribe({
      next: (res: any) => {
        this.staffOptions = (res?.data || []).map((s: any) => ({
          value: s.staffId || s._id,
          label: (s.staffCode ? s.staffCode + ' - ' : '') + s.staffName
        }));
        this.filteredStaffOptions = [...this.staffOptions];
      }
    });
  }

  filterStaffOptions() {
    const q = (this.staffSearch || '').toLowerCase().trim();
    if (!q) {
      this.filteredStaffOptions = [...this.staffOptions];
    } else {
      this.filteredStaffOptions = this.staffOptions.filter((s: any) =>
        s.label.toLowerCase().includes(q)
      );
    }
  }

  private loadSubjects() {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => {
        this.subjectOptions = (res?.data || []).map((s: any) => ({
          value: s._id,
          label: s.subjectName
        }));
      }
    });
  }

  private loadPrograms() {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'program', 'list?list=full').subscribe({
      next: (res: any) => {
        this.programOptions = (res?.data || []).map((p: any) => ({
          value: p._id,
          label: p.programName
        }));
      }
    });
  }

  private loadCenters() {
    this.commonApi.fetchData({ entiId: this.tenantId }, 'center', 'list?list=full').subscribe({
      next: (res: any) => {
        this.centerOptions = (res?.data || []).map((c: any) => ({
          value: c._id,
          label: c.centerName
        }));
      }
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

  /* ── Multi-select batch (batch reports only) ── */
  get allBatchesSelected(): boolean {
    return this.batchOptions.length > 0 && this.selectedBatchIds.length === this.batchOptions.length;
  }

  get batchSelectionLabel(): string {
    if (!this.selectedBatchIds.length) return 'All Batches';
    if (this.allBatchesSelected) return 'All Batches';
    if (this.selectedBatchIds.length === 1) {
      return this.batchOptions.find((b: any) => b.value === this.selectedBatchIds[0])?.label || '1 selected';
    }
    return `${this.selectedBatchIds.length} batches selected`;
  }

  toggleBatchDropdown() {
    this.batchDropdownOpen = !this.batchDropdownOpen;
  }

  closeBatchDropdown() {
    this.batchDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.batch-multiselect-wrapper')) this.batchDropdownOpen = false;
    if (!target.closest('.student-batch-multiselect-wrapper')) { this.studentBatchDropdownOpen = false; this.studentBatchSearch = ''; }
    if (!target.closest('.teacher-batch-multiselect-wrapper')) { this.teacherBatchDropdownOpen = false; this.teacherBatchSearch = ''; }
  }

  /* ── Multi-select batch (student reports) ── */
  get allStudentBatchesSelected(): boolean {
    return this.batchOptions.length > 0 && this.selectedBatchIds.length === this.batchOptions.length;
  }

  get studentBatchSelectionLabel(): string {
    if (!this.selectedBatchIds.length) return 'All Batches';
    if (this.allStudentBatchesSelected) return 'All Batches';
    if (this.selectedBatchIds.length === 1)
      return this.batchOptions.find((b: any) => b.value === this.selectedBatchIds[0])?.label || '1 selected';
    return `${this.selectedBatchIds.length} batches selected`;
  }

  get filteredStudentBatchOptions(): any[] {
    const q = this.studentBatchSearch.toLowerCase().trim();
    return q ? this.batchOptions.filter((b: any) => b.label.toLowerCase().includes(q)) : this.batchOptions;
  }

  get filteredTeacherBatchOptions(): any[] {
    const q = this.teacherBatchSearch.toLowerCase().trim();
    return q ? this.batchOptions.filter((b: any) => b.label.toLowerCase().includes(q)) : this.batchOptions;
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

  /* ── Multi-select batch (teacher reports) ── */
  get allTeacherBatchesSelected(): boolean {
    return this.batchOptions.length > 0 && this.selectedBatchIds.length === this.batchOptions.length;
  }

  get teacherBatchSelectionLabel(): string {
    if (!this.selectedBatchIds.length) return 'All Batches';
    if (this.allTeacherBatchesSelected) return 'All Batches';
    if (this.selectedBatchIds.length === 1)
      return this.batchOptions.find((b: any) => b.value === this.selectedBatchIds[0])?.label || '1 selected';
    return `${this.selectedBatchIds.length} batches selected`;
  }

  toggleTeacherBatchDropdown() {
    this.teacherBatchDropdownOpen = !this.teacherBatchDropdownOpen;
    if (!this.teacherBatchDropdownOpen) this.teacherBatchSearch = '';
  }

  toggleSelectAllTeacherBatches() { this.toggleSelectAllBatches(); }

  isBatchSelected(value: string): boolean {
    return this.selectedBatchIds.includes(value);
  }

  toggleBatchSelection(value: string) {
    const batch = this.batchOptions.find((b: any) => b.value === value);
    if (this.isBatchSelected(value)) {
      this.selectedBatchIds = this.selectedBatchIds.filter((id) => id !== value);
      this.selectedBatchCodes = this.selectedBatchCodes.filter((c) => c !== batch?.batchCode);
    } else {
      this.selectedBatchIds = [...this.selectedBatchIds, value];
      if (batch?.batchCode) this.selectedBatchCodes = [...this.selectedBatchCodes, batch.batchCode];
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
    if (!batchIds.length) { this.studentOptions = []; return; }
    const endpoint = `list?list=full&batchIds=${batchIds.join(',')}`;
    this.commonApi.fetchData({ entiId: this.tenantId }, 'student', endpoint).subscribe({
      next: (res: any) => {
        this.studentOptions = (res?.data || []).map((s: any) => ({
          value: s.studentId || s._id,
          label: (s.admissionNo || '') + ' - ' + (s.student?.name || s.name || s.studentName || ''),
          admissionNo: s.admissionNo,
          studentId: s.studentId || s._id
        }));
      }
    });
  }

  searchStudents() {
    if (!this.studentSearch || this.studentSearch.length < 2) return;
    const query: any = { entiId: this.tenantId };
    let endpoint = `list?search=${this.studentSearch}&list=full`;
    if (this.selectedBatchIds.length) endpoint += `&batchIds=${this.selectedBatchIds.join(',')}`;
    this.commonApi.fetchData(query, 'student', endpoint).subscribe({
      next: (res: any) => {
        this.studentOptions = (res?.data || []).map((s: any) => ({
          value: s.studentId || s._id,
          label: (s.admissionNo || '') + ' - ' + (s.student?.name || s.name || s.studentName || ''),
          admissionNo: s.admissionNo,
          studentId: s.studentId || s._id
        }));
      }
    });
  }

  onStudentChange(val: string) {
    const student = this.studentOptions.find((s: any) => s.value === val);
    this.selectedAdmissionNo = student?.admissionNo || '';
    this.selectedStudentId = val;
  }

  /* ================= GENERATE REPORT ================= */

  generateReport() {
    if (!this.selectedReport) return;
    this.reportLoading = true;
    this.reportData = null;
    this.reportTableData = [];

    const key = this.selectedReport.key;
    let module = '';
    let endpoint = '';
    const payload: any = { entiId: this.tenantId };

    // Build payload based on report key
    switch (key) {
      case 'batch-info':
        module = 'reports/batch'; endpoint = 'batch-info';
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'batch-students':
        module = 'reports/batch'; endpoint = 'students';
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'batch-staff':
        module = 'reports/batch'; endpoint = 'staff';
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
        break;
      case 'batch-timetable':
        module = 'reports/batch'; endpoint = 'timetable';
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'batch-late-entries':
        module = 'reports/batch'; endpoint = 'late-entries';
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterType) payload.type = this.filterType;
        if (this.filterEntryType) payload.entryType = this.filterEntryType;
        break;
      case 'batch-phase-allotment':
        module = 'reports/batch'; endpoint = 'phase-allotment';
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        break;
      case 'batch-subject-hours':
        module = 'reports/batch'; endpoint = 'subject-hours';
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
        break;
      case 'batch-assignments':
        module = 'reports/batch'; endpoint = 'assignments';
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        break;
      case 'batch-exams':
        module = 'reports/batch'; endpoint = 'exams';
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
        break;
      case 'batch-feedback':
        module = 'reports/batch'; endpoint = 'feedback';
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'batch-ptm':
        module = 'reports/batch'; endpoint = 'ptm';
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterStatus) payload.status = this.filterStatus;
        break;

      // Student reports
      case 'student-attendance':
        module = 'reports/student'; endpoint = 'attendance';
        payload.admissionNo = this.selectedAdmissionNo;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'student-remarks':
        module = 'reports/student'; endpoint = 'remarks';
        payload.admissionNo = this.selectedAdmissionNo;
        if (this.filterType) payload.type = this.filterType;
        if (this.filterStatus) payload.status = this.filterStatus;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'student-late-entries':
        module = 'reports/student'; endpoint = 'late-entries';
        payload.admissionNo = this.selectedAdmissionNo;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterEntryType) payload.entryType = this.filterEntryType;
        break;

      // Teacher reports
      case 'teacher-batches':
        module = 'reports/teacher'; endpoint = 'batches';
        payload.staffId = this.selectedStaffId;
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'teacher-tasks':
        module = 'reports/teacher'; endpoint = 'tasks';
        payload.staffId = this.selectedStaffId;
        if (this.filterStatus) payload.status = this.filterStatus;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-late-entries':
        module = 'reports/teacher'; endpoint = 'late-entries';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-early-leaving':
        module = 'reports/teacher'; endpoint = 'early-leaving';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-assignments':
        module = 'reports/teacher'; endpoint = 'assignments';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-attendance':
        module = 'reports/teacher'; endpoint = 'attendance';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-feedback':
        module = 'reports/teacher'; endpoint = 'feedback';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchCodes.length) payload.batchCodes = this.selectedBatchCodes;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'teacher-exams':
        module = 'reports/teacher'; endpoint = 'exams';
        payload.staffId = this.selectedStaffId;
        if (this.selectedBatchIds.length) payload.batchIds = this.selectedBatchIds;
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
      }
    });
  }

  /* ================= BUILD TABLE ================= */

  private buildTable(key: string, res: any) {
    const data = res.data || [];
    this.reportSummary = res.summary || res.batchSummary || null;
    this.summaryItems = [];
    if (this.reportSummary && typeof this.reportSummary === 'object') {
      Object.keys(this.reportSummary).forEach(key => {
        const val = this.reportSummary[key];
        if (val !== null && val !== undefined && typeof val !== 'object') {
          this.summaryItems.push({ label: this.formatSummaryKey(key), value: val });
        }
      });
    }

    switch (key) {
      case 'batch-info':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'batchCode', label: 'Batch Code' },
          { key: 'batchName', label: 'Batch Name' }, { key: 'programName', label: 'Program' },
          { key: 'centerName', label: 'Center' }, { key: 'academicYear', label: 'Year' },
          { key: 'studentCount', label: 'Students' }, { key: 'staffCount', label: 'Staff' },
          { key: 'classTeacherName', label: 'Class Teacher' }, { key: 'status', label: 'Status' }
        ];
        this.reportTableData = data.map((r: any, i: number) => ({ slNo: i + 1, ...r }));
        break;

      case 'batch-students':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          ...(!this.selectedBatchIds.length || this.allBatchesSelected ? [{ key: 'batchCode', label: 'Batch' }] : []),
          { key: 'admissionNo', label: 'Admission No' },
          { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' }, { key: 'parentName', label: 'Parent' },
          { key: 'parentPhone', label: 'Parent Phone' }, { key: 'gender', label: 'Gender' },
          { key: 'status', label: 'Status' }
        ];
        this.reportTableData = data;
        break;

      case 'batch-staff':
        this.reportColumns = [
          { key: 'slNo', label: '#' },
          ...(!this.selectedBatchIds.length || this.allBatchesSelected ? [{ key: 'batchLabel', label: 'Batch' }] : []),
          { key: 'staffName', label: 'Name' },
          { key: 'staffCode', label: 'Code' }, { key: 'subjectName', label: 'Subject' },
          { key: 'facultyType', label: 'Type' }, { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' }
        ];
        this.reportTableData = (res.currentStaff || []).map((r: any) => ({
          ...r,
          batchLabel: r.batchName && r.batchCode ? `${r.batchName} (${r.batchCode})` : (r.batchName || r.batchCode || '')
        }));
        break;

      case 'batch-timetable':
        this.reportColumns = [
          { key: 'dateFormatted', label: 'Date' }, { key: 'day', label: 'Day' },
          { key: 'periodNo', label: 'Period' }, { key: 'subjectName', label: 'Subject' },
          { key: 'facultyName', label: 'Faculty' }, { key: 'startTime', label: 'Start' },
          { key: 'endTime', label: 'End' }, { key: 'venue', label: 'Venue' },
          { key: 'topic', label: 'Topic' }
        ];
        const ttRows: any[] = [];
        (data || []).forEach((d: any) => {
          (d.periods || []).forEach((p: any) => {
            ttRows.push({ dateFormatted: this.formatEpoch(d.date), day: d.day, ...p });
          });
        });
        this.reportTableData = ttRows;
        break;

      case 'batch-late-entries':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'personName', label: 'Name' },
          { key: 'type', label: 'Type' }, { key: 'entryType', label: 'Entry Type' },
          { key: 'dateFormatted', label: 'Date' }, { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' }, { key: 'reason', label: 'Reason' }
        ];
        this.reportTableData = data;
        break;

      case 'batch-phase-allotment':
        this.reportColumns = [
          { key: 'subjectName', label: 'Subject' }, { key: 'subjectCode', label: 'Code' },
          { key: 'totalEstHours', label: 'Est Hours' }, { key: 'totalAllottedHours', label: 'Allotted' },
          { key: 'totalRemainingHours', label: 'Remaining' }, { key: 'overallProgressPct', label: 'Progress %' }
        ];
        this.reportTableData = data;
        break;

      case 'batch-subject-hours':
        this.reportColumns = [
          { key: 'subjectName', label: 'Subject' }, { key: 'subjectCode', label: 'Code' },
          { key: 'allottedHours', label: 'Allotted Hours' }, { key: 'allottedMinutes', label: 'Allotted Minutes' }
        ];
        this.reportTableData = data;
        break;

      case 'batch-assignments':
        this.reportColumns = [
          { key: 'testCode', label: 'Code' }, { key: 'subjectName', label: 'Subject' },
          { key: 'totalStudents', label: 'Students' }, { key: 'completed', label: 'Completed' },
          { key: 'inProgress', label: 'In Progress' }, { key: 'assigned', label: 'Assigned' },
          { key: 'completionPct', label: 'Completion %' }
        ];
        this.reportTableData = data;
        break;

      case 'batch-exams':
        this.reportColumns = [
          { key: 'examCode', label: 'Code' }, { key: 'examName', label: 'Name' },
          { key: 'totalMarks', label: 'Marks' }, { key: 'duration', label: 'Duration' },
          { key: 'totalStudents', label: 'Students' }, { key: 'completed', label: 'Completed' },
          { key: 'completionPct', label: 'Completion %' }, { key: 'examStatus', label: 'Status' }
        ];
        this.reportTableData = data;
        break;

      case 'batch-feedback':
        this.reportColumns = [
          { key: 'admissionNo', label: 'Admission No' }, { key: 'studentName', label: 'Student' },
          { key: 'status', label: 'Status' }, { key: 'ptmDateFormatted', label: 'PTM Date' },
          { key: 'staffFeedbackCount', label: 'Feedbacks' }
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          ptmDateFormatted: this.formatEpoch(r.ptmDate)
        }));
        break;

      case 'batch-ptm':
        this.reportColumns = [
          { key: 'ptmDateFormatted', label: 'Date' }, { key: 'venue', label: 'Venue' },
          { key: 'totalStudents', label: 'Students' }, { key: 'completed', label: 'Completed' },
          { key: 'noShow', label: 'No Show' }, { key: 'cancelled', label: 'Cancelled' },
          { key: 'prePtmSubmissionPct', label: 'Pre-PTM %' }, { key: 'postPtmSubmissionPct', label: 'Post-PTM %' }
        ];
        this.reportTableData = (res.sessions || []).map((s: any) => ({
          ...s,
          ptmDateFormatted: this.formatEpoch(s.ptmDate)
        }));
        break;

      // Student reports
      case 'student-attendance':
        this.reportColumns = [
          { key: 'dateFormatted', label: 'Date' }, { key: 'periodNo', label: 'Period' },
          { key: 'subjectId', label: 'Subject' }, { key: 'status', label: 'Status' },
          { key: 'remarks', label: 'Remarks' }, { key: 'topicTaught', label: 'Topic' }
        ];
        this.reportTableData = res.data?.periodAttendance?.detail || data?.periodAttendance?.detail || [];
        this.reportSummary = {
          periodTotal: res.data?.periodAttendance?.total || 0,
          periodPresent: res.data?.periodAttendance?.present || 0,
          periodAbsent: res.data?.periodAttendance?.absent || 0,
          periodPresentPct: res.data?.periodAttendance?.presentPct || 0,
          schoolTotal: res.data?.schoolAttendance?.total || 0,
          schoolPresent: res.data?.schoolAttendance?.present || 0,
          schoolPresentPct: res.data?.schoolAttendance?.presentPct || 0
        };
        break;

      case 'student-remarks':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'type', label: 'Type' },
          { key: 'dateFormatted', label: 'Date' }, { key: 'remark', label: 'Remark' },
          { key: 'status', label: 'Status' }
        ];
        this.reportTableData = data;
        break;

      case 'student-late-entries':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'entryType', label: 'Type' },
          { key: 'dateFormatted', label: 'Date' }, { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' }, { key: 'reason', label: 'Reason' }
        ];
        this.reportTableData = data;
        break;

      // Teacher reports
      case 'teacher-batches':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch Code' }, { key: 'batchName', label: 'Batch' },
          { key: 'programName', label: 'Program' }, { key: 'subjectName', label: 'Subject' },
          { key: 'academicYear', label: 'Year' }, { key: 'studentCount', label: 'Students' },
          { key: 'isClassTeacher', label: 'Class Teacher' }, { key: 'status', label: 'Status' }
        ];
        this.reportTableData = data;
        break;

      case 'teacher-tasks':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'taskName', label: 'Task' },
          { key: 'dueDateFormatted', label: 'Due Date' }, { key: 'status', label: 'Status' },
          { key: 'isDelayed', label: 'Delayed' }, { key: 'daysOverdue', label: 'Overdue Days' },
          { key: 'remarks', label: 'Remarks' }
        ];
        this.reportTableData = data;
        break;

      case 'teacher-late-entries':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' }, { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' }, { key: 'reason', label: 'Reason' }
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          batchLabel: r.batchName && r.batchCode ? `${r.batchName} (${r.batchCode})` : (r.batchName || r.batchCode || '')
        }));
        break;

      case 'teacher-early-leaving':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'dateFormatted', label: 'Date' },
          { key: 'batchLabel', label: 'Batch' }, { key: 'periodNo', label: 'Period' },
          { key: 'earlyByMinutes', label: 'Early (min)' }, { key: 'reason', label: 'Reason' }
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          batchLabel: r.batchName && r.batchCode ? `${r.batchName} (${r.batchCode})` : (r.batchName || r.batchCode || '')
        }));
        break;

      case 'teacher-assignments':
        this.reportColumns = [
          { key: 'slNo', label: '#' }, { key: 'batchLabel', label: 'Batch' },
          { key: 'subjectName', label: 'Subject' }, { key: 'enabledAtFormatted', label: 'Enabled' },
          { key: 'totalStudents', label: 'Students' }, { key: 'completed', label: 'Completed' },
          { key: 'completionPct', label: 'Completion %' }
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          batchLabel: r.batchName && r.batchCode ? `${r.batchName} (${r.batchCode})` : (r.batchName || r.batchCode || '')
        }));
        break;

      case 'teacher-attendance':
        this.reportColumns = [
          { key: 'dateFormatted', label: 'Date' }, { key: 'day', label: 'Day' },
          { key: 'totalPeriods', label: 'Total Periods' }, { key: 'markedCount', label: 'Marked' },
          { key: 'notMarkedCount', label: 'Not Marked' }
        ];
        this.reportTableData = data;
        break;

      case 'teacher-feedback':
        this.reportColumns = [
          { key: 'admissionNo', label: 'Admission No' }, { key: 'studentName', label: 'Student' },
          { key: 'batchLabel', label: 'Batch' }, { key: 'ptmDateFormatted', label: 'PTM Date' },
          { key: 'ptmStatus', label: 'Status' }
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          ptmDateFormatted: this.formatEpoch(r.ptmDate),
          batchLabel: r.batchName && r.batchCode ? `${r.batchName} (${r.batchCode})` : (r.batchName || r.batchCode || '')
        }));
        break;

      case 'teacher-exams':
        this.reportColumns = [
          { key: 'examCode', label: 'Code' }, { key: 'examName', label: 'Name' },
          { key: 'totalMarks', label: 'Marks' }, { key: 'examStatus', label: 'Status' },
          { key: 'totalStudents', label: 'Students' }, { key: 'totalCompleted', label: 'Completed' },
          { key: 'overallCompletionPct', label: 'Completion %' }
        ];
        this.reportTableData = data;
        break;

      default:
        this.reportTableData = data;
    }
  }

  /* ================= EXPORT EXCEL ================= */

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
      }, {})
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.selectedReport.label);
    XLSX.writeFile(wb, `${this.selectedReport.label.replace(/\s+/g, '_')}_Report.xlsx`);
  }

  /* ================= HELPERS ================= */

  formatCellValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  formatSummaryKey(key: string): string {
    // camelCase to Title Case
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  formatEpoch(epoch: number): string {
    if (!epoch) return '-';
    const d = new Date(epoch);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  needsBatchFilter(): boolean {
    if (!this.selectedReport) return false;
    const key = this.selectedReport.key;
    return key.startsWith('batch-') && key !== 'batch-info';
  }

  showBatchDropdown(): boolean {
    if (!this.selectedReport) return false;
    return this.needsBatchFilter() || this.needsBatchFilterForStudent() || this.needsBatchFilterForTeacher();
  }

  isBatchRequired(): boolean {
    return false;
  }

  needsDateFilter(): boolean {
    if (!this.selectedReport) return false;
    return ['batch-timetable', 'batch-late-entries', 'batch-feedback', 'batch-ptm',
      'student-attendance', 'student-remarks', 'student-late-entries',
      'teacher-tasks', 'teacher-late-entries', 'teacher-early-leaving',
      'teacher-assignments', 'teacher-attendance', 'teacher-feedback', 'teacher-exams'
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
    const batchRelevant = ['teacher-late-entries', 'teacher-early-leaving', 'teacher-assignments', 'teacher-attendance', 'teacher-feedback', 'teacher-exams'];
    return batchRelevant.includes(this.selectedReport.key);
  }

  canGenerate(): boolean {
    if (!this.selectedReport) return false;
    if (this.needsStudentFilter() && !this.selectedAdmissionNo) return false;
    if (this.needsStaffFilter() && !this.selectedStaffId) return false;
    return true;
  }
}
