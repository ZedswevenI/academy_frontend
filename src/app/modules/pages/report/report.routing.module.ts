import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportComponent } from './report/report.component';
import { ReportsnewComponent } from './reportsnew/reportsnew.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: ReportsnewComponent, title: 'Report', canActivate: [PermissionGuard], data: { permission: 'reports:view' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportRoutingModule {}
