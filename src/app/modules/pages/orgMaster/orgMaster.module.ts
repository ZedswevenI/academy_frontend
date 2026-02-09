import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OrgMasterRoutingModule } from './orgMaster.routing.module';
import { OrgMasterComponent } from './org-master/org-master.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InstituteComponent } from './institute/institute.component';
import { CenterComponent } from './center/center.component';
import { ProgramComponent } from './program/program.component';
import { InstituteFormComponent } from './institute-form/institute-form.component';
import { AddCenterComponent } from './add-center/add-center.component';
import { DepartmentComponent } from './department/department.component';
import { CreateDepComponent } from './create-dep/create-dep.component';
import { CreateProComponent } from './create-pro/create-pro.component';
import { ViewProComponent } from './view-pro/view-pro.component';
import { TopicComponent } from './topic/topic.component';
import { SubTopicComponent } from './sub-topic/sub-topic.component';
import { CategoryComponent } from './category/category.component';
import { SubCategoryComponent } from './sub-category/sub-category.component';

@NgModule({
    declarations: [
        OrgMasterComponent,
        InstituteComponent,
        CenterComponent,
        AddCenterComponent,
        ProgramComponent,
        CreateProComponent,
        InstituteFormComponent,
        DepartmentComponent,
        CreateDepComponent,
        ViewProComponent,
        TopicComponent,
        SubTopicComponent,
        CategoryComponent,
        SubCategoryComponent
    ],
    imports: [
        CommonModule,
        OrgMasterRoutingModule,
        UiElementsModule,
        FormsModule,
        ReactiveFormsModule
    ],
    exports: []
})

export class OrgMasterModule { }