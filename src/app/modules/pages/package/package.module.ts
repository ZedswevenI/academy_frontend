import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PackageRoutingModule } from './package.routing.module';
import { PackageComponent } from './package/package.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PackCreateComponent } from './pack-create/pack-create.component';

@NgModule({
    declarations: [
        PackageComponent,
        PackCreateComponent
    ],
    imports: [
        CommonModule,
        PackageRoutingModule,
        UiElementsModule,
        ReactiveFormsModule,
        FormsModule
    ],
    exports: []
})

export class PackageModule { }