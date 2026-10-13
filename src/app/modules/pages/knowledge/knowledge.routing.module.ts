import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowledgeListComponent } from './knowledge-list/knowledge-list.component';
import { KnowledgeViewComponent } from './knowledge-view/knowledge-view.component';
import { KnowledgeCreateComponent } from './knowledge-create/knowledge-create.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
    { path: '', component: KnowledgeListComponent, title: 'Library', canActivate: [PermissionGuard], data: { permission: ['knowledge:list', 'knowledge:view'] } },
    // Create AND Edit share this route/component (isEditMode derived from
    // router state, not the URL) — accept either key.
    { path: 'create', component: KnowledgeCreateComponent, title: 'Library', canActivate: [PermissionGuard], data: { permission: ['knowledge:create', 'knowledge:edit'] } },
    { path: 'view', component: KnowledgeViewComponent, title: 'Library', canActivate: [PermissionGuard], data: { permission: 'knowledge:view' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class KnowledgeRoutingModule { }
