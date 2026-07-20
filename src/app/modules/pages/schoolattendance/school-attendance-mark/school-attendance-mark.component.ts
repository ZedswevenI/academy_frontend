import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';

@Component({
  selector: 'app-school-attendance-mark',
  standalone: false,
  templateUrl: './school-attendance-mark.component.html',
  styleUrl: './school-attendance-mark.component.scss',
})
export class SchoolAttendanceMarkComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  batchCode = '';
  batchName = '';
  batchId = '';
  section = '';
  classNo: any = '';
  date = 0;
  dateLabel = '';
  roleLevel = '';
  markedBy = '';
  markedByName = '';
  markedByRole = '';
  isEditMode = false;
  attendanceId = '';

  students: any[] = [];
  loading = false;
  submitting = false;
  selectAll = false;
  showSummary = false;
  classRemarks = '';

  presentCount = 0;
  absentCount = 0;
  lateCount = 0;
  notMarkedCount = 0;

  constructor(
    private breadcrumb: BredcrumpService,
    public router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private backNav: BackNavigationService,
  ) {
    this.breadcrumb.set([
      { label: 'School Attendance', link: '/app/school-attendance' },
      { label: 'Mark' },
    ]);
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state || history.state || {};
    this.batchCode = state.batchCode || '';
    this.batchName = state.batchName || '';
    this.batchId = state.batchId || '';
    this.section = state.section || '';
    this.classNo = state.classNo || '';
    this.date = state.date || 0;
    this.dateLabel = state.dateLabel || '';
    this.roleLevel = state.roleLevel || '';
    this.markedBy = state.markedBy || localStorage.getItem('userId') || '';
    this.markedByName =
      state.markedByName || localStorage.getItem('userName') || '';
    this.markedByRole = state.markedByRole || '';
  }

  ngOnInit(): void {
    if (!this.batchCode || !this.date) {
      this.router.navigate(['/app/school-attendance']);
      return;
    }
    this.loadStudents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStudents(): void {
    const tenantId = localStorage.getItem('tenantId');
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: tenantId, batchCode: this.batchCode, date: this.date },
        'batch',
        'school-attendance/students',
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.isEditMode = !!res?.isEditMode;
          this.attendanceId = res?.attendanceId || '';
          this.classRemarks = res?.existingRemarks || '';
          this.students = (Array.isArray(res?.data) ? res.data : []).map(
            (s: any) => ({ ...s }),
          );
          this.recalcSelectAll();
          this.recalcCounts();
        },
        error: () => {
          this.loading = false;
          this.alert.error('Failed to load students');
        },
      });
  }

  toggleAttendance(student: any): void {
    if (student.status === 'NOT_MARKED') student.status = 'PRESENT';
    else if (student.status === 'PRESENT') student.status = 'ABSENT';
    else if (student.status === 'ABSENT') student.status = 'PRESENT';
    else if (student.status === 'LATE') student.status = 'ABSENT';
    this.recalcSelectAll();
    this.recalcCounts();
  }

  toggleSelectAll(): void {
    this.students.forEach((s) => {
      if (s.status !== 'LATE') s.status = this.selectAll ? 'PRESENT' : 'ABSENT';
    });
    this.recalcCounts();
  }

  recalcSelectAll(): void {
    const nonLate = this.students.filter((s) => s.status !== 'LATE');
    this.selectAll =
      nonLate.length > 0 && nonLate.every((s) => s.status === 'PRESENT');
  }

  recalcCounts(): void {
    this.presentCount = this.students.filter(
      (s) => s.status === 'PRESENT',
    ).length;
    this.absentCount = this.students.filter(
      (s) => s.status === 'ABSENT',
    ).length;
    this.lateCount = this.students.filter((s) => s.status === 'LATE').length;
    this.notMarkedCount = this.students.filter(
      (s) => s.status === 'NOT_MARKED',
    ).length;
  }

  submitAttendance(): void {
    if (this.notMarkedCount > 0) {
      this.alert.warning(`${this.notMarkedCount} student(s) not marked yet.`);
      return;
    }
    this.recalcCounts();
    this.showSummary = true;
  }

  onConfirm(): void {
    this.showSummary = false;
    const tenantId = localStorage.getItem('tenantId');
    const payload = {
      entiId: tenantId,
      batchCode: this.batchCode,
      date: this.date,
      markedBy: this.markedBy,
      markedByName: this.markedByName,
      markedByRole: this.markedByRole,
      remarks: this.classRemarks || null,
      students: this.students
        .filter((s) => ['PRESENT', 'ABSENT', 'LATE'].includes(s.status))
        .map((s) => ({
          studentId: s.studentId,
          admissionNo: s.admissionNo,
          status: s.status,
          remarks: s.remarks || null,
        })),
    };

    this.submitting = true;
    this.commonApi
      .fetchData(payload, 'batch', 'school-attendance/mark')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.alert.success('Attendance submitted successfully');
          this.router.navigate(['/app/school-attendance']);
        },
        error: (err: any) => {
          this.submitting = false;
          this.alert.error(
            err?.error?.message || 'Failed to submit attendance',
          );
        },
      });
  }

  get isReadOnly(): boolean {
    const today = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    );
    // Teacher — read only on past dates
    if (['L4', 'L5'].includes(this.roleLevel)) return this.date < today;
    // AO/L1 — never read only
    return false;
  }

  
 goBack() {
    this.backNav.goBack({ route: '/app/school-attendance' });
  }
}
