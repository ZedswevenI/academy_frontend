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
    path: 'dashboard',
    canActivate: [RoleGuard],
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
    path: 'assignment',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/test/test.module').then(m => m.TestModule)
  },
  {
    path: 'report',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/report/report.module').then(m => m.ReportModule)
  },
  {
    path: 'teacher',
    canActivate: [RoleGuard],
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
    path: 'communication',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/communication/communication.module').then(m => m.CommunicationModule)
  },
  {
    path: 'enableassignment',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/enableassignment/enableassignment.module').then(m => m.EnableassignmentModule)
  },
  {
    path: 'activity',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/activity/activity.module').then(m => m.ActivityModule)
  },
  {
    path: 'feedback',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/feedback/feedback.module').then(m => m.FeedbackModule)
  },
  {
    path: 'support',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/support/support.module').then(m => m.SupportModule)
  },
  {
    path: 'performance',
    canActivate: [RoleGuard],
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
    path: 'package',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/package/package.module').then(m => m.PackageModule)
  },
  {
    path: 'knowledge',
    canActivate: [RoleGuard],
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
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/orgmasters/orgmasters.module').then(m => m.OrgmastersModule)
  },
  {
    path: 'phase',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/phase/phase.module').then(m => m.PhaseModule)
  },
  {
    path: 'circular',
    canActivate: [RoleGuard],
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
    path: 'exams',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/exams/exam.module').then(m => m.ExamModule)
  },
  {
    path: 'reportnew',
    canActivate: [RoleGuard],
    loadChildren: () => import('../pages/reports-new/reports-new.module').then(m => m.ReportsNewModule)
  },
  { path: 'invigilation', loadChildren: () => import('../pages/invigilation/invigilation.module').then(m => m.InvigilationModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule {}
