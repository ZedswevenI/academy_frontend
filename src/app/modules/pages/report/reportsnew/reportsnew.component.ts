import { Component, OnInit, HostListener } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  activeTab: 'batch' | 'student' | 'teacher' | 'assignments' = 'batch';
  batchReports: ReportItem[] = [
    {
      key: 'batch-info',
      label: 'Batch Details',
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
      key: 'teacher-faculty-report',
      label: 'Faculty Report',
      icon: 'fa-solid fa-user-tie',
      description:
        'Comprehensive faculty report with teaching hours, tasks, attendance and more',
    },
    {
      key: 'teacher-batches',
      label: 'Batches',
      icon: 'fa-solid fa-layer-group',
      description: 'Batches assigned to a teacher',
    },
    {
      key: 'teacher-load',
      label: 'Faculty Load',
      icon: 'fa-solid fa-weight-hanging',
      description: 'Scheduled hours per staff across batches and subjects',
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
  assignmentReports: ReportItem[] = [
    {
      key: 'batch-assignment-report',
      label: 'Tab Assignment Report',
      icon: 'fa-solid fa-file-alt',
      description: 'Batch-wise and student-wise assignment scores',
    },
    {
      key: 'batch-slash-detail',
      label: 'Slash Report',
      icon: 'fa-solid fa-chart-pie',
      description: 'Assignment completion per student per topic',
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
  cgpaStudentDetail: any[] = [];
  facultyLoadDetail: any[] = [];
  filterCenterIds: string[] = [];
  selectedStudentIds: string[] = [];
  selectedAdmissionNos: string[] = [];
  studentDropdownOpen = false;
  attendanceDetailData: any[] = [];
  remarksDetailData2: any[] = [];
  lateEntriesDetailData: any[] = [];
  readonly maskedColumns = new Set([
    'phone',
    'phone1',
    'phone2',
    'email',
    'email1',
    'email2',
    'parentPhone',
  ]);
  revealedColumns: Set<string> = new Set();
  phaseAllotmentBatchOptions: any[] = [];
  allBatchesFullList: any[] = [];
  assignmentReportView: 'batch' | 'student' = 'batch';
  assignmentBatchResults: any[] = [];
  assignmentStudentResults: any[] = [];
  slashTopicOptions: any[] = [];
  selectedTopicIds: string[] = [];
  topicDropdownOpen = false;
  topicSearch = '';
  selectedStaffIds: string[] = [];
  staffMultiSelectDropdownOpen = false;
  staffMultiSelectSearch = '';
  facultyLoadData: any[] = [];
  sectionOptions = [
    { key: 'teaching', label: 'Teaching Hours', disabled: false },
    { key: 'invigilation', label: 'Invigilation Hours', disabled: true },
    { key: 'tasks', label: 'Tasks', disabled: false },
    { key: 'cancelled', label: 'Cancelled Periods', disabled: false },
    { key: 'replaced', label: 'Replaced Periods', disabled: false },
    { key: 'lateEntry', label: 'Late Entry', disabled: false },
    { key: 'earlyLeaving', label: 'Early Leaving', disabled: false },
    { key: 'attendanceMarked', label: 'Attendance Marked', disabled: false },
    {
      key: 'attendanceNotMarked',
      label: 'Attendance Not Marked',
      disabled: false,
    },
    {
      key: 'assignments',
      label: 'Assignment Enabled Per Batch',
      disabled: false,
    },
  ];

  selectedSections: string[] = [];
  facultyReportData: any[] = [];

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

  switchTab(tab: 'batch' | 'student' | 'teacher' | 'assignments') {
    this.activeTab = tab;
    this.clearReport();
  }

  getActiveReports(): ReportItem[] {
    switch (this.activeTab) {
      case 'batch':
        return this.batchReports;
      case 'student':
        return this.studentReports;
      case 'teacher':
        return this.teacherReports;
      case 'assignments':
        return this.assignmentReports;
      default:
        return [];
    }
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
    if (report.key === 'teacher-load') {
      this.loadCenters();
    }
    if (report.key === 'batch-phase-allotment') {
      this.loadPrograms();
      this.phaseAllotmentBatchOptions = [...this.batchOptions];
      this.subjectOptions = [];
    }
    if (
      ['batch-assignments', 'batch-cgpa', 'batch-slash'].includes(report.key)
    ) {
      this.loadSubjects();
    }
    if (['batch-timetable', 'batch-subject-hours'].includes(report.key)) {
      this.subjectOptions = [];
    }
    if (
      ['batch-assignment-report', 'batch-slash-detail'].includes(report.key)
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
    this.cgpaStudentDetail = [];
    this.facultyLoadDetail = [];
    this.filterCenterIds = [];
    this.selectedStudentIds = [];
    this.selectedAdmissionNos = [];
    this.studentDropdownOpen = false;
    this.studentSearch = '';
    this.attendanceDetailData = [];
    this.remarksDetailData2 = [];
    this.lateEntriesDetailData = [];
    this.revealedColumns = new Set();
    this.phaseAllotmentBatchOptions = [...this.batchOptions];
    this.assignmentReportView = 'batch';
    this.assignmentBatchResults = [];
    this.assignmentStudentResults = [];
    this.slashTopicOptions = [];
    this.selectedTopicIds = [];
    this.topicDropdownOpen = false;
    this.topicSearch = '';
    this.selectedStaffIds = [];
    this.staffMultiSelectDropdownOpen = false;
    this.staffMultiSelectSearch = '';
    this.facultyLoadData = [];
    this.selectedSections = [];
    this.facultyReportData = [];
  }

  private loadBatches() {
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'batch', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.allBatchesFullList = res?.data || [];
          this.batchOptions = this.allBatchesFullList.map((b: any) => ({
            value: b.batchId || b._id,
            label: b.batchCode + ' - ' + b.batchName,
            batchCode: b.batchCode,
            batchId: b.batchId || b._id,
            programId: b.programId,
          }));
          this.phaseAllotmentBatchOptions = [...this.batchOptions];
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
    const opts =
      this.selectedReport?.key === 'batch-phase-allotment'
        ? this.phaseAllotmentBatchOptions
        : this.batchOptions;
    return opts.length > 0 && this.selectedBatchIds.length === opts.length;
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
    if (
      this.selectedReport?.key === 'batch-timetable' ||
      this.selectedReport?.key === 'batch-subject-hours'
    ) {
      this.loadSubjectsByBatches(this.selectedBatchIds);
    }
    if (this.selectedReport?.key === 'batch-phase-allotment') {
      this.onPhaseAllotmentBatchChange();
    }
    if (
      this.selectedReport?.key === 'batch-assignment-report' &&
      this.assignmentReportView === 'student'
    ) {
      this.loadStudentsByBatches(this.selectedBatchIds);
    }
  }

  toggleSelectAllBatches() {
    const opts =
      this.selectedReport?.key === 'batch-phase-allotment'
        ? this.phaseAllotmentBatchOptions
        : this.batchOptions;
    if (this.allBatchesSelected) {
      this.selectedBatchIds = [];
      this.selectedBatchCodes = [];
    } else {
      this.selectedBatchIds = opts.map((b: any) => b.value);
      this.selectedBatchCodes = opts.map((b: any) => b.batchCode);
    }
    if (
      this.selectedReport?.key === 'batch-timetable' ||
      this.selectedReport?.key === 'batch-subject-hours'
    ) {
      this.loadSubjectsByBatches(this.selectedBatchIds);
    }
    if (this.selectedReport?.key === 'batch-phase-allotment') {
      this.onPhaseAllotmentBatchChange();
    }
    if (
      this.selectedReport?.key === 'batch-assignment-report' &&
      this.assignmentReportView === 'student'
    ) {
      this.loadStudentsByBatches(this.selectedBatchIds);
    }
  }

  private loadStudentsByBatches(batchIds: string[]) {
    if (!batchIds.length) {
      this.studentOptions = [];
      return;
    }
    const batchCodes = this.batchOptions
      .filter((b) => batchIds.includes(b.value))
      .map((b) => b.batchCode)
      .filter(Boolean);
    if (!batchCodes.length) {
      this.studentOptions = [];
      return;
    }
    if (batchCodes.length === 1) {
      this.commonApi
        .fetchData(
          { entiId: this.tenantId },
          'student',
          `list?list=full&batchCode=${batchCodes[0]}`,
        )
        .subscribe({
          next: (res: any) => {
            this.studentOptions = this.mapStudentOptions(res?.data || []);
          },
        });
    } else {
      const { forkJoin } = require('rxjs');
      const calls = batchCodes.map((bc: string) =>
        this.commonApi.fetchData(
          { entiId: this.tenantId },
          'student',
          `list?list=full&batchCode=${bc}`,
        ),
      );
      forkJoin(calls).subscribe({
        next: (results: any[]) => {
          const allStudents = (results as any[]).flatMap(
            (res: any) => res?.data || [],
          );
          const seen = new Set();
          const unique = allStudents.filter((s: any) => {
            const id = s.studentId || s._id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          this.studentOptions = this.mapStudentOptions(unique);
        },
      });
    }
  }

  private mapStudentOptions(students: any[]): any[] {
    return students.map((s: any) => ({
      value: s.studentId || s._id,
      label:
        (s.admissionNo || '') +
        ' - ' +
        (s.student?.name || s.name || s.studentName || ''),
      admissionNo: s.admissionNo,
      studentId: s.studentId || s._id,
    }));
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
        if (this.selectedProgramIds.length)
          payload.programIds = this.selectedProgramIds;
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
      case 'batch-cgpa':
        module = 'reports/batch';
        endpoint = 'cgpa';
        if (this.selectedBatchIds.length)
          payload.batchIds = this.selectedBatchIds;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        break;
      case 'batch-slash':
        module = 'reports/batch';
        endpoint = 'slash';
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
        if (this.selectedAdmissionNos.length === 1) {
          module = 'reports/student';
          endpoint = 'attendance';
          payload.admissionNo = this.selectedAdmissionNos[0];
        } else {
          module = 'reports/student';
          endpoint = 'attendance-bulk';
          payload.admissionNos = this.selectedAdmissionNos;
        }
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'student-remarks':
        if (this.selectedAdmissionNos.length === 1) {
          module = 'reports/student';
          endpoint = 'remarks';
          payload.admissionNo = this.selectedAdmissionNos[0];
        } else {
          module = 'reports/student';
          endpoint = 'remarks-bulk';
          payload.admissionNos = this.selectedAdmissionNos;
        }
        if (this.filterType) payload.type = this.filterType;
        if (this.filterStatus) payload.status = this.filterStatus;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        break;
      case 'student-late-entries':
        if (this.selectedAdmissionNos.length === 1) {
          module = 'reports/student';
          endpoint = 'late-entries';
          payload.admissionNo = this.selectedAdmissionNos[0];
        } else {
          module = 'reports/student';
          endpoint = 'late-entries-bulk';
          payload.admissionNos = this.selectedAdmissionNos;
        }
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        if (this.filterEntryType) payload.entryType = this.filterEntryType;
        break;
      case 'teacher-faculty-report':
        module = 'reports/teacher';
        endpoint = 'faculty-report';
        if (this.selectedStaffIds.length)
          payload.staffIds = this.selectedStaffIds;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
        payload.sections = this.selectedSections;
        break;
      case 'teacher-batches':
        module = 'reports/teacher';
        endpoint = 'batches';
        payload.staffId = this.selectedStaffId;
        if (this.filterStatus) payload.status = this.filterStatus;
        break;
      case 'teacher-load':
        module = 'reports/teacher';
        endpoint = 'load';
        if (this.selectedStaffIds.length)
          payload.staffIds = this.selectedStaffIds;
        if (this.selectedCenterIds.length)
          payload.centerIds = this.selectedCenterIds;
        if (this.fromDate) payload.fromDate = new Date(this.fromDate).getTime();
        if (this.toDate) payload.toDate = new Date(this.toDate).getTime();
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
      case 'batch-assignment-report':
        module = 'reports/batch';
        endpoint = 'assignment-report';
        if (!this.selectedBatchIds.length) {
          this.alert.error('Please select at least one batch');
          this.reportLoading = false;
          return;
        }
        payload.batchIds = this.selectedBatchIds;
        payload.view = this.assignmentReportView;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        if (this.assignmentReportView === 'student') {
          payload.admissionNos = this.selectedAdmissionNos;
        }
        break;

      case 'batch-slash-detail':
        module = 'reports/batch';
        endpoint = 'slash-detail';
        if (!this.selectedBatchIds.length) {
          this.alert.error('Please select at least one batch');
          this.reportLoading = false;
          return;
        }
        payload.batchIds = this.selectedBatchIds;
        if (this.filterSubjectId) payload.subjectId = this.filterSubjectId;
        if (this.selectedTopicIds.length)
          payload.topicIds = this.selectedTopicIds;
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
          { key: 'phone', label: 'Phone', masked: true },
          { key: 'phone1', label: 'Phone 1', masked: true },
          { key: 'phone2', label: 'Phone 2', masked: true },
          { key: 'email', label: 'Email', masked: true },
          { key: 'email1', label: 'Email 1', masked: true },
          { key: 'email2', label: 'Email 2', masked: true },
          { key: 'parentName', label: 'Parent' },
          { key: 'parentPhone', label: 'Parent Phone', masked: true },
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
          ...(this.selectedBatchIds.length !== 1
            ? [
                { key: 'batchCode', label: 'Batch Code' },
                { key: 'batchName', label: 'Batch Name' },
              ]
            : []),
          { key: 'subjectName', label: 'Subject' },
          { key: 'phaseName', label: 'Phase' },
          { key: 'estHours', label: 'Est Hours' },
          { key: 'allottedHours', label: 'Allotted Hours' },
          { key: 'remainingHours', label: 'Remaining Hours' },
          { key: 'progressPct', label: 'Progress %' },
        ];
        const phaseRows: any[] = [];
        data.forEach((r: any) => {
          const phases = (r.phases || []).sort(
            (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0),
          );
          if (phases.length === 0) {
            phaseRows.push({
              batchCode: r.batchCode,
              batchName: r.batchName,
              subjectName: r.subjectName,
              phaseName: '-',
              estHours: this.formatHours(r.totalEstHours),
              allottedHours: this.formatHours(r.totalAllottedHours),
              remainingHours: this.formatHours(r.totalRemainingHours),
              progressPct:
                r.overallProgressPct !== null
                  ? r.overallProgressPct + '%'
                  : '-',
            });
          } else {
            phases.forEach((ph: any) => {
              phaseRows.push({
                batchCode: r.batchCode,
                batchName: r.batchName,
                subjectName: r.subjectName,
                phaseName: ph.phaseName,
                estHours: this.formatHours(ph.estHours),
                allottedHours: this.formatHours(ph.allottedHours),
                remainingHours: this.formatHours(ph.remainingHours),
                progressPct:
                  ph.progressPct !== null ? ph.progressPct + '%' : '-',
              });
            });
          }
        });
        this.reportTableData = phaseRows;
        break;
      case 'batch-subject-hours':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch' },
          { key: 'batchName', label: 'Batch Name' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'phaseName', label: 'Phase' },
          { key: 'estHours', label: 'Est Hours' },
          { key: 'allottedHours', label: 'Allotted Hours' },
          { key: 'balanceHours', label: 'Balance Hours' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          estHours: this.formatHours(r.estHours),
          allottedHours: this.formatHours(r.allottedHours),
          balanceHours: this.formatHours(r.balanceHours),
        }));
        break;
      case 'batch-assignments':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch' },
          { key: 'testCode', label: 'Test Code' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'enabledAtFormatted', label: 'Enabled On' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'completed', label: 'Completed' },
          { key: 'inProgress', label: 'In Progress' },
          { key: 'assigned', label: 'Assigned' },
          { key: 'completionPctLabel', label: 'Completion %' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          batchCode: r.batchCode || '-',
          enabledAtFormatted: r.enabledAt ? this.formatEpoch(r.enabledAt) : '-',
          completionPctLabel:
            r.completionPct !== null ? r.completionPct + '%' : '-',
        }));
        break;
      case 'batch-cgpa':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch' },
          { key: 'batchName', label: 'Batch Name' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'subjectCode', label: 'Code' },
          { key: 'totalStudents', label: 'Total Students' },
          { key: 'completedStudents', label: 'Completed' },
          { key: 'avgCgpa', label: 'Avg CGPA' },
          { key: 'minCgpa', label: 'Min CGPA' },
          { key: 'maxCgpa', label: 'Max CGPA' },
        ];
        this.reportTableData = data;
        this.cgpaStudentDetail = res.studentDetail || [];
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
      case 'batch-slash':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch' },
          { key: 'batchName', label: 'Batch Name' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'subjectCode', label: 'Code' },
          { key: 'availableTests', label: 'Available' },
          { key: 'totalStudents', label: 'Students' },
          { key: 'fullyCompleted', label: 'Completed All' },
          { key: 'inProgress', label: 'In Progress' },
          { key: 'notStarted', label: 'Not Started' },
          { key: 'completionPctLabel', label: 'Completion %' },
        ];
        this.reportTableData = data.map((r: any) => ({
          ...r,
          completionPctLabel:
            r.completionPct !== null ? r.completionPct + '%' : '-',
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
        const isBulk = this.selectedAdmissionNos.length !== 1;
        if (isBulk) {
          this.reportColumns = [
            { key: 'admissionNo', label: 'Admission No' },
            { key: 'studentName', label: 'Student' },
            { key: 'batchCode', label: 'Batch' },
            { key: 'totalPeriods', label: 'Total Periods' },
            { key: 'present', label: 'Present' },
            { key: 'absent', label: 'Absent' },
            { key: 'late', label: 'Late' },
            { key: 'attendancePct', label: 'Attendance %' },
          ];
          this.reportTableData = res.data || [];
          this.attendanceDetailData = res.detail || [];
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
        } else {
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
            {
              label: 'Period Present',
              value: this.reportSummary.periodPresent,
            },
            { label: 'Period Absent', value: this.reportSummary.periodAbsent },
            {
              label: 'Period Present %',
              value: this.reportSummary.periodPresentPct + '%',
            },
            { label: 'School Total', value: this.reportSummary.schoolTotal },
            {
              label: 'School Present',
              value: this.reportSummary.schoolPresent,
            },
            {
              label: 'School Present %',
              value: this.reportSummary.schoolPresentPct + '%',
            },
          ];
          this.schoolAttData = res?.schoolAttendance?.detail || [];
          this.subjectSummaryData = res?.subjectSummary || [];
        }
        break;
      case 'student-remarks':
        const isRemarksBulk = this.selectedAdmissionNos.length !== 1;
        if (isRemarksBulk) {
          this.reportColumns = [
            { key: 'admissionNo', label: 'Admission No' },
            { key: 'studentName', label: 'Student' },
            { key: 'batchCode', label: 'Batch' },
            { key: 'totalRemarks', label: 'Total Remarks' },
          ];
          this.reportTableData = data;
          this.remarksDetailData2 = res.detail || [];
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
        } else {
          this.reportColumns = [
            { key: 'slNo', label: '#' },
            { key: 'type', label: 'Type' },
            { key: 'dateFormatted', label: 'Date' },
            { key: 'remark', label: 'Remark' },
            { key: 'status', label: 'Status' },
          ];
          this.reportTableData = data;
        }
        break;
      case 'student-late-entries':
        const isLateEntriesBulk = this.selectedAdmissionNos.length !== 1;
        if (isLateEntriesBulk) {
          this.reportColumns = [
            { key: 'admissionNo', label: 'Admission No' },
            { key: 'studentName', label: 'Student' },
            { key: 'batchCode', label: 'Batch' },
            { key: 'totalEntries', label: 'Total Entries' },
            { key: 'lateCount', label: 'Late' },
            { key: 'earlyCount', label: 'Early Leave' },
            { key: 'totalDelayMinutes', label: 'Total Delay (min)' },
          ];
          this.reportTableData = data;
          this.lateEntriesDetailData = res.detail || [];
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
        } else {
          this.reportColumns = [
            { key: 'slNo', label: '#' },
            { key: 'entryType', label: 'Type' },
            { key: 'dateFormatted', label: 'Date' },
            { key: 'periodNo', label: 'Period' },
            { key: 'delayMinutes', label: 'Delay (min)' },
            { key: 'reason', label: 'Reason' },
          ];
          this.reportTableData = data;
        }
        break;
      case 'teacher-faculty-report':
        this.facultyReportData = res.data || [];
        this.reportTableData = [];
        this.reportColumns = [];
        this.reportSummary = null;
        this.summaryItems = [];
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
      case 'teacher-load':
        this.facultyLoadData = res.data || [];
        this.reportTableData = [];
        this.reportColumns = [];
        this.reportSummary = null;
        this.summaryItems = [];
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
      case 'batch-assignment-report':
        if (res.view === 'batch') {
          this.assignmentBatchResults = res.batches || [];
          this.reportTableData = [];
          this.reportColumns = [];
        } else {
          this.assignmentStudentResults = res.students || [];
          this.reportTableData = [];
          this.reportColumns = [];
        }
        this.reportSummary = null;
        this.summaryItems = [];
        break;

      case 'batch-slash-detail':
        this.reportColumns = [
          { key: 'batchCode', label: 'Batch' },
          { key: 'admissionNo', label: 'Enrollment No' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'topicName', label: 'Topic' },
          { key: 'report', label: 'Available/Completed/Not Completed' },
        ];
        this.reportTableData = data;
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
      case 'Student-wise CGPA':
        return [
          { key: 'batchCode', label: 'Batch' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'admissionNo', label: 'Admission No' },
          { key: 'status', label: 'Status' },
          { key: 'cgpa', label: 'CGPA' },
        ];
      case 'Faculty Load Detail':
        return this.facultyLoadDetail;
      case 'Period-level Attendance':
        return this.attendanceDetailData;
      case 'Student Remarks Detail':
        return this.remarksDetailData2;
      case 'Late Entries Detail':
        return this.lateEntriesDetailData;
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
      case 'Faculty Load Detail':
        return [
          { key: 'staffName', label: 'Staff' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'centerName', label: 'Center' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'scheduledCount', label: 'Periods' },
          { key: 'scheduledHoursFormatted', label: 'Hours' },
          { key: 'cancelledCount', label: 'Cancelled' },
          { key: 'replacedCount', label: 'Replaced' },
          { key: 'replacedHoursFormatted', label: 'Replaced Hours' },
        ];
      case 'Period-level Attendance':
        return [
          { key: 'admissionNo', label: 'Enrollment No' },
          { key: 'studentName', label: 'Student' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'periodNo', label: 'Period' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'status', label: 'Status' },
          { key: 'remarks', label: 'Remarks' },
          { key: 'topicTaught', label: 'Topic' },
        ];
      case 'Student Remarks Detail':
        return [
          { key: 'admissionNo', label: 'Admission No' },
          { key: 'studentName', label: 'Student' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'type', label: 'Type' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'remark', label: 'Remark' },
          { key: 'status', label: 'Status' },
          { key: 'reportedByParent', label: 'Reported By Parent' },
        ];
      case 'Late Entries Detail':
        return [
          { key: 'admissionNo', label: 'Admission No' },
          { key: 'studentName', label: 'Student' },
          { key: 'batchCode', label: 'Batch' },
          { key: 'entryType', label: 'Type' },
          { key: 'dateFormatted', label: 'Date' },
          { key: 'periodNo', label: 'Period' },
          { key: 'delayMinutes', label: 'Delay (min)' },
          { key: 'reason', label: 'Reason' },
        ];
      default:
        return [];
    }
  }

  exportToExcel() {
    if (!this.selectedReport) return;
    if (
      !this.reportTableData.length &&
      !this.hasFacultyLoadCustomData &&
      !this.hasAssignmentCustomData &&
      !this.hasFacultyReportData
    )
      return;
    const wb = XLSX.utils.book_new();
    const headers = this.reportColumns.map((c: any) => c.label);
    const keys = this.reportColumns.map((c: any) => c.key);
    const rows = this.reportTableData.map((row: any) =>
      keys.reduce((obj: any, key: string, idx: number) => {
        const col = this.reportColumns[idx];
        let val = row[key];
        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
        if (col?.masked && val && !this.isColumnRevealed(key)) {
          obj[headers[idx]] = this.maskValue(String(val));
        } else {
          obj[headers[idx]] = val ?? '';
        }
        return obj;
      }, {}),
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Summary');
    if (this.selectedReport.key === 'batch-assignment-report') {
      this.exportAssignmentReportExcel(wb);
      XLSX.writeFile(wb, 'Assignment_Report.xlsx');
      return;
    }
    if (
      this.selectedReport.key === 'teacher-load' &&
      this.facultyLoadData.length > 0
    ) {
      wb.SheetNames = [];
      wb.Sheets = {};
      this.exportFacultyLoadExcel(wb);
      XLSX.writeFile(wb, 'Faculty_Load_Report.xlsx');
      return;
    }
    if (
      this.selectedReport.key === 'teacher-faculty-report' &&
      this.facultyReportData.length > 0
    ) {
      wb.SheetNames = [];
      wb.Sheets = {};
      this.exportFacultyReportExcel(wb);
      XLSX.writeFile(wb, 'Faculty_Report.xlsx');
      return;
    }
    if (
      this.selectedReport.key === 'batch-slash-detail' &&
      this.reportTableData.length > 0
    ) {
      wb.SheetNames = [];
      wb.Sheets = {};
      const headers = this.reportColumns.map((c: any) => c.label);
      const keys = this.reportColumns.map((c: any) => c.key);
      const batchGroups = new Map<string, any[]>();
      for (const row of this.reportTableData) {
        const bc = row.batchCode || 'Unknown';
        if (!batchGroups.has(bc)) batchGroups.set(bc, []);
        batchGroups.get(bc)!.push(row);
      }
      for (const [bc, batchRows] of batchGroups.entries()) {
        const batchName = batchRows[0]?.batchName || '';
        const headerRow1: any = {};
        const headerRow2: any = {};
        headers.forEach((h) => {
          headerRow1[h] = '';
          headerRow2[h] = '';
        });
        headerRow1[headers[0]] = `Batch Code: ${bc}`;
        headerRow2[headers[0]] = `Batch Name: ${batchName}`;
        const sheetRows = [
          headerRow1,
          headerRow2,
          {},
          ...batchRows.map((row: any) =>
            keys.reduce((obj: any, key: string, idx: number) => {
              obj[headers[idx]] = row[key] ?? '';
              return obj;
            }, {}),
          ),
        ];
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        XLSX.utils.book_append_sheet(wb, ws, bc.substring(0, 31));
      }
    }
    if (
      this.selectedReport.key === 'batch-phase-allotment' &&
      this.reportTableData.length > 0
    ) {
      const batchGroups = new Map<string, any[]>();
      for (const row of this.reportTableData) {
        const bc = row.batchCode || 'Unknown';
        if (!batchGroups.has(bc)) batchGroups.set(bc, []);
        batchGroups.get(bc)!.push(row);
      }
      wb.SheetNames = [];
      wb.Sheets = {};
      const headers = this.reportColumns.map((c: any) => c.label);
      const keys = this.reportColumns.map((c: any) => c.key);
      for (const [bc, batchRows] of batchGroups.entries()) {
        const sheetRows = batchRows.map((row: any) =>
          keys.reduce((obj: any, key: string, idx: number) => {
            const col = this.reportColumns[idx];
            let val = row[key];
            if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
            obj[headers[idx]] = val ?? '';
            return obj;
          }, {}),
        );
        const sheetName = bc.substring(0, 31);
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(sheetRows),
          sheetName,
        );
      }
    }
    if (
      this.selectedReport.key === 'batch-subject-hours' &&
      this.reportTableData.length > 0
    ) {
      wb.SheetNames = [];
      wb.Sheets = {};
      const headers = this.reportColumns.map((c: any) => c.label);
      const keys = this.reportColumns.map((c: any) => c.key);
      const batchGroups = new Map<string, any[]>();
      for (const row of this.reportTableData) {
        const bc = row.batchCode || 'Unknown';
        if (!batchGroups.has(bc)) batchGroups.set(bc, []);
        batchGroups.get(bc)!.push(row);
      }
      for (const [bc, batchRows] of batchGroups.entries()) {
        const sheetRows = batchRows.map((row: any) =>
          keys.reduce((obj: any, key: string, idx: number) => {
            const col = this.reportColumns[idx];
            let val = row[key];
            if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
            obj[headers[idx]] = val ?? '';
            return obj;
          }, {}),
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(sheetRows),
          bc.substring(0, 31),
        );
      }
    }
    if (
      this.selectedReport.key === 'teacher-load' &&
      this.facultyLoadDetail.length > 0
    ) {
      const detailCols = this.getActiveDetailColumns();
      const savedLabel = this.selectedDetailLabel;
      this.selectedDetailLabel = 'Faculty Load Detail';
      const dCols = this.getActiveDetailColumns();
      this.selectedDetailLabel = savedLabel;
      const dHeaders = dCols.map((c: any) => c.label);
      const dKeys = dCols.map((c: any) => c.key);
      const dRows = this.facultyLoadDetail.map((row: any) =>
        dKeys.reduce((obj: any, key: string, idx: number) => {
          obj[dHeaders[idx]] = row[key] ?? '';
          return obj;
        }, {}),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dRows),
        'Detail',
      );
    }
    if (
      this.selectedReport.key === 'student-attendance' &&
      this.attendanceDetailData.length > 0
    ) {
      const detailCols = [
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'studentName', label: 'Student' },
        { key: 'batchCode', label: 'Batch' },
        { key: 'dateFormatted', label: 'Date' },
        { key: 'periodNo', label: 'Period' },
        { key: 'subjectName', label: 'Subject' },
        { key: 'status', label: 'Status' },
        { key: 'remarks', label: 'Remarks' },
        { key: 'topicTaught', label: 'Topic' },
      ];
      const dRows = this.attendanceDetailData.map((row: any) =>
        detailCols.reduce((obj: any, col: any) => {
          obj[col.label] = row[col.key] ?? '';
          return obj;
        }, {}),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dRows),
        'Period Detail',
      );
    }
    if (
      this.selectedReport.key === 'student-remarks' &&
      this.remarksDetailData2.length > 0
    ) {
      const detailCols = [
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'studentName', label: 'Student' },
        { key: 'batchCode', label: 'Batch' },
        { key: 'type', label: 'Type' },
        { key: 'dateFormatted', label: 'Date' },
        { key: 'remark', label: 'Remark' },
        { key: 'status', label: 'Status' },
        { key: 'reportedByParent', label: 'Reported By Parent' },
      ];
      const dRows = this.remarksDetailData2.map((row: any) =>
        detailCols.reduce((obj: any, col: any) => {
          obj[col.label] = row[col.key] ?? '';
          return obj;
        }, {}),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dRows),
        'Remarks Detail',
      );
    }
    if (
      this.selectedReport.key === 'student-late-entries' &&
      this.lateEntriesDetailData.length > 0
    ) {
      const detailCols = [
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'studentName', label: 'Student' },
        { key: 'batchCode', label: 'Batch' },
        { key: 'entryType', label: 'Type' },
        { key: 'dateFormatted', label: 'Date' },
        { key: 'periodNo', label: 'Period' },
        { key: 'delayMinutes', label: 'Delay (min)' },
        { key: 'reason', label: 'Reason' },
      ];
      const dRows = this.lateEntriesDetailData.map((row: any) =>
        detailCols.reduce((obj: any, col: any) => {
          obj[col.label] = row[col.key] ?? '';
          return obj;
        }, {}),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dRows),
        'Late Entries Detail',
      );
    }
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
    const key = this.selectedReport.key;
    return (
      (key.startsWith('batch-') && key !== 'batch-info') ||
      [
        'batch-cgpa',
        'batch-slash',
        'batch-assignment-report',
        'batch-slash-detail',
      ].includes(key)
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
      'teacher-load',
      'teacher-faculty-report',
    ].includes(this.selectedReport.key);
  }

  needsStudentFilter(): boolean {
    if (!this.selectedReport) return false;
    if (this.selectedReport.key.startsWith('student-')) return true;
    return false;
  }

  needsBatchFilterForStudent(): boolean {
    if (!this.selectedReport) return false;
    if (this.selectedReport.key.startsWith('student-')) return true;
    return false;
  }

  needsStaffFilter(): boolean {
    if (!this.selectedReport) return false;
    if (this.selectedReport.key === 'teacher-load') return false;
    if (this.selectedReport.key === 'teacher-faculty-report') return false;
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
    const multiStudentReports = [
      'student-attendance',
      'student-remarks',
      'student-late-entries',
    ];
    if (
      multiStudentReports.includes(this.selectedReport?.key) &&
      !this.selectedAdmissionNos.length
    )
      return false;
    if (
      key === 'batch-assignment-report' &&
      this.assignmentReportView === 'student'
    ) {
      if (!this.selectedBatchIds.length) return false;
      if (!this.selectedAdmissionNos.length) return false;
    }
    if (
      key === 'batch-assignment-report' &&
      this.assignmentReportView === 'batch' &&
      !this.selectedBatchIds.length
    )
      return false;
    if (
      this.needsStudentFilter() &&
      !multiStudentReports.includes(this.selectedReport?.key) &&
      !this.selectedAdmissionNo
    )
      return false;
    if (
      this.needsStaffFilter() &&
      !this.selectedStaffId &&
      this.selectedReport.key !== 'teacher-load'
    )
      return false;
    if (
      ['batch-assignment-report', 'batch-slash-detail'].includes(key) &&
      !this.selectedBatchIds.length
    )
      return false;
    if (
      key === 'batch-assignment-report' &&
      this.assignmentReportView === 'student' &&
      !this.selectedAdmissionNos.length
    )
      return false;
    if (key === 'teacher-faculty-report' && !this.selectedSections.length)
      return false;
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
    if (this.selectedReport?.key === 'batch-phase-allotment') {
      this.onPhaseAllotmentProgramChange();
    }
  }

  toggleSelectAllPrograms() {
    if (this.allProgramsSelected) this.selectedProgramIds = [];
    else this.selectedProgramIds = this.programOptions.map((p) => p.value);
    if (this.selectedReport?.key === 'batch-phase-allotment') {
      this.onPhaseAllotmentProgramChange();
    }
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
    if (!target.closest('.student-multiselect-wrapper')) {
      this.studentDropdownOpen = false;
      this.studentSearch = '';
    }
    if (!target.closest('.topic-multiselect-wrapper')) {
      this.topicDropdownOpen = false;
      this.topicSearch = '';
    }
    if (!target.closest('.staff-multiselect-wrapper')) {
      this.staffMultiSelectDropdownOpen = false;
      this.staffMultiSelectSearch = '';
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

  showCgpaStudentDetail() {
    this.selectedDetailLabel = 'Student-wise CGPA';
    this.showDetailPanel = true;
  }
  get hasCgpaStudentDetail(): boolean {
    return (
      this.selectedReport?.key === 'batch-cgpa' &&
      this.cgpaStudentDetail.length > 0
    );
  }

  showFacultyLoadDetail() {
    this.selectedDetailLabel = 'Faculty Load Detail';
    this.showDetailPanel = true;
  }

  get hasFacultyLoadDetail(): boolean {
    return (
      this.selectedReport?.key === 'teacher-load' &&
      this.facultyLoadDetail.length > 0
    );
  }

  get allStudentsSelected(): boolean {
    return (
      this.studentOptions.length > 0 &&
      this.selectedStudentIds.length === this.studentOptions.length
    );
  }

  get studentSelectionLabel(): string {
    if (!this.selectedStudentIds.length) return 'Select Students';
    if (this.allStudentsSelected) return 'All Students';
    if (this.selectedStudentIds.length === 1)
      return (
        this.studentOptions.find((s) => s.value === this.selectedStudentIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedStudentIds.length} students selected`;
  }

  get filteredStudentOptions(): any[] {
    const q = this.studentSearch.toLowerCase().trim();
    return q
      ? this.studentOptions.filter((s) => s.label.toLowerCase().includes(q))
      : this.studentOptions;
  }

  toggleStudentDropdown() {
    this.studentDropdownOpen = !this.studentDropdownOpen;
    if (!this.studentDropdownOpen) this.studentSearch = '';
  }

  isStudentSelected(value: string): boolean {
    return this.selectedStudentIds.includes(value);
  }

  toggleStudentSelection(value: string) {
    const student = this.studentOptions.find((s) => s.value === value);
    if (this.isStudentSelected(value)) {
      this.selectedStudentIds = this.selectedStudentIds.filter(
        (id) => id !== value,
      );
      this.selectedAdmissionNos = this.selectedAdmissionNos.filter(
        (a) => a !== student?.admissionNo,
      );
    } else {
      this.selectedStudentIds = [...this.selectedStudentIds, value];
      if (student?.admissionNo)
        this.selectedAdmissionNos = [
          ...this.selectedAdmissionNos,
          student.admissionNo,
        ];
    }
  }

  toggleSelectAllStudents() {
    if (this.allStudentsSelected) {
      this.selectedStudentIds = [];
      this.selectedAdmissionNos = [];
    } else {
      this.selectedStudentIds = this.studentOptions.map((s) => s.value);
      this.selectedAdmissionNos = this.studentOptions
        .map((s) => s.admissionNo)
        .filter(Boolean);
    }
  }

  showAttendanceDetail() {
    this.selectedDetailLabel = 'Period-level Attendance';
    this.showDetailPanel = true;
  }

  get hasAttendanceDetail(): boolean {
    return (
      this.selectedReport?.key === 'student-attendance' &&
      this.attendanceDetailData.length > 0 &&
      this.selectedAdmissionNos.length !== 1
    );
  }

  onManualAdmissionInput(event: any) {
    const val = event.target.value || '';
    this.selectedAdmissionNos = val
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    this.selectedStudentIds = [...this.selectedAdmissionNos];
  }

  showRemarksDetail2() {
    this.selectedDetailLabel = 'Student Remarks Detail';
    this.showDetailPanel = true;
  }
  get hasRemarksDetail2(): boolean {
    return (
      this.selectedReport?.key === 'student-remarks' &&
      this.remarksDetailData2.length > 0 &&
      this.selectedAdmissionNos.length !== 1
    );
  }

  showLateEntriesDetail() {
    this.selectedDetailLabel = 'Late Entries Detail';
    this.showDetailPanel = true;
  }
  get hasLateEntriesDetail(): boolean {
    return (
      this.selectedReport?.key === 'student-late-entries' &&
      this.lateEntriesDetailData.length > 0 &&
      this.selectedAdmissionNos.length !== 1
    );
  }

  maskValue(val: string | null | undefined): string {
    if (!val) return '-';
    const s = String(val).trim();
    if (s.length <= 4) return s;
    return 'X'.repeat(s.length - 4) + s.slice(-4);
  }

  isColumnRevealed(colKey: string): boolean {
    return this.revealedColumns.has(colKey);
  }

  toggleColumnReveal(colKey: string, event: Event) {
    event.stopPropagation();
    if (this.revealedColumns.has(colKey)) this.revealedColumns.delete(colKey);
    else this.revealedColumns.add(colKey);
  }

  getCellDisplayValue(row: any, col: any): string {
    const val = row[col.key];
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (col.masked && !this.isColumnRevealed(col.key)) {
      return this.maskValue(String(val));
    }
    return String(val);
  }

  private loadSubjectsByBatches(batchIds: string[]) {
    if (!batchIds.length) {
      if (this.selectedReport?.key === 'batch-subject-hours') {
        this.subjectOptions = [];
        return;
      }
      this.loadSubjects();
      return;
    }
    const batchCodes = this.batchOptions
      .filter((b) => batchIds.includes(b.value))
      .map((b) => b.batchCode)
      .filter(Boolean);
    if (!batchCodes.length) {
      this.loadSubjects();
      return;
    }
    this.commonApi
      .fetchData(
        { entiId: this.tenantId, batchCodes },
        'reports/batch',
        'subjects-by-batch',
      )
      .subscribe({
        next: (res: any) => {
          this.subjectOptions = (res?.data || []).map((s: any) => ({
            value: s._id || s.subjectId,
            label: s.subjectName,
          }));
        },
        error: () => this.loadSubjects(),
      });
  }

  exportToPdf() {
    if (!this.selectedReport) return;
    if (
      !this.reportTableData.length &&
      !this.hasFacultyLoadCustomData &&
      !this.hasAssignmentCustomData &&
      !this.hasFacultyReportData
    )
      return;
    if (this.customPdfExport(this.selectedReport.key)) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = this.selectedReport.label + ' Report';
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
    const headers = this.reportColumns.map((c) => c.label);
    const keys = this.reportColumns.map((c) => c.key);
    const rows = this.reportTableData.map((row: any) =>
      keys.map((key, idx) => {
        const col = this.reportColumns[idx];
        let val = row[key];
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (col?.masked && val && !this.isColumnRevealed(key)) {
          return this.maskValue(String(val));
        }
        return val !== null && val !== undefined ? String(val) : '-';
      }),
    );
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`${this.selectedReport.label.replace(/\s+/g, '_')}_Report.pdf`);
  }

  private exportPhaseAllotmentPdf() {
    if (!this.reportTableData.length || !this.selectedReport) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = this.reportColumns.map((c: any) => c.label);
    const keys = this.reportColumns.map((c: any) => c.key);
    const batchGroups = new Map<string, any[]>();
    for (const row of this.reportTableData) {
      const bc = row.batchCode || 'Unknown';
      if (!batchGroups.has(bc)) batchGroups.set(bc, []);
      batchGroups.get(bc)!.push(row);
    }
    let isFirstBatch = true;
    for (const [bc, batchRows] of batchGroups.entries()) {
      if (!isFirstBatch) doc.addPage();
      isFirstBatch = false;
      const batchName = batchRows[0]?.batchName || '';
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`Phase Allotment Report`, 14, 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Batch: ${bc}${batchName ? ' - ' + batchName : ''}`, 14, 21);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 27);
      const rows = batchRows.map((row: any) =>
        keys.map((key: string) => {
          const val = row[key];
          if (val === null || val === undefined) return '-';
          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
          return String(val);
        }),
      );
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            const row = batchRows[data.row.index];
            if (row?.phaseName === 'Unassigned') {
              data.cell.styles.textColor = [156, 163, 175];
              data.cell.styles.fontStyle = 'italic';
            }
          }
        },
      });
    }
    doc.save(`Phase_Allotment_Report.pdf`);
  }

  private loadBatchesByPrograms(programIds: string[]) {
    if (!programIds.length) {
      this.phaseAllotmentBatchOptions = [...this.batchOptions];
      return;
    }
    const filtered = this.batchOptions.filter((b) =>
      this.allBatchesFullList.some(
        (fb: any) =>
          fb.batchId === b.value && programIds.includes(fb.programId),
      ),
    );
    this.phaseAllotmentBatchOptions = filtered;
    this.selectedBatchIds = this.selectedBatchIds.filter((id) =>
      this.phaseAllotmentBatchOptions.some((b) => b.value === id),
    );
    this.selectedBatchCodes = this.selectedBatchCodes.filter((code) =>
      this.phaseAllotmentBatchOptions.some((b) => b.batchCode === code),
    );
  }

  private loadSubjectsByBatchIds(batchIds: string[]) {
    if (!batchIds.length) {
      this.subjectOptions = [];
      return;
    }
    const selectedBatches = this.allBatchesFullList.filter((b: any) =>
      batchIds.includes(b.batchId || b._id),
    );
    const subjectIdSet = new Set<string>();
    const subjectMap = new Map<string, string>();
    for (const batch of selectedBatches) {
      for (const staff of batch.staffMap || []) {
        if (staff.subjectId && staff.subjectName) {
          subjectIdSet.add(staff.subjectId);
          subjectMap.set(staff.subjectId, staff.subjectName);
        }
      }
    }
    this.subjectOptions = Array.from(subjectIdSet)
      .map((id) => ({
        value: id,
        label: subjectMap.get(id) || id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  onPhaseAllotmentProgramChange() {
    this.selectedBatchIds = [];
    this.selectedBatchCodes = [];
    this.filterSubjectId = '';
    this.subjectOptions = [];
    this.loadBatchesByPrograms(this.selectedProgramIds);
  }

  onPhaseAllotmentBatchChange() {
    this.filterSubjectId = '';
    this.loadSubjectsByBatchIds(this.selectedBatchIds);
  }

  get activeBatchOptions(): any[] {
    if (this.selectedReport?.key === 'batch-phase-allotment') {
      return this.phaseAllotmentBatchOptions;
    }
    return this.batchOptions;
  }

  private exportSubjectHoursPdf() {
    if (!this.reportTableData.length || !this.selectedReport) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = this.reportColumns.map((c: any) => c.label);
    const keys = this.reportColumns.map((c: any) => c.key);
    const batchGroups = new Map<string, any[]>();
    for (const row of this.reportTableData) {
      const bc = row.batchCode || 'Unknown';
      if (!batchGroups.has(bc)) batchGroups.set(bc, []);
      batchGroups.get(bc)!.push(row);
    }
    let isFirstBatch = true;
    for (const [bc, batchRows] of batchGroups.entries()) {
      if (!isFirstBatch) doc.addPage();
      isFirstBatch = false;
      const batchName = batchRows[0]?.batchName || '';
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject Hours Report', 14, 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Batch: ${bc}${batchName ? ' - ' + batchName : ''}`, 14, 21);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 27);
      const rows = batchRows.map((row: any) =>
        keys.map((key: string) => {
          const val = row[key];
          if (val === null || val === undefined) return '-';
          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
          return String(val);
        }),
      );
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            const row = batchRows[data.row.index];
            if (row?.phaseName === 'Unassigned') {
              data.cell.styles.textColor = [156, 163, 175];
              data.cell.styles.fontStyle = 'italic';
            }
            if (
              data.column.dataKey === headers.indexOf('Balance Hours') &&
              row?.balanceHours &&
              String(row.balanceHours).startsWith('-')
            ) {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        },
      });
    }

    doc.save('Subject_Hours_Report.pdf');
  }

  get allTopicsSelected(): boolean {
    return (
      this.slashTopicOptions.length > 0 &&
      this.selectedTopicIds.length === this.slashTopicOptions.length
    );
  }
  get topicSelectionLabel(): string {
    if (!this.selectedTopicIds.length) return 'All Topics';
    if (this.allTopicsSelected) return 'All Topics';
    if (this.selectedTopicIds.length === 1)
      return (
        this.slashTopicOptions.find((t) => t.value === this.selectedTopicIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedTopicIds.length} topics selected`;
  }
  get filteredTopicOptions(): any[] {
    const q = this.topicSearch.toLowerCase().trim();
    return q
      ? this.slashTopicOptions.filter((t) => t.label.toLowerCase().includes(q))
      : this.slashTopicOptions;
  }
  toggleTopicDropdown() {
    this.topicDropdownOpen = !this.topicDropdownOpen;
    if (!this.topicDropdownOpen) this.topicSearch = '';
  }
  isTopicSelected(value: string): boolean {
    return this.selectedTopicIds.includes(value);
  }
  toggleTopicSelection(value: string) {
    if (this.isTopicSelected(value))
      this.selectedTopicIds = this.selectedTopicIds.filter(
        (id) => id !== value,
      );
    else this.selectedTopicIds = [...this.selectedTopicIds, value];
  }
  toggleSelectAllTopics() {
    if (this.allTopicsSelected) this.selectedTopicIds = [];
    else this.selectedTopicIds = this.slashTopicOptions.map((t) => t.value);
  }

  private loadTopicsByBatchSubject(batchIds: string[], subjectId: string) {
    if (!batchIds.length || !subjectId) {
      this.slashTopicOptions = [];
      return;
    }
    const selectedBatches = this.allBatchesFullList.filter((b: any) =>
      batchIds.includes(b.batchId || b._id),
    );
    const classNos = [
      ...new Set(selectedBatches.map((b: any) => b.classNo).filter(Boolean)),
    ];
    if (!classNos.length) {
      this.slashTopicOptions = [];
      return;
    }
    this.commonApi
      .fetchData(
        { entiId: this.tenantId, subjectId, classNos },
        'ims',
        `topic/list?list=full&subjectId=${subjectId}`,
      )
      .subscribe({
        next: (res: any) => {
          this.slashTopicOptions = (res?.data || []).map((t: any) => ({
            value: t.topicId || t._id,
            label: t.topicName,
          }));
        },
      });
  }

  private exportAssignmentReportExcel(wb: any) {
    if (this.assignmentReportView === 'batch') {
      for (const batch of this.assignmentBatchResults) {
        const headers = [
          'S.No',
          'Enrollment No',
          'Student Name',
          ...batch.columns.map((c: any) => c.colLabel),
          'SGPA',
          'GSGPA',
        ];
        const keys = [
          'slNo',
          'admissionNo',
          'studentName',
          ...batch.columns.map((c: any) => c.colKey),
          'SGPA',
          'GSGPA',
        ];
        const allRows = [...batch.students, batch.batchAverage];
        const rows = allRows.map((row: any) =>
          keys.reduce((obj: any, key: string, idx: number) => {
            obj[headers[idx]] = row[key] ?? '';
            return obj;
          }, {}),
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          batch.batchCode.substring(0, 31),
        );
      }
    } else {
      for (const stu of this.assignmentStudentResults) {
        const headers = [
          'Test Code',
          'Subject',
          'Topic',
          'Sub Topic',
          'Category',
          'Sub Category',
          'CGPA',
          'Status',
        ];
        const keys = [
          'testCode',
          'subjectName',
          'topicName',
          'subTopicName',
          'categoryName',
          'subCategoryName',
          'cgpa',
          'status',
        ];
        const rows = stu.tests.map((t: any) =>
          keys.reduce((obj: any, key: string, idx: number) => {
            obj[headers[idx]] = t[key] ?? '';
            return obj;
          }, {}),
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          (stu.admissionNo || stu.studentName || 'Student').substring(0, 31),
        );
      }
    }
  }

  private exportFacultyLoadExcel(wb: any) {
    const periodHeaders = [
      'Date',
      'Batch Name',
      'Batch Code',
      'From Time',
      'End Time',
      'Hours',
    ];
    const periodKeys = [
      'dateFormatted',
      'batchName',
      'batchCode',
      'fromTime',
      'endTime',
      'hours',
    ];
    for (const staff of this.facultyLoadData) {
      for (const subject of staff.subjects || []) {
        const sheetData: any[] = [];
        sheetData.push({
          Date: `Staff: ${staff.staffName} (${staff.staffCode || ''})`,
        });
        sheetData.push({ Date: `Subject: ${subject.subjectName}` });
        sheetData.push({ Date: `Total Hours: ${subject.totalScheduledHours}` });
        sheetData.push({});
        if (subject.scheduledPeriods?.length) {
          sheetData.push({ Date: '--- Scheduled Periods ---' });
          sheetData.push(
            periodKeys.reduce((o, k, i) => {
              o[periodHeaders[i]] = periodHeaders[i];
              return o;
            }, {} as any),
          );
          for (const p of subject.scheduledPeriods) {
            sheetData.push(
              periodKeys.reduce((o, k, i) => {
                o[periodHeaders[i]] = p[k] ?? '';
                return o;
              }, {} as any),
            );
          }
          sheetData.push({});
        }
        if (subject.cancelledPeriods?.length) {
          sheetData.push({ Date: '--- Cancelled / Replaced Periods ---' });
          sheetData.push(
            periodKeys.reduce((o, k, i) => {
              o[periodHeaders[i]] = periodHeaders[i];
              return o;
            }, {} as any),
          );
          for (const p of subject.cancelledPeriods) {
            sheetData.push(
              periodKeys.reduce((o, k, i) => {
                o[periodHeaders[i]] = p[k] ?? '';
                return o;
              }, {} as any),
            );
          }
          sheetData.push({});
        }
        if (subject.replacedPeriods?.length) {
          sheetData.push({ Date: '--- Additional (Replacement) Periods ---' });
          sheetData.push(
            periodKeys.reduce((o, k, i) => {
              o[periodHeaders[i]] = periodHeaders[i];
              return o;
            }, {} as any),
          );
          for (const p of subject.replacedPeriods) {
            sheetData.push(
              periodKeys.reduce((o, k, i) => {
                o[periodHeaders[i]] = p[k] ?? '';
                return o;
              }, {} as any),
            );
          }
          sheetData.push({});
        }
        const sheetName =
          `${staff.staffCode || staff.staffName.substring(0, 5)}_${subject.subjectName.substring(0, 15)}`.substring(
            0,
            31,
          );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(sheetData, { skipHeader: true }),
          sheetName,
        );
      }
    }
  }

  private exportAssignmentReportPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    if (this.assignmentReportView === 'batch') {
      let isFirst = true;
      for (const batch of this.assignmentBatchResults) {
        if (!isFirst) doc.addPage();
        isFirst = false;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Assignment Report', 14, 14);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Batch: ${batch.batchCode} - ${batch.batchName || ''}`,
          14,
          21,
        );
        doc.text(
          `Generated: ${new Date().toLocaleDateString('en-IN')}`,
          14,
          27,
        );
        const headers = [
          'S.No',
          'Enrollment No',
          'Student Name',
          ...batch.columns.map((c: any) => c.colLabel),
          'SGPA',
          'GSGPA',
        ];
        const keys = [
          'slNo',
          'admissionNo',
          'studentName',
          ...batch.columns.map((c: any) => c.colKey),
          'SGPA',
          'GSGPA',
        ];
        const allRows = [...batch.students, batch.batchAverage];
        const rows = allRows.map((row: any) =>
          keys.map((key) =>
            row[key] !== null && row[key] !== undefined
              ? String(row[key])
              : '-',
          ),
        );
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 32,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          didParseCell: (data: any) => {
            // Highlight batch average row
            if (
              data.section === 'body' &&
              data.row.index === allRows.length - 1
            ) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });
      }
    } else {
      let isFirst = true;
      for (const stu of this.assignmentStudentResults) {
        if (!isFirst) doc.addPage();
        isFirst = false;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Assignment Report', 14, 14);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Student: ${stu.studentName || ''} (${stu.admissionNo})`,
          14,
          21,
        );
        doc.text(`Batch: ${stu.batchCode || ''} | SGPA: ${stu.sgpa}`, 14, 27);
        const headers = [
          'Test Code',
          'Subject',
          'Topic',
          'Sub Topic',
          'Category',
          'Sub Category',
          'CGPA',
          'Status',
        ];
        const keys = [
          'testCode',
          'subjectName',
          'topicName',
          'subTopicName',
          'categoryName',
          'subCategoryName',
          'cgpa',
          'status',
        ];
        const rows = stu.tests.map((t: any) =>
          keys.map((key) =>
            t[key] !== null && t[key] !== undefined ? String(t[key]) : '-',
          ),
        );
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 32,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
        });
      }
    }
    doc.save('Assignment_Report.pdf');
  }

  onSubjectChange(val: string) {
    this.filterSubjectId = val;
    if (this.selectedReport?.key === 'batch-slash-detail') {
      this.selectedTopicIds = [];
      this.loadTopicsByBatchSubject(this.selectedBatchIds, val);
    }
  }

  onAssignmentViewChange(view: 'batch' | 'student') {
    this.assignmentReportView = view;
    this.selectedAdmissionNos = [];
    this.selectedStudentIds = [];
    this.studentOptions = [];
    if (view === 'student' && this.selectedBatchIds.length) {
      this.loadStudentsByBatches(this.selectedBatchIds);
    }
  }

  get allStaffMultiSelected(): boolean {
    return (
      this.staffOptions.length > 0 &&
      this.selectedStaffIds.length === this.staffOptions.length
    );
  }
  get staffMultiSelectionLabel(): string {
    if (!this.selectedStaffIds.length) return 'All Staff';
    if (this.allStaffMultiSelected) return 'All Staff';
    if (this.selectedStaffIds.length === 1)
      return (
        this.staffOptions.find((s) => s.value === this.selectedStaffIds[0])
          ?.label || '1 selected'
      );
    return `${this.selectedStaffIds.length} staff selected`;
  }
  get filteredStaffMultiOptions(): any[] {
    const q = this.staffMultiSelectSearch.toLowerCase().trim();
    return q
      ? this.staffOptions.filter((s) => s.label.toLowerCase().includes(q))
      : this.staffOptions;
  }
  toggleStaffMultiDropdown() {
    this.staffMultiSelectDropdownOpen = !this.staffMultiSelectDropdownOpen;
    if (!this.staffMultiSelectDropdownOpen) this.staffMultiSelectSearch = '';
  }
  isStaffMultiSelected(value: string): boolean {
    return this.selectedStaffIds.includes(value);
  }
  toggleStaffMultiSelection(value: string) {
    if (this.isStaffMultiSelected(value))
      this.selectedStaffIds = this.selectedStaffIds.filter(
        (id) => id !== value,
      );
    else this.selectedStaffIds = [...this.selectedStaffIds, value];
  }
  toggleSelectAllStaffMulti() {
    if (this.allStaffMultiSelected) this.selectedStaffIds = [];
    else this.selectedStaffIds = this.staffOptions.map((s) => s.value);
  }

  private exportFacultyLoadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = [
      'Date',
      'Batch Name',
      'Batch Code',
      'From Time',
      'End Time',
      'Hours',
    ];
    const keys = [
      'dateFormatted',
      'batchName',
      'batchCode',
      'fromTime',
      'endTime',
      'hours',
    ];
    let isFirst = true;

    for (const staff of this.facultyLoadData) {
      for (const subject of staff.subjects || []) {
        if (!isFirst) doc.addPage();
        isFirst = false;

        // Header
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Faculty Load Report', 14, 14);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${staff.staffName}${staff.staffCode ? ' (' + staff.staffCode + ')' : ''}`,
          14,
          22,
        );
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Subject: ${subject.subjectName}`, 14, 29);
        doc.text(`Total Hours: ${subject.totalScheduledHours}`, 14, 35);
        doc.text(
          `Generated: ${new Date().toLocaleDateString('en-IN')}`,
          200,
          14,
          { align: 'right' },
        );

        let startY = 41;

        // Scheduled periods
        if (subject.scheduledPeriods?.length) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Scheduled Periods', 14, startY);
          startY += 4;
          const rows = subject.scheduledPeriods.map((p: any) =>
            keys.map((k) =>
              p[k] !== null && p[k] !== undefined ? String(p[k]) : '-',
            ),
          );
          autoTable(doc, {
            head: [headers],
            body: rows,
            startY,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: {
              fillColor: [59, 130, 246],
              textColor: 255,
              fontStyle: 'bold',
            },
            alternateRowStyles: { fillColor: [249, 250, 251] },
          });
          startY = (doc as any).lastAutoTable.finalY + 6;
        }

        // Cancelled periods
        if (subject.cancelledPeriods?.length) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text('Cancelled / Replaced Periods', 14, startY);
          doc.setTextColor(0, 0, 0);
          startY += 4;
          const rows = subject.cancelledPeriods.map((p: any) =>
            keys.map((k) =>
              p[k] !== null && p[k] !== undefined ? String(p[k]) : '-',
            ),
          );
          autoTable(doc, {
            head: [headers],
            body: rows,
            startY,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: {
              fillColor: [220, 38, 38],
              textColor: 255,
              fontStyle: 'bold',
            },
            alternateRowStyles: { fillColor: [254, 242, 242] },
          });
          startY = (doc as any).lastAutoTable.finalY + 6;
        }

        // Replacement periods
        if (subject.replacedPeriods?.length) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(22, 163, 74);
          doc.text('Additional (Replacement) Periods', 14, startY);
          doc.setTextColor(0, 0, 0);
          startY += 4;
          const rows = subject.replacedPeriods.map((p: any) =>
            keys.map((k) =>
              p[k] !== null && p[k] !== undefined ? String(p[k]) : '-',
            ),
          );
          autoTable(doc, {
            head: [headers],
            body: rows,
            startY,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: {
              fillColor: [22, 163, 74],
              textColor: 255,
              fontStyle: 'bold',
            },
            alternateRowStyles: { fillColor: [240, 253, 244] },
          });
        }
      }
    }
    doc.save('Faculty_Load_Report.pdf');
  }

  get hasFacultyLoadCustomData(): boolean {
    return (
      this.selectedReport?.key === 'teacher-load' &&
      this.facultyLoadData.length > 0
    );
  }

  get hasAssignmentCustomData(): boolean {
    return (
      this.selectedReport?.key === 'batch-assignment-report' &&
      (this.assignmentBatchResults.length > 0 ||
        this.assignmentStudentResults.length > 0)
    );
  }

  get allSectionsSelected(): boolean {
    const active = this.sectionOptions.filter((s) => !s.disabled);
    return active.length > 0 && this.selectedSections.length === active.length;
  }

  isSectionSelected(key: string): boolean {
    return this.selectedSections.includes(key);
  }

  toggleSection(key: string, disabled: boolean) {
    if (disabled) return;
    if (this.isSectionSelected(key))
      this.selectedSections = this.selectedSections.filter((s) => s !== key);
    else this.selectedSections = [...this.selectedSections, key];
  }

  toggleSelectAllSections() {
    const activeKeys = this.sectionOptions
      .filter((s) => !s.disabled)
      .map((s) => s.key);
    if (this.allSectionsSelected) this.selectedSections = [];
    else this.selectedSections = activeKeys;
  }

  get hasFacultyReportData(): boolean {
    return (
      this.selectedReport?.key === 'teacher-faculty-report' &&
      this.facultyReportData.length > 0
    );
  }

  private exportFacultyReportPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    let isFirst = true;

    const periodHeaders = [
      'Date',
      'Batch',
      'Batch Code',
      'Subject',
      'From',
      'To',
      'Hours',
    ];
    const periodKeys = [
      'dateFormatted',
      'batchName',
      'batchCode',
      'subject',
      'fromTime',
      'endTime',
      'hours',
    ];

    for (const staff of this.facultyReportData) {
      if (!isFirst) doc.addPage();
      isFirst = false;

      // Staff header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Faculty Report', 14, 14);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${staff.staffName}${staff.staffCode ? ' (' + staff.staffCode + ')' : ''}`,
        14,
        22,
      );
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (staff.centerName) doc.text(`Center: ${staff.centerName}`, 14, 28);
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-IN')}`,
        200,
        14,
        { align: 'right' },
      );

      let startY = staff.centerName ? 34 : 30;

      const addSectionTable = (
        title: string,
        headers: string[],
        keys: string[],
        rows: any[],
        fillColor: [number, number, number],
        altFill: [number, number, number],
      ) => {
        if (!rows?.length) return;
        if (startY > 170) {
          doc.addPage();
          startY = 14;
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.text(title, 14, startY);
        doc.setTextColor(0, 0, 0);
        startY += 4;
        const tableRows = rows.map((r: any) =>
          keys.map((k) =>
            r[k] !== null && r[k] !== undefined ? String(r[k]) : '-',
          ),
        );
        autoTable(doc, {
          head: [headers],
          body: tableRows,
          startY,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: altFill },
        });
        startY = (doc as any).lastAutoTable.finalY + 6;
      };

      // Teaching
      if (staff.teaching?.periods?.length) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Teaching Hours: ${staff.teaching.totalHours} | ${staff.teaching.count} periods`,
          14,
          startY,
        );
        startY += 4;
        addSectionTable(
          'Teaching Hours',
          periodHeaders,
          periodKeys,
          staff.teaching.periods,
          [59, 130, 246],
          [239, 246, 255],
        );
      }

      // Cancelled
      if (staff.cancelled?.periods?.length) {
        const noteHeaders = [...periodHeaders, 'Note'];
        const noteKeys = [...periodKeys, 'note'];
        doc.setFontSize(8);
        doc.text(`Cancelled Periods: ${staff.cancelled.count}`, 14, startY);
        startY += 4;
        addSectionTable(
          'Cancelled Periods',
          noteHeaders,
          noteKeys,
          staff.cancelled.periods,
          [220, 38, 38],
          [254, 242, 242],
        );
      }

      // Replaced
      if (staff.replaced?.periods?.length) {
        doc.setFontSize(8);
        doc.text(`Replacement Periods: ${staff.replaced.count}`, 14, startY);
        startY += 4;
        addSectionTable(
          'Replacement Periods',
          periodHeaders,
          periodKeys,
          staff.replaced.periods,
          [22, 163, 74],
          [240, 253, 244],
        );
      }

      // Tasks
      if (staff.tasks?.tasks?.length) {
        doc.setFontSize(8);
        doc.text(`Tasks: ${staff.tasks.count}`, 14, startY);
        startY += 4;
        addSectionTable(
          'Tasks',
          [
            'Task Name',
            'Due Date',
            'Status',
            'Delayed',
            'Days Overdue',
            'Remarks',
          ],
          [
            'taskName',
            'dueDateFormatted',
            'status',
            'isDelayed',
            'daysOverdue',
            'remarks',
          ],
          staff.tasks.tasks,
          [124, 58, 237],
          [245, 243, 255],
        );
      }

      // Late Entry
      if (staff.lateEntry?.entries?.length) {
        doc.setFontSize(8);
        doc.text(`Late Entries: ${staff.lateEntry.count}`, 14, startY);
        startY += 4;
        addSectionTable(
          'Late Entry',
          ['Date', 'Batch Code', 'Period', 'Delay (min)', 'Reason'],
          ['dateFormatted', 'batchCode', 'periodNo', 'delayMinutes', 'reason'],
          staff.lateEntry.entries,
          [234, 88, 12],
          [255, 247, 237],
        );
      }

      // Early Leaving
      if (staff.earlyLeaving?.entries?.length) {
        doc.setFontSize(8);
        doc.text(`Early Leaving: ${staff.earlyLeaving.count}`, 14, startY);
        startY += 4;
        addSectionTable(
          'Early Leaving',
          ['Date', 'Batch Code', 'Period', 'Early By (min)', 'Reason'],
          [
            'dateFormatted',
            'batchCode',
            'periodNo',
            'earlyByMinutes',
            'reason',
          ],
          staff.earlyLeaving.entries,
          [234, 88, 12],
          [255, 247, 237],
        );
      }

      // Attendance Marked
      if (staff.attendanceMarked?.periods?.length) {
        doc.setFontSize(8);
        doc.text(
          `Attendance Marked: ${staff.attendanceMarked.count}`,
          14,
          startY,
        );
        startY += 4;
        addSectionTable(
          'Attendance Marked',
          [
            'Date',
            'Batch',
            'Period',
            'Subject',
            'Present',
            'Absent',
            'Late',
            'Total',
          ],
          [
            'dateFormatted',
            'batchCode',
            'periodNo',
            'subject',
            'presentCount',
            'absentCount',
            'lateCount',
            'total',
          ],
          staff.attendanceMarked.periods,
          [20, 184, 166],
          [240, 253, 250],
        );
      }

      // Attendance Not Marked
      if (staff.attendanceNotMarked?.periods?.length) {
        doc.setFontSize(8);
        doc.text(
          `Attendance Not Marked: ${staff.attendanceNotMarked.count}`,
          14,
          startY,
        );
        startY += 4;
        addSectionTable(
          'Attendance Not Marked',
          ['Date', 'Batch', 'Period', 'Subject'],
          ['dateFormatted', 'batchCode', 'periodNo', 'subject'],
          staff.attendanceNotMarked.periods,
          [245, 158, 11],
          [255, 251, 235],
        );
      }

      // Assignments
      if (staff.assignments?.rows?.length) {
        doc.setFontSize(8);
        doc.text(`Assignments Enabled: ${staff.assignments.count}`, 14, startY);
        startY += 4;
        addSectionTable(
          'Assignment Enabled Per Batch',
          [
            'Batch',
            'Batch Name',
            'Subject',
            'Test No',
            'Enabled On',
            'Students',
            'Completed',
            '%',
          ],
          [
            'batchCode',
            'batchName',
            'subjectName',
            'testNo',
            'enabledAtFormatted',
            'totalStudents',
            'completed',
            'completionPct',
          ],
          staff.assignments.rows,
          [99, 102, 241],
          [238, 242, 255],
        );
      }
    }
    doc.save('Faculty_Report.pdf');
  }

  private exportFacultyReportExcel(wb: any) {
    for (const staff of this.facultyReportData) {
      const sheetData: any[] = [];
      const col1 = 'Section';

      const addHeader = (text: string) => {
        sheetData.push({ [col1]: text });
      };
      const addRow = (obj: any) => sheetData.push(obj);
      const addEmpty = () => sheetData.push({});

      addHeader(
        `Staff: ${staff.staffName}${staff.staffCode ? ' (' + staff.staffCode + ')' : ''}`,
      );
      if (staff.centerName) addHeader(`Center: ${staff.centerName}`);
      addEmpty();

      const addSection = (
        title: string,
        count: number,
        totalHours: string | null,
        headers: string[],
        keys: string[],
        rows: any[],
      ) => {
        if (!rows?.length) return;
        addHeader(`${title} (${count}${totalHours ? ' | ' + totalHours : ''})`);
        // Column headers as first data row
        const headerRow: any = {};
        headers.forEach((h) => (headerRow[h] = h));
        sheetData.push(headerRow);
        rows.forEach((row) => {
          const r: any = {};
          keys.forEach((k, i) => {
            r[headers[i]] = row[k] ?? '';
          });
          sheetData.push(r);
        });
        addEmpty();
      };

      if (staff.teaching?.periods?.length)
        addSection(
          'Teaching Hours',
          staff.teaching.count,
          staff.teaching.totalHours,
          ['Date', 'Batch', 'Batch Code', 'Subject', 'From', 'To', 'Hours'],
          [
            'dateFormatted',
            'batchName',
            'batchCode',
            'subject',
            'fromTime',
            'endTime',
            'hours',
          ],
          staff.teaching.periods,
        );

      if (staff.cancelled?.periods?.length)
        addSection(
          'Cancelled Periods',
          staff.cancelled.count,
          staff.cancelled.totalHours,
          [
            'Date',
            'Batch',
            'Batch Code',
            'Subject',
            'From',
            'To',
            'Hours',
            'Note',
          ],
          [
            'dateFormatted',
            'batchName',
            'batchCode',
            'subject',
            'fromTime',
            'endTime',
            'hours',
            'note',
          ],
          staff.cancelled.periods,
        );

      if (staff.replaced?.periods?.length)
        addSection(
          'Replacement Periods',
          staff.replaced.count,
          staff.replaced.totalHours,
          ['Date', 'Batch', 'Batch Code', 'Subject', 'From', 'To', 'Hours'],
          [
            'dateFormatted',
            'batchName',
            'batchCode',
            'subject',
            'fromTime',
            'endTime',
            'hours',
          ],
          staff.replaced.periods,
        );

      if (staff.tasks?.tasks?.length)
        addSection(
          'Tasks',
          staff.tasks.count,
          null,
          [
            'Task Name',
            'Due Date',
            'Status',
            'Delayed',
            'Days Overdue',
            'Remarks',
          ],
          [
            'taskName',
            'dueDateFormatted',
            'status',
            'isDelayed',
            'daysOverdue',
            'remarks',
          ],
          staff.tasks.tasks,
        );

      if (staff.lateEntry?.entries?.length)
        addSection(
          'Late Entry',
          staff.lateEntry.count,
          null,
          ['Date', 'Batch Code', 'Period', 'Delay (min)', 'Reason'],
          ['dateFormatted', 'batchCode', 'periodNo', 'delayMinutes', 'reason'],
          staff.lateEntry.entries,
        );

      if (staff.earlyLeaving?.entries?.length)
        addSection(
          'Early Leaving',
          staff.earlyLeaving.count,
          null,
          ['Date', 'Batch Code', 'Period', 'Early By (min)', 'Reason'],
          [
            'dateFormatted',
            'batchCode',
            'periodNo',
            'earlyByMinutes',
            'reason',
          ],
          staff.earlyLeaving.entries,
        );

      if (staff.attendanceMarked?.periods?.length)
        addSection(
          'Attendance Marked',
          staff.attendanceMarked.count,
          null,
          [
            'Date',
            'Batch',
            'Period',
            'Subject',
            'Present',
            'Absent',
            'Late',
            'Total',
          ],
          [
            'dateFormatted',
            'batchCode',
            'periodNo',
            'subject',
            'presentCount',
            'absentCount',
            'lateCount',
            'total',
          ],
          staff.attendanceMarked.periods,
        );

      if (staff.attendanceNotMarked?.periods?.length)
        addSection(
          'Attendance Not Marked',
          staff.attendanceNotMarked.count,
          null,
          ['Date', 'Batch', 'Period', 'Subject'],
          ['dateFormatted', 'batchCode', 'periodNo', 'subject'],
          staff.attendanceNotMarked.periods,
        );

      if (staff.assignments?.rows?.length)
        addSection(
          'Assignment Enabled Per Batch',
          staff.assignments.count,
          null,
          [
            'Batch',
            'Batch Name',
            'Subject',
            'Test No',
            'Enabled On',
            'Students',
            'Completed',
            '%',
          ],
          [
            'batchCode',
            'batchName',
            'subjectName',
            'testNo',
            'enabledAtFormatted',
            'totalStudents',
            'completed',
            'completionPct',
          ],
          staff.assignments.rows,
        );

      const sheetName = (
        staff.staffCode || staff.staffName.substring(0, 10)
      ).substring(0, 31);
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(sheetData, { skipHeader: true }),
        sheetName,
      );
    }
  }

  private customPdfExport(reportKey: string): boolean {
    if (reportKey === 'batch-phase-allotment') {
      this.exportPhaseAllotmentPdf();
      return true;
    }
    if (reportKey === 'batch-subject-hours') {
      this.exportSubjectHoursPdf();
      return true;
    }
    if (reportKey === 'batch-assignment-report') {
      this.exportAssignmentReportPdf();
      return true;
    }
    if (reportKey === 'teacher-load') {
      this.exportFacultyLoadPdf();
      return true;
    }
    if (reportKey === 'teacher-faculty-report') {
      this.exportFacultyReportPdf();
      return true;
    }
    return false;
  }
}
