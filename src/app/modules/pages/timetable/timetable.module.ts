import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableRoutingModule } from './timetable.routing.module';
import { TimetableComponent } from './timetable/timetable.component';
import { ListComponent } from './list/list.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ViewTableComponent } from './view-table/view-table.component';

@NgModule({
    declarations: [
        TimetableComponent,
        ListComponent,
        ViewTableComponent
    ],
    imports: [
        CommonModule,
        TimetableRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})
export class TimetableModule { }