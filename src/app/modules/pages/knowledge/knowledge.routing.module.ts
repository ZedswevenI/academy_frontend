import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowledgeListComponent } from './knowledge-list/knowledge-list.component';
import { KnowledgeViewComponent } from './knowledge-view/knowledge-view.component';
import { KnowledgeCreateComponent } from './knowledge-create/knowledge-create.component';

const routes: Routes = [
    { path: '', component: KnowledgeListComponent, title: 'Library'},
    { path: 'create', component: KnowledgeCreateComponent, title: 'Library'},
    { path: 'view', component: KnowledgeViewComponent, title: 'Library'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class KnowledgeRoutingModule { }