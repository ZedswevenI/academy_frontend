import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TeacherComponent } from './teacher/teacher.component';
import { CreateTeacherComponent } from './create-teacher/create-teacher.component';
import { ViewTeacherComponent } from './view-teacher/view-teacher.component';

const routes: Routes = [
    { path: '', component: TeacherComponent, title: 'Teacher' },
    { path: 'create', component: CreateTeacherComponent, title: 'Teacher'},
    { path: 'view', component: ViewTeacherComponent, title: 'Teacher' }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class TeacherRoutingModule { }