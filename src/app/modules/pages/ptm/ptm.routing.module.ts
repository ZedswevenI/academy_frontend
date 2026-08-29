import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PtmComponent } from './ptm/ptm.component';
import { CreatePTMComponent } from './create-ptm/create-ptm.component';
import { PtmviewComponent } from './ptmview/ptmview.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: PtmComponent, title: 'PTM', canActivate: [PermissionGuard], data: { permission: ['ptm:list', 'ptm:view']} },
  // Create AND Edit share this route/component (isEditMode derived from
  // router state, not the URL) — accept either key.
  { path: 'create', component: CreatePTMComponent, title: 'PTM', canActivate: [PermissionGuard], data: { permission: ['ptm:create', 'ptm:edit'] } },
  // ptm:view has no backend enforcement (public/student-facing endpoints) —
  // gated on ptm:list here since that's the real access boundary for staff.
  { path: 'view/:id', component: PtmviewComponent, title: 'PTM Details', canActivate: [PermissionGuard], data: { permission: 'ptm:list' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PtmRoutingModule {}
