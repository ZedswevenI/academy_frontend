import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceRoutingModule } from './performance.routing.module';

import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PerformanceComponent } from './performance/performance.component';
import { StudentperformanceComponent } from './studentperformance/studentperformance.component';
import { BatchperformanceComponent } from './batchperformance/batchperformance.component';

@NgModule({
  declarations: [PerformanceComponent, StudentperformanceComponent, BatchperformanceComponent],
  imports: [CommonModule, PerformanceRoutingModule, UiElementsModule, ReactiveFormsModule, FormsModule],
  exports: []
})
export class PerformanceModule {}
