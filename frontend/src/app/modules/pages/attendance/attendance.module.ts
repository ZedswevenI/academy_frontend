import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceRoutingModule } from './attendance.routing.module';
import { AttendanceComponent } from './attendance/attendance.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StudentListComponent } from './student-list/student-list.component';

@NgModule({
    declarations: [
        AttendanceComponent,
        StudentListComponent
    ],
    imports: [
        CommonModule,
        AttendanceRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})
export class AttendanceModule { }