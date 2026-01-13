import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TaskComponent } from './task/task.component';
import { TaskViewComponent } from './task-view/task-view.component';

const routes: Routes = [
    { path: '', component: TaskComponent, title: 'Task'},
    { path: 'view', component: TaskViewComponent, title: 'Task'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TaskRoutingModule { }
