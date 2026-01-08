import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SampleComponent } from './sample/sample.component';
import { ReportComponent } from './report/report.component';

const routes: Routes = [

  { path: '', title: 'Dashboard', component: SampleComponent},
  { path: 'report', title: 'Reoport', component: ReportComponent}

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
