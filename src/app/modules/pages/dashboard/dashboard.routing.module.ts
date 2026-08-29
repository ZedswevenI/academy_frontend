import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SampleComponent } from './sample/sample.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardnewComponent } from './dashboardnew/dashboardnew.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: DashboardnewComponent, title: 'Dashboard', canActivate: [PermissionGuard], data: { permission: 'dashboard:view' } },
  { path: 'sample', component: SampleComponent, title: 'Dashboard' },
  { path: 'old', component: DashboardComponent, title: 'Dashboard' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
