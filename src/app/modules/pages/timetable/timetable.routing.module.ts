import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableComponent } from './timetable/timetable.component';
import { ListComponent } from './list/list.component';
import { ViewTableComponent } from './view-table/view-table.component';

const routes: Routes = [{ path: '', component: TimetableComponent, title: 'Timetable' }, { path: 'table', component: ListComponent, title: 'Timetable' }, { path: 'view/:id', component: ViewTableComponent, title: 'Timetable View' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TimetableRoutingModule {}
