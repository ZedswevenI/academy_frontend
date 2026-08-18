import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { InvigilationComponent } from './invigilation/invigilation.component';
import { InvigilationviewComponent } from './invigilationview/invigilationview.component';
import { InvigilationcreateComponent } from './invigilationcreate/invigilationcreate.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: InvigilationComponent, canActivate: [PermissionGuard], data: { permission: 'invigilation:list' } },
  { path: 'create', component: InvigilationcreateComponent, canActivate: [PermissionGuard], data: { permission: 'invigilation:create' } },
  { path: 'edit/:id', component: InvigilationcreateComponent, canActivate: [PermissionGuard], data: { permission: 'invigilation:edit' } },
  { path: 'view/:id', component: InvigilationviewComponent, canActivate: [PermissionGuard], data: { permission: 'invigilation:view' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InvigilationRoutingModule {}
