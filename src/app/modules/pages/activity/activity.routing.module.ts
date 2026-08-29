import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ActivityComponent } from './activity/activity.component';
import { createActivityComponent } from './create-activity/create-activity.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
    { path: '', component: ActivityComponent, title: 'Activity', canActivate: [PermissionGuard], data: { permission: 'activity:list' } },
    // Create AND Edit share this route/component (isEditMode derived from
    // router state, not the URL) — accept either key.
    { path: 'create', component: createActivityComponent, title: 'Create Activity', canActivate: [PermissionGuard], data: { permission: ['activity:create', 'activity:edit'] } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class ActivityRoutingModule { }
