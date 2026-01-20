import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SupportRoutingModule } from './support.routing.module';
import { SupportComponent } from './support/support.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NewTicketComponent } from './new-ticket/new-ticket.component';
import { ExistingTicketComponent } from './existing-ticket/existing-ticket.component';

@NgModule({
    declarations: [
        SupportComponent,
        NewTicketComponent,
        ExistingTicketComponent
    ],
    imports: [
        CommonModule,
        SupportRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})

export class SupportModule { }