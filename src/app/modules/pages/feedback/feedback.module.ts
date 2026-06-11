import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FeedbackRoutingModule } from './feedback.routing.module';
import { FeedbackComponent } from './feedback/feedback.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TemplateComponent } from './template/template.component';
import { FeedbackcreateComponent } from './feedbackcreate/feedbackcreate.component';
import { FeedbackresultsComponent } from './feedbackresults/feedbackresults.component';
import { FeedbackreportComponent } from './feedbackreport/feedbackreport.component';
import { ConsolidatedReportComponent } from './consolidated-report/consolidated-report.component';

@NgModule({
  declarations: [FeedbackComponent, TemplateComponent, FeedbackcreateComponent, FeedbackresultsComponent, FeedbackreportComponent, ConsolidatedReportComponent],
  imports: [CommonModule, FeedbackRoutingModule, UiElementsModule, ReactiveFormsModule, FormsModule],
  exports: []
})
export class FeedbackModule {}
