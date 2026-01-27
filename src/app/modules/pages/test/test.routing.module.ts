import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestComponent } from './tests/test.component';
import { TestCreateComponent } from './test-create/test-create.component';
import { TestViewComponent } from './test-view/test-view.component';
import { QuestionCreatorComponent } from './question-create/question-creator.component';
import { QuestionImportComponent } from './question-import/question-import.component';

const routes: Routes = [
  { path: '', component: TestComponent, title: 'Test' },
  { path: 'create', component: TestCreateComponent, title: 'Test-Create' },
  { path: 'question-create', component: QuestionCreatorComponent, title: 'Question-Create' },
  { path: 'question-import', component: QuestionImportComponent, title: 'Question-Import' },
  { path: 'view', component: TestViewComponent, title: 'Test-View' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TestRoutingModule { }
