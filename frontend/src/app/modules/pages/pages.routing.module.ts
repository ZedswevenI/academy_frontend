import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'attendance',
    loadChildren: () =>
      import('../pages/attendance/attendance.module').then((m) => m.AttendanceModule),
  },
  {
    path: 'inward',
    loadChildren: () =>
      import('./inward/inward.module').then((m) => m.InwardModule),
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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule { }
