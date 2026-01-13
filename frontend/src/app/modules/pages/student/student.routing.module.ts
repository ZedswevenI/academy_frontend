import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StudentComponent } from './student/student.component';
import { StudentViewComponent } from './student-view/student-view.component';

const routes: Routes = [
    { path: '', component: StudentComponent, title: 'My Student'},
    { path: 'view', component: StudentViewComponent, title: 'My Student'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})

export class StudentRoutingModule {}
