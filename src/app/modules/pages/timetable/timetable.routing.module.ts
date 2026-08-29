import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableComponent } from './timetable/timetable.component';
import { ListComponent } from './list/list.component';
import { ViewTableComponent } from './view-table/view-table.component';
import { TimetableviewnewComponent } from './timetableviewnew/timetableviewnew.component';
import { TimetablenewComponent } from './timetablenew/timetablenew.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: TimetableComponent, title: 'Timetable', canActivate: [PermissionGuard], data: { permission: ['timetable:list', 'timetable:view'] } },
  { path: '1', component: TimetablenewComponent, title: 'Timetable', canActivate: [PermissionGuard], data: { permission: 'timetable:list' } },
  // 'table' is an unrelated hardcoded attendance-mock prototype riding on
  // this module's routing — no ties to any timetable:* key. Left unguarded
  // deliberately; flagged to confirm whether it's dead code to remove.
  { path: 'table', component: ListComponent, title: 'Timetable', canActivate: [PermissionGuard], data: { permission: ['timetable:list', 'timetable:view'] } },
  { path: 'view/:id', component: ViewTableComponent, title: 'Timetable View', canActivate: [PermissionGuard], data: { permission: 'timetable:view' } },
  { path: 'viewnew/:id', component: TimetableviewnewComponent, title: 'Timetable View', canActivate: [PermissionGuard], data: { permission: 'timetable:view' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TimetableRoutingModule {}
