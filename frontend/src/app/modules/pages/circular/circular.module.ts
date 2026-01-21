import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CircularRoutingModule } from './circular.routing.module';
import { CircularComponent } from './circular/circular.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        CircularComponent
    ],
    imports: [
        CommonModule,
        CircularRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})

export class CircularModule { }