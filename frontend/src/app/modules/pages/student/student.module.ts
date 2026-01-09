import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StudentComponent } from './student/student.component';
import { StudentRoutingModule } from './student.routing.module';

@NgModule({
  declarations: [
    StudentComponent
  ],
  imports: [
    CommonModule,
    StudentRoutingModule,
    UiElementsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: []
})

export class StudentModule {}