import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableRoutingModule } from './timetable.routing.module';
import { TimetableComponent } from './timetable/timetable.component';

@NgModule({
    declarations: [
        TimetableComponent
    ],
    imports: [
        CommonModule,
        TimetableRoutingModule
    ],
    exports: []
})
export class TimetableModule { }