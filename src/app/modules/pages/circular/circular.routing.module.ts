import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CircularComponent } from './circular/circular.component';
import { CreateCircularComponent } from './create-circular/create-circular.component';
import { CircularViewComponent } from './circular-view/circular-view.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
    { path: '', component: CircularComponent, title: 'Circular', canActivate: [PermissionGuard], data: { permission: ['circular:list', 'circular:view'] } },
    // Create AND Edit share this route/component (isEditMode derived from
    // router state, not the URL) — accept either key.
    { path: 'create', component: CreateCircularComponent, title: 'Circular', canActivate: [PermissionGuard], data: { permission: ['circular:create', 'circular:edit'] } },
    { path: 'view', component: CircularViewComponent, title: 'Circular', canActivate: [PermissionGuard], data: { permission: 'circular:view' } },

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class CircularRoutingModule { }
