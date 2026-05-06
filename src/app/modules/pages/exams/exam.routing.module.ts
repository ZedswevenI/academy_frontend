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
import { ExamInstructionsComponent } from './instructions/instructions.component';
import { ExamPassageComponent } from './passage/passage.component';
import { ExamQuestionsComponent } from './questions/questions.component';
import { ResultBatchComponent } from './result-batch/result-batch.component';
import { ResultViewComponent } from './result-view/result-view.component';
import { AnswerImportComponent } from './answer-import/answer-import.component';
import { StudentResultComponent } from './student-result/student-result.component';
import { MarksImportComponent } from './marks-import/marks-import.component';

const routes: Routes = [
  { path: 'instructions', component: ExamInstructionsComponent, title: 'Exam-Instructions' },
  { path: 'passage', component: ExamPassageComponent, title: 'Exam-Passage' },
  { path: 'questions', component: ExamQuestionsComponent, title: 'Exam-Questions' },
  { path: 'exams', component: TestComponent, title: 'Exams' },
  { path: 'exams/create', component: TestCreateComponent, title: 'Exam-Create' },
  { path: 'exams/import', component: TestimportComponent, title: 'Exam-Import' },
  { path: 'exams/question-create', component: QuestionCreatorComponent, title: 'Exam-Question-Create' },
  { path: 'exams/question-view', component: QuestionViewComponent, title: 'Exam-Question-View' },
  { path: 'exams/question-rearrange', component: QuestionArrangementComponent, title: 'Exam-Question-rearrangeOrder' },
  { path: 'exams/question-import', component: QuestionImportComponent, title: 'Exam-Question-Import' },
  { path: 'exams/answer-import', component: AnswerImportComponent, title: 'Exam-Answer-Import' },
  { path: 'exams/view', component: TestViewComponent, title: 'Exam-View' },
  { path: 'exams/result-batch', component: ResultBatchComponent, title: 'Exam-Result-Batches' },
  { path: 'exams/result-view', component: ResultViewComponent, title: 'Exam-Result-View' },
  { path: 'exams/student-result', component: StudentResultComponent, title: 'Exam-Student-Result' },
  { path: 'exams/marks-import', component: MarksImportComponent, title: 'Exam-Marks-Import' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExamRoutingModule {}
