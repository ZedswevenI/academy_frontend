import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'timetable',
    loadChildren: () =>
      import('../pages/timetable/timetable.module').then((m) => m.TimetableModule),
  },
  {
    path: 'batch',
    loadChildren: () =>
      import('../pages/batch/batch.module').then((m) => m.BatchModule),
  },
  {
    path: 'class',
    loadChildren: () =>
      import('../pages/class/class.module').then((m) => m.ClassModule),
  },
  {
    path: 'student',
    loadChildren: () =>
      import('../pages/student/student.module').then((m) => m.StudentModule),
  },
  {
    path: 'attendance',
    loadChildren: () =>
      import('../pages/attendance/attendance.module').then((m) => m.AttendanceModule),
  },
  {
    path: 'assignment',
    loadChildren: () =>
      import('../pages/assignment/assignment.module').then((m) => m.AssignmentModule),
  },
  {
    path: 'task',
    loadChildren: () =>
      import('../pages/task/task.module').then((m) => m.TaskModule),
  },
  {
    path: 'communication',
    loadChildren: () =>
      import('../pages/communication/communication.module').then((m) => m.CommunicationModule),
  },
  {
    path: 'knowledge',
    loadChildren: () =>
      import('../pages/knowledge/knowledge.module').then((m) => m.KnowledgeModule),
  },
  {
    path: 'performance',
    loadChildren: () =>
      import('../pages/performance/performance.module').then((m) => m.PerformanceModule),
  },
   {
    path: 'phase',
    loadChildren: () =>
      import('../pages/phase/phase.module').then((m) => m.PhaseModule),
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
