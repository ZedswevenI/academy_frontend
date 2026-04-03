import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SchoolattendanceRoutingModule } from './schoolattendance-routing.module';
import { SchoolAttendanceComponent } from './school-attendance/school-attendance.component';
import { SchoolAttendanceMarkComponent } from './school-attendance-mark/school-attendance-mark.component';

import { PresentCountPipe, AbsentCountPipe, AbsentStudentsFilterPipe, NotMarkedCountPipe } from './attendance-count.pipe';

@NgModule({
  declarations: [SchoolAttendanceComponent, SchoolAttendanceMarkComponent, PresentCountPipe, AbsentCountPipe, AbsentStudentsFilterPipe, NotMarkedCountPipe],
  imports: [CommonModule, SchoolattendanceRoutingModule, UiElementsModule, FormsModule, ReactiveFormsModule]
})
export class SchoolattendanceModule {}
