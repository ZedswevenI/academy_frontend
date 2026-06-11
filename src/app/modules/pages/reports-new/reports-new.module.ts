import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { ReportsNewRoutingModule } from './reports-new-routing.module';
import { BatchMultiselectComponent } from './shared/batch-multiselect/batch-multiselect.component';
import { StaffMultiselectComponent } from './shared/staff-multiselect/staff-multiselect.component';
import { StudentMultiselectComponent } from './shared/student-multiselect/student-multiselect.component';
// import { SubjectSelectComponent } from './shared/subject-multiselect/subject-multiselect.component';
import { ReportTableComponent } from './shared/report-table/report-table.component';
import { ReportsnewComponent } from './reportsnew/reportsnew.component';
import { BatchInfoComponent } from './batch/batch-info/batch-info.component';
import { BatchStudentsComponent } from './batch/batch-students/batch-students.component';
import { BatchReportsComponent } from './batch/batch-reports/batch-reports.component';
import { BatchStaffComponent } from './batch/batch-staff/batch-staff.component';
import { BatchTimetableComponent } from './batch/batch-timetable/batch-timetable.component';
import { BatchLateEntriesComponent } from './batch/batch-late-entries/batch-late-entries.component';
import { BatchPhaseAllotmentComponent } from './batch/batch-phase-allotment/batch-phase-allotment.component';
import { BatchSubjectHoursComponent } from './batch/batch-subject-hours/batch-subject-hours.component';
import { BatchExamsComponent } from './batch/batch-exams/batch-exams.component';
import { BatchFeedbackComponent } from './batch/batch-feedback/batch-feedback.component';
import { BatchPtmComponent } from './batch/batch-ptm/batch-ptm.component';
import { StudentReportsComponent } from './student/student-reports/student-reports.component';
import { StudentAttendanceComponent } from './student/student-attendance/student-attendance.component';
import { StudentRemarksComponent } from './student/student-remarks/student-remarks.component';
import { StudentLateEntriesComponent } from './student/student-late-entries/student-late-entries.component';
import { TeacherReportsComponent } from './teacher/teacher-reports/teacher-reports.component';
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
import { AssignmentReportsComponent } from './assignments/assignment-reports/assignment-reports.component';
import { AssignmentReportComponent } from './assignments/assignment-report/assignment-report.component';
import { SlashReportComponent } from './assignments/slash-report/slash-report.component';
import { SubjectSelectComponent } from './shared/subject-multiselect/subject-multiselect.component';
import { DateRangeFilterComponent } from './shared/subject-multiselect/date-range-filter.component';

@NgModule({
  declarations: [
    ReportsnewComponent,
    BatchMultiselectComponent,
    StaffMultiselectComponent,
    StudentMultiselectComponent,
    SubjectSelectComponent,
    DateRangeFilterComponent,
    ReportTableComponent,
    BatchReportsComponent,
    BatchInfoComponent,
    BatchStudentsComponent,
    BatchStaffComponent,
    BatchTimetableComponent,
    BatchLateEntriesComponent,
    BatchPhaseAllotmentComponent,
    BatchSubjectHoursComponent,
    BatchExamsComponent,
    BatchFeedbackComponent,
    BatchPtmComponent,
    StudentReportsComponent,
    StudentAttendanceComponent,
    StudentRemarksComponent,
    StudentLateEntriesComponent,
    TeacherReportsComponent,
    TeacherFacultyReportComponent,
    TeacherFacultyLoadComponent,
    TeacherBatchesComponent,
    TeacherTasksComponent,
    TeacherLateEntriesComponent,
    TeacherEarlyLeavingComponent,
    TeacherAssignmentsComponent,
    TeacherAttendanceComponent,
    TeacherFeedbackComponent,
    TeacherExamsComponent,
    AssignmentReportsComponent,
    AssignmentReportComponent,
    SlashReportComponent
  ],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, ReportsNewRoutingModule, UiElementsModule]
})
export class ReportsNewModule {}
