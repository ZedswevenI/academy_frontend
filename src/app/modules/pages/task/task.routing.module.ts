import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TaskComponent } from './task/task.component';
import { TaskViewComponent } from './task-view/task-view.component';
import { TaskCreateComponent } from './task-create/task-create.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
    { path: '', component: TaskComponent, title: 'Task', canActivate: [PermissionGuard], data: { permission: ['task:list', 'task:view'] } },
    { path: 'view', component: TaskViewComponent, title: 'Task', canActivate: [PermissionGuard], data: { permission: 'task:view' } },
    // Create AND Edit share this route/component (isEditMode derived from
    // router state, not the URL) — accept either key to enter.
    { path: 'create', component: TaskCreateComponent, title: 'Task', canActivate: [PermissionGuard], data: { permission: ['task:create', 'task:edit'] } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TaskRoutingModule { }
