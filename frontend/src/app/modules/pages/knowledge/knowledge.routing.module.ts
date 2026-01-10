import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowledgeComponent } from './knowledge/knowledge.component';

const routes: Routes = [
    { path: '', component: KnowledgeComponent, title: 'Knowledge Base'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class KnowledgeRoutingModule { }