import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TeacherRoutingModule } from './teacher.routing.module';
import { TeacherComponent } from './teacher/teacher.component';

@NgModule({
    declarations: [
        TeacherComponent
    ],
    imports: [
        CommonModule,
        TeacherRoutingModule
    ],
    exports: []
})

export class TeacherModule { }