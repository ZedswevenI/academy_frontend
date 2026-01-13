import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowledgeListComponent } from './knowledge-list/knowledge-list.component';
import { KnowledgeViewComponent } from './knowledge-view/knowledge-view.component';
import { KnowledgeCreateComponent } from './knowledge-create/knowledge-create.component';

const routes: Routes = [
    { path: '', component: KnowledgeListComponent, title: 'Knowledge Base'},
    { path: 'create', component: KnowledgeCreateComponent, title: 'Knowledge Base'},
    { path: 'view', component: KnowledgeViewComponent, title: 'Knowledge Base'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class KnowledgeRoutingModule { }