import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeRoutingModule } from './knowledge.routing.module';
import { KnowledgeComponent } from './knowledge/knowledge.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        KnowledgeComponent
    ],
    imports: [
        CommonModule,
        KnowledgeRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})
export class KnowledgeModule { }