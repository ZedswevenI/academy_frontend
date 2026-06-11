import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SampleComponent } from './sample/sample.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardnewComponent } from './dashboardnew/dashboardnew.component';

const routes: Routes = [{ path: '', component: DashboardnewComponent, title: 'Dashboard' }, { path: 'sample', component: SampleComponent, title: 'Dashboard' }, { path: 'old', component: DashboardComponent, title: 'Dashboard' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
