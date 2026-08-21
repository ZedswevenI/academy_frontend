// import { NgModule } from '@angular/core';
// import { RouterModule, Routes } from '@angular/router';

// const routes: Routes = [
//   {
//     path: 'dashboard',
//     loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
//   },
//   {
//     path: 'batch',
//     loadChildren: () => import('../pages/batch/batch.module').then(m => m.BatchModule)
//   },
//   {
//     path: 'timetable',
//     loadChildren: () => import('../pages/timetable/timetable.module').then(m => m.TimetableModule)
//   },
//   {
//     path: 'attendance',
//     loadChildren: () => import('../pages/attendance/attendance.module').then(m => m.AttendanceModule)
//   },
//   {
//     path: 'assignment',
//     loadChildren: () => import('../pages/test/test.module').then(m => m.TestModule)
//   },
//   {
//     path: 'report',
//     loadChildren: () => import('../pages/report/report.module').then(m => m.ReportModule)
//   },
//   {
//     path: 'teacher',
//     loadChildren: () => import('../pages/teachers/teacher.module').then(m => m.TeacherModule)
//   },
//   {
//     path: 'student',
//     loadChildren: () => import('../pages/student/student.module').then(m => m.StudentModule)
//   },
//   {
//     path: 'chat',
//     loadChildren: () => import('../pages/chat/chat.module').then(m => m.ChatModule)
//   },
//   {
//     path: 'communication',
//     loadChildren: () => import('../pages/communication/communication.module').then(m => m.CommunicationModule)
//   },
//   // {
//   //   path: 'assignment',
//   //   loadChildren: () => import('../pages/assignment/assignment.module').then(m => m.AssignmentModule)
//   // },
//   {
//     path: 'enableassignment',
//     loadChildren: () => import('../pages/enableassignment/enableassignment.module').then(m => m.EnableassignmentModule)
//   },
//   {
//     path: 'activity',
//     loadChildren: () => import('../pages/activity/activity.module').then(m => m.ActivityModule)
//   },
//   {
//     path: 'feedback',
//     loadChildren: () => import('../pages/feedback/feedback.module').then(m => m.FeedbackModule)
//   },
//   {
//     path: 'support',
//     loadChildren: () => import('../pages/support/support.module').then(m => m.SupportModule)
//   },
//   {
//     path: 'performance',
//     loadChildren: () => import('../pages/performance/performance.module').then(m => m.PerformanceModule)
//   },
//   {
//     path: 'ptm',
//     loadChildren: () => import('../pages/ptm/ptm.module').then(m => m.PtmModule)
//   },
//   {
//     path: 'package',
//     loadChildren: () => import('../pages/package/package.module').then(m => m.PackageModule)
//   },
//   {
//     path: 'knowledge',
//     loadChildren: () => import('../pages/knowledge/knowledge.module').then(m => m.KnowledgeModule)
//   },
//   {
//     path: 'task',
//     loadChildren: () => import('../pages/task/task.module').then(m => m.TaskModule)
//   },
//   {
//     path: 'org-master',
//     loadChildren: () => import('../pages/orgmasters/orgmasters.module').then(m => m.OrgmastersModule)
//   },
//   {
//     path: 'phase',
//     loadChildren: () => import('../pages/phase/phase.module').then(m => m.PhaseModule)
//   },
//   {
//     path: 'circular',
//     loadChildren: () => import('../pages/circular/circular.module').then(m => m.CircularModule)
//   },

//   {
//     path: 'class',
//     loadChildren: () => import('../pages/class/class.module').then(m => m.ClassModule)
//   },
//   {
//     path: 'inward',
//     loadChildren: () => import('./inward/inward.module').then(m => m.InwardModule)
//   }
// ];

// @NgModule({
//   imports: [RouterModule.forChild(routes)],
//   exports: [RouterModule]
// })
// export class PagesRoutingModule {}

// ============================================================
//  pages-routing.module.ts  –  All routes protected by RoleGuard
//  Replaces existing pages-routing.module.ts
// ============================================================

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../shared/role.guard';
import { PermissionGuard } from '../../shared/permission.guard';

