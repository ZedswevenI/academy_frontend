import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../../shared/permission.guard';

import { StudentComponent } from './student/student.component';
import { StudentViewComponent } from './student-view/student-view.component';
import { GridListComponent } from './grid-list/grid-list.component';
import { TableListComponent } from './table-list/table-list.component';

const routes: Routes = [
  { path: '', component: StudentComponent, title: 'Student', canActivate: [PermissionGuard], data: { permission: 'student:list' } },
  { path: 'view/:id', component: StudentViewComponent, title: 'Student', canActivate: [PermissionGuard], data: { permission: 'student:view' } },
  { path: 'grid', component: GridListComponent, title: 'Student', canActivate: [PermissionGuard], data: { permission: 'student:list' } },
  { path: 'list', component: TableListComponent, title: 'Student', canActivate: [PermissionGuard], data: { permission: 'student:list' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StudentRoutingModule {}
