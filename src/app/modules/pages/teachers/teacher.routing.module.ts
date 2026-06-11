import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TeacherComponent } from './teacher/teacher.component';
import { ViewTeacherComponent } from './view-teacher/view-teacher.component';

const routes: Routes = [{ path: '', component: TeacherComponent, title: 'Teachers' }, { path: 'view', component: ViewTeacherComponent, title: 'Teacher Details' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TeacherRoutingModule {}
