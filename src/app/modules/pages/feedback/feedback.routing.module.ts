import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeedbackComponent } from './feedback/feedback.component';
import { TemplateComponent } from './template/template.component';
import { FeedbackcreateComponent } from './feedbackcreate/feedbackcreate.component';
import { FeedbackresultsComponent } from './feedbackresults/feedbackresults.component';
import { FeedbackreportComponent } from './feedbackreport/feedbackreport.component';
import { ConsolidatedReportComponent } from './consolidated-report/consolidated-report.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: FeedbackComponent, title: 'Feedback', canActivate: [PermissionGuard], data: { permission: 'feedback:list' } },
  { path: 'create', component: FeedbackcreateComponent, title: 'Feedback', canActivate: [PermissionGuard], data: { permission: 'feedback:create' } },
  { path: 'edit/:id', component: FeedbackcreateComponent, title: 'Feedback', canActivate: [PermissionGuard], data: { permission: 'feedback:edit' } },
  { path: 'results/:id', component: FeedbackresultsComponent, title: 'Feedback', canActivate: [PermissionGuard], data: { permission: 'feedback:viewResults' } },
  { path: 'report/:id', component: FeedbackreportComponent, title: 'Feedback - Report', canActivate: [PermissionGuard], data: { permission: 'feedback:consolidatedReport' } },
  { path: 'consolidated-report', component: ConsolidatedReportComponent, title: 'Feedback - Report', canActivate: [PermissionGuard], data: { permission: 'feedback:consolidatedReport' } },
  // Templates use a DIFFERENT key prefix (feedbackTemplate:*), not feedback:*.
  { path: 'feedback/template', component: TemplateComponent, title: 'Feedback - Templates', canActivate: [PermissionGuard], data: { permission: 'feedbackTemplate:list' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeedbackRoutingModule {}
