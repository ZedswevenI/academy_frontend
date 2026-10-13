import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AttendanceComponent } from './attendance/attendance.component';
import { StudentListComponent } from './student-list/student-list.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: AttendanceComponent, title: 'Student Attendance', canActivate: [PermissionGuard], data: { permission: 'attendance:list' } },
  // Mark AND Edit share this one route/component/submit handler — the URL
  // can't distinguish which action the user intends, so the guard accepts
  // either key. The actual mark-vs-edit split is enforced by which button
  // is visible on the schedule screen (see attendance.component.ts buildActions()).
  { path: 'mark', component: StudentListComponent, title: 'Student Attendance', canActivate: [PermissionGuard], data: { permission: ['attendance:mark', 'attendance:edit'] } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AttendanceRoutingModule {}
