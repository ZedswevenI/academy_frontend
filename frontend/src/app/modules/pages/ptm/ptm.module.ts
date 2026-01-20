import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PtmRoutingModule } from './ptm.routing.module';
import { PtmComponent } from './ptm/ptm.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        PtmComponent
    ],
    imports: [
        CommonModule,
        PtmRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})

export class PtmModule { }