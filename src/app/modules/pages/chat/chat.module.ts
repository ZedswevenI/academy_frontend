import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChatComponent } from './chat/chat.component';
import { ChatRoutingModule } from './chat.routing.module';

@NgModule({
    declarations: [
        ChatComponent
    ],
    imports: [
        CommonModule,
        ChatRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})
export class ChatModule { }