import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'batch',
    loadChildren: () =>
      import('../pages/batch/batch.module').then((m) => m.BatchModule),
  },
  {
    path: 'timetable',
    loadChildren: () =>
      import('../pages/timetable/timetable.module').then((m) => m.TimetableModule),
  },
  {
    path: 'attendance',
    loadChildren: () =>
      import('../pages/attendance/attendance.module').then((m) => m.AttendanceModule),
  },
  {
    path: 'report',
    loadChildren: () =>
      import('../pages/report/report.module').then((m) => m.ReportModule),
  },
  {
    path: 'teacher',
    loadChildren: () =>
      import('../pages/teachers/teacher.module').then((m) => m.TeacherModule),
  },
  {
    path: 'student',
    loadChildren: () =>
      import('../pages/student/student.module').then((m) => m.StudentModule),
  },
  {
    path: 'communication',
    loadChildren: () =>
      import('../pages/communication/communication.module').then((m) => m.CommunicationModule),
  },
  {
    path: 'assignment',
    loadChildren: () =>
      import('../pages/assignment/assignment.module').then((m) => m.AssignmentModule),
  },
  {
    path: 'activity',
    loadChildren: () =>
      import('../pages/activity/activity.module').then((m) => m.ActivityModule),
  },
  {
    path: 'feedback',
    loadChildren: () =>
      import('../pages/feedback/feedback.module').then((m) => m.FeedbackModule),
  },
  {
    path: 'support',
    loadChildren: () =>
      import('../pages/support/support.module').then((m) => m.SupportModule),
  },
  {
    path: 'performance',
    loadChildren: () =>
      import('../pages/performance/performance.module').then((m) => m.PerformanceModule),
  },
  {
    path: 'ptm',
    loadChildren: () =>
      import('../pages/ptm/ptm.module').then((m) => m.PtmModule),
  },
  {
    path: 'package',
    loadChildren: () =>
      import('../pages/package/package.module').then((m) => m.PackageModule),
  },
  {
    path: 'knowledge',
    loadChildren: () =>
      import('../pages/knowledge/knowledge.module').then((m) => m.KnowledgeModule),
  },
  {
    path: 'task',
    loadChildren: () =>
      import('../pages/task/task.module').then((m) => m.TaskModule),
  },
  {
    path: 'org-master',
    loadChildren: () =>
      import('../pages/orgMaster/orgMaster.module').then((m) => m.OrgMasterModule),
  },
  {
    path: 'phase',
    loadChildren: () =>
      import('../pages/phase/phase.module').then((m) => m.PhaseModule),
  },
  {
    path: 'circular',
    loadChildren: () =>
      import('../pages/circular/circular.module').then((m) => m.CircularModule),
  },



  {
    path: 'class',
    loadChildren: () =>
      import('../pages/class/class.module').then((m) => m.ClassModule),
  },
  {
    path: 'inward',
    loadChildren: () =>
      import('./inward/inward.module').then((m) => m.InwardModule),
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule { }
