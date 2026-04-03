import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SchoolAttendanceComponent } from './school-attendance/school-attendance.component';
import { SchoolAttendanceMarkComponent } from './school-attendance-mark/school-attendance-mark.component';

const routes: Routes = [{ path: '', component: SchoolAttendanceComponent }, { path: 'mark', component: SchoolAttendanceMarkComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SchoolattendanceRoutingModule {}
