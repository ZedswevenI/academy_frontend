import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PerformanceComponent } from './performance/performance.component';
import { StudentperformanceComponent } from './studentperformance/studentperformance.component';
import { BatchperformanceComponent } from './batchperformance/batchperformance.component';

const routes: Routes = [{ path: '', component: PerformanceComponent, title: 'Performance' }, { path: 'student/:id', component: StudentperformanceComponent, title: 'Student Performance' }, { path: 'batch-report', component: BatchperformanceComponent, title: 'Performance - Batch Report' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PerformanceRoutingModule {}
