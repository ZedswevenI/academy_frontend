import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BatchComponent } from './batch/batch.component';
import { BatchRoutingModule } from './batch.routing.module';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    BatchComponent
  ],
  imports: [
    CommonModule,
    BatchRoutingModule,
    UiElementsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: []
})

export class BatchModule {}