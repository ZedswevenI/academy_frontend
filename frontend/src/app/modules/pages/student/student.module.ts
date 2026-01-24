import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StudentComponent } from './student/student.component';
import { StudentRoutingModule } from './student.routing.module';
import { StudentViewComponent } from './student-view/student-view.component';
import { GridListComponent } from './grid-list/grid-list.component';
import { TableListComponent } from './table-list/table-list.component';
import { CreateStudentComponent } from './create-student/create-student.component';

@NgModule({
  declarations: [
    StudentComponent,
    StudentViewComponent,
    GridListComponent,
    TableListComponent,
    CreateStudentComponent
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