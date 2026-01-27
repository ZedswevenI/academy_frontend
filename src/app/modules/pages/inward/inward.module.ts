import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InwardRoutingModule } from './inward.routing.module';

import { InwardComponent } from './inward/inward.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiElementsModule } from "../../ui-elements/ui-elements.module";

@NgModule({
  declarations: [
    InwardComponent
  ],
  imports: [
    CommonModule,
    InwardRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    UiElementsModule
],
})
export class InwardModule {}