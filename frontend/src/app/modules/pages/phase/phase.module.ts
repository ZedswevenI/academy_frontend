import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseRoutingModule } from './phase.routing.module';

import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PhaseListComponent } from './phase-list/phase-list.component';

@NgModule({
  declarations: [
    PhaseListComponent
  ],
  imports: [
    CommonModule, 
    PhaseRoutingModule,
    UiElementsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: []
})
export class PhaseModule {}