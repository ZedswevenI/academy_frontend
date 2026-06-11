import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BatchComponent } from './batch/batch.component';
import { BatchRoutingModule } from './batch.routing.module';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddFacultyComponent } from './add-faculty/add-faculty.component';
import { AssignStudentComponent } from './assign-student/assign-student.component';
import { CloseBatchComponent } from './close-batch/close-batch.component';
import { EditBatchComponent } from './edit-batch/edit-batch.component';
import { ViewBatchComponent } from './view-batch/view-batch.component';

@NgModule({
  declarations: [
    BatchComponent,
    AddFacultyComponent,
    AssignStudentComponent,
    CloseBatchComponent,
    EditBatchComponent,
    ViewBatchComponent
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