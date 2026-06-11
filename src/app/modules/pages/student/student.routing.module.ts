import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StudentComponent } from './student/student.component';
import { StudentViewComponent } from './student-view/student-view.component';
import { GridListComponent } from './grid-list/grid-list.component';
import { TableListComponent } from './table-list/table-list.component';

const routes: Routes = [{ path: '', component: StudentComponent, title: 'Student' }, { path: 'view/:id', component: StudentViewComponent, title: 'Student' }, { path: 'grid', component: GridListComponent, title: 'Student' }, { path: 'list', component: TableListComponent, title: 'Student' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StudentRoutingModule {}
