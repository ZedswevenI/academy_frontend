import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeRoutingModule } from './knowledge.routing.module';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { KnowledgeListComponent } from './knowledge-list/knowledge-list.component';
import { KnowledgeCreateComponent } from './knowledge-create/knowledge-create.component';
import { KnowledgeViewComponent } from './knowledge-view/knowledge-view.component';

@NgModule({
    declarations: [
        KnowledgeListComponent,
        KnowledgeCreateComponent,
        KnowledgeViewComponent
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