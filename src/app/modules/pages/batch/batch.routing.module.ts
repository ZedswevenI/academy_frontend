import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BatchComponent } from './batch/batch.component';
import { EditBatchComponent } from './edit-batch/edit-batch.component';
import { AddFacultyComponent } from './add-faculty/add-faculty.component';
import { AssignStudentComponent } from './assign-student/assign-student.component';
import { CloseBatchComponent } from './close-batch/close-batch.component';
import { ViewBatchComponent } from './view-batch/view-batch.component';
import { PermissionGuard } from '../../../shared/permission.guard';

// 'edit' / 'addFaculty' / 'assign' / 'close' are not linked to from anywhere
// in the app — BatchComponent and ViewBatchComponent both implement this
// functionality inline via modals instead of navigating here. Guarded anyway
// so a typed-in URL can't bypass the permission that gates the equivalent
// inline action.
const routes: Routes = [
    { path: '', component: BatchComponent, title: 'My Batch'},
    { path: 'edit', component: EditBatchComponent, title: 'My Batch', canActivate: [PermissionGuard], data: { permission: 'batch:edit' } },
    { path: 'addFaculty', component: AddFacultyComponent, title: 'My Batch', canActivate: [PermissionGuard], data: { permission: 'batch:assignFaculty' } },
    { path: 'assign', component: AssignStudentComponent, title: 'My Batch', canActivate: [PermissionGuard], data: { permission: 'batch:assignStudents' } },
    { path: 'close', component: CloseBatchComponent, title: 'My Batch', canActivate: [PermissionGuard], data: { permission: 'batch:close' } },
    { path: 'view/:batchId', component: ViewBatchComponent, title: 'My Batch', canActivate: [PermissionGuard], data: { permission: 'batch:view' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})

export class BatchRoutingModule {}
