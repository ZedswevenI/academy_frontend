import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeedbackComponent } from './feedback/feedback.component';
import { TemplateComponent } from './template/template.component';
import { FeedbackcreateComponent } from './feedbackcreate/feedbackcreate.component';
import { FeedbackresultsComponent } from './feedbackresults/feedbackresults.component';

const routes: Routes = [
  { path: '', component: FeedbackComponent, title: 'Feedback' },
  { path: 'create', component: FeedbackcreateComponent, title: 'Feedback' },
  { path: 'edit/:id', component: FeedbackcreateComponent, title: 'Feedback' },
  { path: 'results/:id', component: FeedbackresultsComponent, title: 'Feedback' },
  { path: 'feedback/template', component: TemplateComponent, title: 'Feedback - Templates' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeedbackRoutingModule {}
