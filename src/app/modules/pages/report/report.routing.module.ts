import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportComponent } from './report/report.component';
import { ReportsnewComponent } from './reportsnew/reportsnew.component';

const routes: Routes = [{ path: '', component: ReportsnewComponent, title: 'Report' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportRoutingModule {}
