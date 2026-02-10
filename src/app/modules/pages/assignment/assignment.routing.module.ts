import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssignmentComponent } from './assignment/assignment.component';
import { AssCreateComponent } from './ass-create/ass-create.component';
import { AssViewComponent } from './ass-view/ass-view.component';

const routes: Routes = [{ path: '', component: AssignmentComponent, title: 'Assignment' }, { path: 'create', component: AssCreateComponent, title: 'Assignment-Create' }, { path: 'view', component: AssViewComponent, title: 'Assignment-View' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AssignmentRoutingModule {}
