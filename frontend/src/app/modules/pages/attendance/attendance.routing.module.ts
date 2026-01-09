import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AttendanceComponent } from './attendance/attendance.component';
import { StudentListComponent } from './student-list/student-list.component';

const routes: Routes = [
    { path: '', component: AttendanceComponent, title: 'Student Attendance' },
    { path: 'table', component: StudentListComponent, title: 'Student Attendance'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AttendanceRoutingModule { }