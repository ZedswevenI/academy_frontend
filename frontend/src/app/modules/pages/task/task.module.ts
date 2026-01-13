import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskRoutingModule } from './task.routing.module';
import { TaskComponent } from './task/task.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TaskViewComponent } from './task-view/task-view.component';


@NgModule({
    declarations: [
        TaskComponent,
        TaskViewComponent
    ],
    imports: [
        CommonModule,
        TaskRoutingModule,
        UiElementsModule,
        FormsModule,
        ReactiveFormsModule
    ],
    exports: []
})
export class TaskModule { }