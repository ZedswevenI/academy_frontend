import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssignmentEnableComponent } from './assignment-enable/assignment-enable.component';

const routes: Routes = [
  {
    path: '',
    component: AssignmentEnableComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EnableassignmentRoutingModule {}
