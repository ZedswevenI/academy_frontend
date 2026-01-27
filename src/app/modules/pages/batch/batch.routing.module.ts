import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BatchComponent } from './batch/batch.component';
import { EditBatchComponent } from './edit-batch/edit-batch.component';
import { AddFacultyComponent } from './add-faculty/add-faculty.component';
import { AssignStudentComponent } from './assign-student/assign-student.component';
import { CloseBatchComponent } from './close-batch/close-batch.component';
import { ViewBatchComponent } from './view-batch/view-batch.component';

const routes: Routes = [
    { path: '', component: BatchComponent, title: 'My Batch'},
    { path: 'edit', component: EditBatchComponent, title: 'My Batch'},
    { path: 'addFaculty', component: AddFacultyComponent, title: 'My Batch'},
    { path: 'assign', component: AssignStudentComponent, title: 'My Batch'},
    { path: 'close', component: CloseBatchComponent, title: 'My Batch'},
    { path: 'view', component: ViewBatchComponent, title: 'My Batch'},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})

export class BatchRoutingModule {}
