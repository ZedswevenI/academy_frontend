import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PerformanceListComponent } from './performance-list/performance-list.component';
import { PerformanceViewComponent } from './performance-view/performance-view.component';

const routes: Routes = [
{ path: '', component: PerformanceListComponent, title: 'Student Performance'},
{ path: 'view', component: PerformanceViewComponent, title: 'Student Performance'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PerformanceRoutingModule { }
