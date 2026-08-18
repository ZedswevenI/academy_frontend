import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PackageComponent } from './package/package.component';
import { PackCreateComponent } from './pack-create/pack-create.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
    { path: '', component: PackageComponent, title: 'Study Materials', canActivate: [PermissionGuard], data: { permission: 'package:list' } },
    // Create AND Edit share this route/component (isEditMode derived from
    // router state, not the URL) — accept either key.
    { path: 'create', component: PackCreateComponent, title: 'Study Materials', canActivate: [PermissionGuard], data: { permission: ['package:create', 'package:edit'] } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class PackageRoutingModule { }
