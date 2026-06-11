import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportRoutingModule } from './report.routing.module';
import { ReportComponent } from './report/report.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReportsnewComponent } from './reportsnew/reportsnew.component';

@NgModule({
  declarations: [ReportComponent, ReportsnewComponent],
  imports: [CommonModule, ReportRoutingModule, UiElementsModule, ReactiveFormsModule, FormsModule],
  exports: []
})
export class ReportModule {}
