import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestComponent } from './tests/test.component';
import { TestCreateComponent } from './test-create/test-create.component';
import { TestViewComponent } from './test-view/test-view.component';
import { QuestionCreatorComponent } from './question-create/question-creator.component';
import { QuestionImportComponent } from './question-import/question-import.component';
import { TestimportComponent } from './testimport/testimport.component';
import { QuestionViewComponent } from './question-view/question-view.component';
import { QuestionArrangementComponent } from './question-arrange/question-arange.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: '', component: TestComponent, title: 'Assignments', canActivate: [PermissionGuard], data: { permission: 'test:list' } },
  { path: 'create', component: TestCreateComponent, title: 'Assignment-Create', canActivate: [PermissionGuard], data: { permission: ['test:create', 'test:edit'] } },
  { path: 'import', component: TestimportComponent, title: 'Assignment-Import', canActivate: [PermissionGuard], data: { permission: 'test:create' } },
  { path: 'question-create', component: QuestionCreatorComponent, title: 'Assignment-Question-Create', canActivate: [PermissionGuard], data: { permission: 'test:addQuestion' } },
  { path: 'question-view', component: QuestionViewComponent, title: 'Assignment-Question-View', canActivate: [PermissionGuard], data: { permission: 'test:view' } },
  { path: 'question-rearrange', component: QuestionArrangementComponent, title: 'Assignment-Question-rearrangeOrder', canActivate: [PermissionGuard], data: { permission: 'test:rearrangeQuestions' } },
  { path: 'question-import', component: QuestionImportComponent, title: 'Assignment-Question-Import', canActivate: [PermissionGuard], data: { permission: 'test:importQuestions' } },
  { path: 'view', component: TestViewComponent, title: 'Assignment-View', canActivate: [PermissionGuard], data: { permission: 'test:view' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TestRoutingModule {}
