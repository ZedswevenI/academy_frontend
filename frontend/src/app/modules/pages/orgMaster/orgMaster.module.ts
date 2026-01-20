import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OrgMasterRoutingModule } from './orgMaster.routing.module';
import { OrgMasterComponent } from './org-master/org-master.component';

@NgModule({
    declarations: [
        OrgMasterComponent
    ],
    imports: [
        CommonModule,
        OrgMasterRoutingModule
    ],
    exports: []
})

export class OrgMasterModule { }