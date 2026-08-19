import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TeacherComponent } from './teacher/teacher.component';
import { ViewTeacherComponent } from './view-teacher/view-teacher.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: TeacherComponent, title: 'Teachers', canActivate: [PermissionGuard], data: { permission: 'teacher:list' } },
  { path: 'view', component: ViewTeacherComponent, title: 'Teacher Details', canActivate: [PermissionGuard], data: { permission: 'teacher:view' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TeacherRoutingModule {}
