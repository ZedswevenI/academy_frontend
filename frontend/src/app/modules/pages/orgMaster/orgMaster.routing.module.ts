import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrgMasterComponent } from './org-master/org-master.component';
import { InstituteComponent } from './institute/institute.component';
import { CenterComponent } from './center/center.component';
import { ProgramComponent } from './program/program.component';
import { InstituteFormComponent } from './institute-form/institute-form.component';
import { AddCenterComponent } from './add-center/add-center.component';
import { DepartmentComponent } from './department/department.component';
import { CreateDepComponent } from './create-dep/create-dep.component';
import { CreateProComponent } from './create-pro/create-pro.component';
import { ViewProComponent } from './view-pro/view-pro.component';

const routes: Routes = [
    // { path: '', component: OrgMasterComponent, title: 'Org-Master' }
    { path: '', component: InstituteComponent, title: 'Org Master - INSTITUTE' },
    { path: 'institute', component: InstituteComponent, title: 'Org Master - INSTITUTE' },
    { path: 'institute/edit', component: InstituteFormComponent, title: 'Org Master - INSTITUTE' },

    { path: 'center', component: CenterComponent, title: 'Org Master - CENTER' },
    { path: 'center/add', component: AddCenterComponent, title: 'Org Master - CENTER' },

    { path: 'program', component: ProgramComponent, title: 'Org Master - PROGRAM' },
    { path: 'program/add', component: CreateProComponent, title: 'Org Master - PROGRAM' },
    { path: 'program/view', component: ViewProComponent, title: 'Org Master - PROGRAM' },
    
    { path: 'department', component: DepartmentComponent, title: 'Org Master - DEPARTMENT'},
    { path: 'department/add', component: CreateDepComponent, title: 'Org Master - DEPARTMENT'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class OrgMasterRoutingModule { }