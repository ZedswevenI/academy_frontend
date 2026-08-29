import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../../shared/permission.guard';

import { SchoolAttendanceComponent } from './school-attendance/school-attendance.component';
import { SchoolAttendanceMarkComponent } from './school-attendance-mark/school-attendance-mark.component';

const routes: Routes = [
  { path: '', component: SchoolAttendanceComponent, canActivate: [PermissionGuard], data: { permission: 'schoolAttendance:list' } },
  // Toggle Student and Submit have no distinct backend route — both are
  // client-side state only persisted via the same school-attendance/mark
  // call, so schoolAttendance:mark covers all three. Also accepts
  // schoolAttendance:list because this same screen doubles as a read-only
  // "View" mode (see canMarkBatch() in school-attendance.component.ts) —
  // there's no separate view key in this catalog, so list-only viewers
  // still need to reach it, just without write capability.
  { path: 'mark', component: SchoolAttendanceMarkComponent, canActivate: [PermissionGuard], data: { permission: ['schoolAttendance:mark', 'schoolAttendance:list'] } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SchoolattendanceRoutingModule {}
