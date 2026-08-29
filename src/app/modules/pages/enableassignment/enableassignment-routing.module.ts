import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssignmentEnableComponent } from './assignment-enable/assignment-enable.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  {
    path: '',
    component: AssignmentEnableComponent,
    canActivate: [PermissionGuard],
    data: { permission: ['enableAssignment:list', 'assignmentBatch:list'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EnableassignmentRoutingModule {}
