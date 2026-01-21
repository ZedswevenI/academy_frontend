import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TeacherRoutingModule } from './teacher.routing.module';
import { TeacherComponent } from './teacher/teacher.component';
import { CreateTeacherComponent } from './create-teacher/create-teacher.component';
import { ViewTeacherComponent } from './view-teacher/view-teacher.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        TeacherComponent,
        CreateTeacherComponent,
        ViewTeacherComponent
    ],
    imports: [
        CommonModule,
        TeacherRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})

export class TeacherModule { }