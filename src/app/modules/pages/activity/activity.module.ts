import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ActivityRoutingModule } from './activity.routing.module';
import { ActivityComponent } from './activity/activity.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { createActivityComponent } from './create-activity/create-activity.component';

@NgModule({
    declarations: [
        ActivityComponent,
        createActivityComponent
    ],
    imports: [
        CommonModule,
        ActivityRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})

export class ActivityModule { }