import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrgMasterComponent } from './org-master/org-master.component';

const routes: Routes = [
    { path: '', component: OrgMasterComponent, title: 'Org-Master' }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class OrgMasterRoutingModule { }