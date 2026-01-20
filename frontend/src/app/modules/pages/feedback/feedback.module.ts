import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FeedbackRoutingModule } from './feedback.routing.module';
import { FeedbackComponent } from './feedback/feedback.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        FeedbackComponent
    ],
    imports: [
        CommonModule,
        FeedbackRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})

export class FeedbackModule { }