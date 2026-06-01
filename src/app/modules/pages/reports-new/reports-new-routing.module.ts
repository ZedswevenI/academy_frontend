import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportsnewComponent } from './reportsnew/reportsnew.component';
import { BatchReportsComponent } from './batch/batch-reports/batch-reports.component';
import { StudentReportsComponent } from './student/student-reports/student-reports.component';
import { TeacherReportsComponent } from './teacher/teacher-reports/teacher-reports.component';
import { AssignmentReportsComponent } from './assignments/assignment-reports/assignment-reports.component';

import { BatchInfoComponent } from './batch/batch-info/batch-info.component';
import { BatchStudentsComponent } from './batch/batch-students/batch-students.component';
import { BatchStaffComponent } from './batch/batch-staff/batch-staff.component';
import { BatchTimetableComponent } from './batch/batch-timetable/batch-timetable.component';
import { BatchLateEntriesComponent } from './batch/batch-late-entries/batch-late-entries.component';
import { BatchPhaseAllotmentComponent } from './batch/batch-phase-allotment/batch-phase-allotment.component';
import { BatchSubjectHoursComponent } from './batch/batch-subject-hours/batch-subject-hours.component';
import { BatchExamsComponent } from './batch/batch-exams/batch-exams.component';
import { BatchFeedbackComponent } from './batch/batch-feedback/batch-feedback.component';
import { BatchPtmComponent } from './batch/batch-ptm/batch-ptm.component';
import { StudentAttendanceComponent } from './student/student-attendance/student-attendance.component';
import { StudentRemarksComponent } from './student/student-remarks/student-remarks.component';
import { StudentLateEntriesComponent } from './student/student-late-entries/student-late-entries.component';
import { TeacherFacultyReportComponent } from './teacher/teacher-faculty-report/teacher-faculty-report.component';
import { TeacherFacultyLoadComponent } from './teacher/teacher-faculty-load/teacher-faculty-load.component';
import { TeacherBatchesComponent } from './teacher/teacher-batches/teacher-batches.component';
import { TeacherTasksComponent } from './teacher/teacher-tasks/teacher-tasks.component';
import { TeacherLateEntriesComponent } from './teacher/teacher-late-entries/teacher-late-entries.component';
import { TeacherEarlyLeavingComponent } from './teacher/teacher-early-leaving/teacher-early-leaving.component';
import { TeacherAssignmentsComponent } from './teacher/teacher-assignments/teacher-assignments.component';
import { TeacherAttendanceComponent } from './teacher/teacher-attendance/teacher-attendance.component';
import { TeacherFeedbackComponent } from './teacher/teacher-feedback/teacher-feedback.component';
import { TeacherExamsComponent } from './teacher/teacher-exams/teacher-exams.component';
import { AssignmentReportComponent } from './assignments/assignment-report/assignment-report.component';
import { SlashReportComponent } from './assignments/slash-report/slash-report.component';

const routes: Routes = [
  {
    path: '',
    component: ReportsnewComponent,
    children: [
      {
        path: 'batch',
        component: BatchReportsComponent,
        title: 'Batch Reports',
        children: [
          { path: 'info', component: BatchInfoComponent, title: 'Batch Details' },
          { path: 'students', component: BatchStudentsComponent, title: 'Student List' },
          { path: 'staff', component: BatchStaffComponent, title: 'Staff List' },
          { path: 'timetable', component: BatchTimetableComponent, title: 'Timetable' },
          { path: 'late-entries', component: BatchLateEntriesComponent, title: 'Late Entries' },
          { path: 'phase-allotment', component: BatchPhaseAllotmentComponent, title: 'Phase Allotment' },
          { path: 'subject-hours', component: BatchSubjectHoursComponent, title: 'Subject Hours' },
          { path: 'exams', component: BatchExamsComponent, title: 'Exams' },
          { path: 'feedback', component: BatchFeedbackComponent, title: 'PTM Feedback' },
          { path: 'ptm', component: BatchPtmComponent, title: 'PTM Sessions' },
          { path: '', redirectTo: 'info', pathMatch: 'full' }
        ]
      },
      {
        path: 'student',
        component: StudentReportsComponent,
        title: 'Student Reports',
        children: [
          { path: 'attendance', component: StudentAttendanceComponent, title: 'Attendance' },
          { path: 'remarks', component: StudentRemarksComponent, title: 'Remarks' },
          { path: 'late-entries', component: StudentLateEntriesComponent, title: 'Late Entries' },
          { path: '', redirectTo: 'attendance', pathMatch: 'full' }
        ]
      },
      {
        path: 'teacher',
        component: TeacherReportsComponent,
        title: 'Teacher Reports',
        children: [
          { path: 'faculty-report', component: TeacherFacultyReportComponent, title: 'Faculty Report' },
          { path: 'faculty-load', component: TeacherFacultyLoadComponent, title: 'Faculty Load' },
          { path: 'batches', component: TeacherBatchesComponent, title: 'Batches' },
          { path: 'tasks', component: TeacherTasksComponent, title: 'Tasks' },
          { path: 'late-entries', component: TeacherLateEntriesComponent, title: 'Late Entries' },
          { path: 'early-leaving', component: TeacherEarlyLeavingComponent, title: 'Early Leaving' },
          { path: 'assignments', component: TeacherAssignmentsComponent, title: 'Assignments' },
          { path: 'attendance', component: TeacherAttendanceComponent, title: 'Attendance Marking' },
          { path: 'feedback', component: TeacherFeedbackComponent, title: 'PTM Feedback' },
          { path: 'exams', component: TeacherExamsComponent, title: 'Exams' },
          { path: '', redirectTo: 'faculty-report', pathMatch: 'full' }
        ]
      },
      {
        path: 'assignments',
        component: AssignmentReportsComponent,
        title: 'Assignment Reports',
        children: [{ path: 'report', component: AssignmentReportComponent, title: 'Assignment Report' }, { path: 'slash', component: SlashReportComponent, title: 'Slash Report' }, { path: '', redirectTo: 'report', pathMatch: 'full' }]
      },
      { path: '', redirectTo: 'batch', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsNewRoutingModule {}
