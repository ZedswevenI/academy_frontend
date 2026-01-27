import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassRoutingModule } from './class.routing.module';
import { ClassComponent } from './class/class.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    ClassComponent
  ],
  imports: [
    CommonModule,
    ClassRoutingModule,
    UiElementsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: []
})

export class ClassModule {}