const routes: Routes = [
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'dashboard:view'.
    path: 'dashboard',
    canActivate: [PermissionGuard],
    data: { permission: 'dashboard:view' },
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    // Pilot: migrated off RoleGuard onto PermissionGuard. Requires
    // 'batch:list' in the logged-in user's permissions[] — assign it via
    // Org Masters → Users for anyone who needs Batch access.
    path: 'batch',
    canActivate: [PermissionGuard],
    data: { permission: 'batch:list' },
    loadChildren: () => import('../pages/batch/batch.module').then(m => m.BatchModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'timetable:list'.
    // Sub-routes carry their own guards too (see timetable.routing.module.ts).
    path: 'timetable',
    canActivate: [PermissionGuard],
    data: { permission: 'timetable:list' },
    loadChildren: () => import('../pages/timetable/timetable.module').then(m => m.TimetableModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'attendance:list'.
    // Sub-routes carry their own guards too (see attendance.routing.module.ts).
    path: 'attendance',
    canActivate: [PermissionGuard],
    data: { permission: 'attendance:list' },
    loadChildren: () => import('../pages/attendance/attendance.module').then(m => m.AttendanceModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'schoolAttendance:list'.
    path: 'school-attendance',
    canActivate: [PermissionGuard],
    data: { permission: 'schoolAttendance:list' },
    loadChildren: () => import('../pages/schoolattendance/schoolattendance.module').then(m => m.SchoolattendanceModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'test:list'.
    path: 'assignment',
    canActivate: [PermissionGuard],
    data: { permission: 'test:list' },
    loadChildren: () => import('../pages/test/test.module').then(m => m.TestModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'reports:view'.
    path: 'report',
    canActivate: [PermissionGuard],
    data: { permission: 'reports:view' },
    loadChildren: () => import('../pages/report/report.module').then(m => m.ReportModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'teacher:list'.
    path: 'teacher',
    canActivate: [PermissionGuard],
    data: { permission: 'teacher:list' },
    loadChildren: () => import('../pages/teachers/teacher.module').then(m => m.TeacherModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'student:list'.
    // Sub-routes carry their own guards too (see student.routing.module.ts).
    path: 'student',
    canActivate: [PermissionGuard],
    data: { permission: 'student:list' },
    loadChildren: () => import('../pages/student/student.module').then(m => m.StudentModule)
  },
  {
    path: 'chat',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/chat/chat.module').then(m => m.ChatModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard. Five sub-areas share this
    // parent path under distinct key prefixes (communication/communicationTemplate/
    // communicationEvent/communicationBulkMail/communicationLog) — the gate accepts
    // any of them; sub-routes enforce the exact key needed.
    path: 'communication',
    canActivate: [PermissionGuard],
    data: { permission: ['communication:create', 'communicationTemplate:list', 'communicationEvent:list', 'communicationBulkMail:send', 'communicationLog:list'] },
    loadChildren: () => import('../pages/communication/communication.module').then(m => m.CommunicationModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard. This screen also embeds
    // the per-batch assign/unassign UI (assignmentBatch:*), so the gate
    // accepts either module's list-equivalent key.
    path: 'enableassignment',
    canActivate: [PermissionGuard],
    data: { permission: ['enableAssignment:list', 'assignmentBatch:list'] },
    loadChildren: () => import('../pages/enableassignment/enableassignment.module').then(m => m.EnableassignmentModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'activity:list'.
    path: 'activity',
    canActivate: [PermissionGuard],
    data: { permission: 'activity:list' },
    loadChildren: () => import('../pages/activity/activity.module').then(m => m.ActivityModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard. Templates live under this
    // same parent path but use a different key prefix (feedbackTemplate:*),
    // so the gate accepts either — sub-routes enforce the exact key needed.
    path: 'feedback',
    canActivate: [PermissionGuard],
    data: { permission: ['feedback:list', 'feedbackTemplate:list'] },
    loadChildren: () => import('../pages/feedback/feedback.module').then(m => m.FeedbackModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'support:list'.
    path: 'support',
    canActivate: [PermissionGuard],
    data: { permission: 'support:list' },
    loadChildren: () => import('../pages/support/support.module').then(m => m.SupportModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard. Accepts either list or
    // view since the roster and student-detail screens each carry their own key.
    path: 'performance',
    canActivate: [PermissionGuard],
    data: { permission: ['performance:list', 'performance:view'] },
    loadChildren: () => import('../pages/performance/performance.module').then(m => m.PerformanceModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'ptm:list'.
    path: 'ptm',
    canActivate: [PermissionGuard],
    data: { permission: 'ptm:list' },
    loadChildren: () => import('../pages/ptm/ptm.module').then(m => m.PtmModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'package:list'.
    path: 'package',
    canActivate: [PermissionGuard],
    data: { permission: 'package:list' },
    loadChildren: () => import('../pages/package/package.module').then(m => m.PackageModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'knowledge:list'.
    path: 'knowledge',
    canActivate: [PermissionGuard],
    data: { permission: 'knowledge:list' },
    loadChildren: () => import('../pages/knowledge/knowledge.module').then(m => m.KnowledgeModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'task:list'.
    path: 'task',
    canActivate: [PermissionGuard],
    data: { permission: 'task:list' },
    loadChildren: () => import('../pages/task/task.module').then(m => m.TaskModule)
  },
  {
    path: 'org-master',
    // canActivate: [RoleGuard],
    canActivate: [PermissionGuard],
    loadChildren: () => import('../pages/orgmasters/orgmasters.module').then(m => m.OrgmastersModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'phase:list'.
    path: 'phase',
    canActivate: [PermissionGuard],
    data: { permission: 'phase:list' },
    loadChildren: () => import('../pages/phase/phase.module').then(m => m.PhaseModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard — requires 'circular:list'.
    path: 'circular',
    canActivate: [PermissionGuard],
    data: { permission: 'circular:list' },
    loadChildren: () => import('../pages/circular/circular.module').then(m => m.CircularModule)
  },
  {
    path: 'class',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/class/class.module').then(m => m.ClassModule)
  },
  {
    path: 'inward',
    canActivate: [RoleGuard],
    loadChildren: () => import('./inward/inward.module').then(m => m.InwardModule)
  },
  {
    // Migrated off RoleGuard onto PermissionGuard. Three sub-areas share this
    // parent path under distinct key prefixes (exam/examContent/examImport) —
    // the gate accepts any of them; sub-routes enforce the exact key needed.
    path: 'exams',
    canActivate: [PermissionGuard],
    data: { permission: ['exam:list', 'examContent:list', 'examImport:list'] },
    loadChildren: () => import('../pages/exams/exam.module').then(m => m.ExamModule)
  },
  {
    path: 'reportnew',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/reports-new/reports-new.module').then(m => m.ReportsNewModule)
  },
  // Was completely unguarded (no RoleGuard, no data.permission) — now
  // requires 'invigilation:list'.
  { path: 'invigilation', canActivate: [PermissionGuard], data: { permission: 'invigilation:list' }, loadChildren: () => import('../pages/invigilation/invigilation.module').then(m => m.InvigilationModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule {}
