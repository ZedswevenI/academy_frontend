import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhaseListComponent } from './phase-list/phase-list.component';
import { PhaseCreateComponent } from './phase-create/phase-create.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: 'create', component: PhaseCreateComponent, title: 'Phase Plan', canActivate: [PermissionGuard], data: { permission: ['phase:create', 'phase:edit'] } },
  { path: '', component: PhaseListComponent, title: 'Phase Plan', canActivate: [PermissionGuard], data: { permission: ['phase:list', 'phase:view'] } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhaseRoutingModule {}
