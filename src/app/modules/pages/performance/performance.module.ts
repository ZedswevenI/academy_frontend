import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceRoutingModule } from './performance.routing.module';

import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PerformanceListComponent } from './performance-list/performance-list.component';
import { PerformanceViewComponent } from './performance-view/performance-view.component';


@NgModule({
  declarations: [
    PerformanceListComponent,
    PerformanceViewComponent
  ],
  imports: [
    CommonModule, 
    PerformanceRoutingModule,
    UiElementsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: []
})
export class PerformanceModule {}