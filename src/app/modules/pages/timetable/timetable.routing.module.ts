import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableComponent } from './timetable/timetable.component';
import { ListComponent } from './list/list.component';
import { ViewTableComponent } from './view-table/view-table.component';

const routes: Routes = [
  { path: '', component: TimetableComponent, title: 'Student Attendance' },
  { path: 'table', component: ListComponent, title: 'Student Attendance' },
  { path: 'view', component: ViewTableComponent, title: 'Student Attendance' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TimetableRoutingModule { }
