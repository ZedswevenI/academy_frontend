import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupportComponent } from './support/support.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
    { path: '', component: SupportComponent, title: 'Support', canActivate: [PermissionGuard], data: { permission: ['support:list', 'support:view']} },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class SupportRoutingModule { }