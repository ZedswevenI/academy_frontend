import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunicationRoutingModule } from './communication.routing.module';
import { CommunicationComponent } from './communication/communication.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WhatsappComponent } from './whatsapp/whatsapp.component';
import { MsgComponent } from './msg/msg.component';
import { MailComponent } from './mail/mail.component';
import { ComListComponent } from './com-list/com-list.component';

@NgModule({
    declarations: [
        CommunicationComponent,
        WhatsappComponent,
        MsgComponent, 
        MailComponent,
        ComListComponent
    ],
    imports: [
        CommonModule,
        CommunicationRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})
export class CommunicationModule { }