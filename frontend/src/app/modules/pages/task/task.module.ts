import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskRoutingModule } from './task.routing.module';
import { TaskComponent } from './task/task.component';


@NgModule({
    declarations: [
        TaskComponent
    ],
    imports: [
        CommonModule,
        TaskRoutingModule
    ],
    exports: []
})
export class TaskModule { }