import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CircularRoutingModule } from './circular.routing.module';
import { CircularComponent } from './circular/circular.component';

@NgModule({
    declarations: [
        CircularComponent
    ],
    imports: [
        CommonModule,
        CircularRoutingModule
    ],
    exports: []
})

export class CircularModule { }