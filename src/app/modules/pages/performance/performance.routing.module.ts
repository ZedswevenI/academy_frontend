import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PerformanceComponent } from './performance/performance.component';
import { StudentperformanceComponent } from './studentperformance/studentperformance.component';
import { BatchperformanceComponent } from './batchperformance/batchperformance.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: PerformanceComponent, title: 'Performance', canActivate: [PermissionGuard], data: { permission: 'performance:list' } },
  { path: 'student/:id', component: StudentperformanceComponent, title: 'Student Performance', canActivate: [PermissionGuard], data: { permission: 'performance:view' } },
  // Batch Report — out of scope for the current Student Performance migration pass, left ungated beyond the parent module gate.
  { path: 'batch-report', component: BatchperformanceComponent, title: 'Performance - Batch Report' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PerformanceRoutingModule {}
