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
import { ImportedExamsComponent } from './imported-exams/imported-exams.component';
import { QuestionCreateNewComponent } from './question-create-new/question-create-new.component';
import { PassageSelectorNewComponent } from './passage-selector-new/passage-selector-new.component';
import { QuestionImportNewComponent } from './question-import-new/question-import-new.component';
import { OfflineMarksComponent } from './offline-marks/offline-marks.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  { path: 'instructions', component: ExamInstructionsComponent, title: 'Exam-Instructions', canActivate: [PermissionGuard], data: { permission: 'examContent:list' } },
  { path: 'passage', component: ExamPassageComponent, title: 'Exam-Passage', canActivate: [PermissionGuard], data: { permission: 'examContent:list' } },
  { path: 'questions', component: ExamQuestionsComponent, title: 'Exam-Questions', canActivate: [PermissionGuard], data: { permission: 'exam:view' } },
  { path: 'exams', component: TestComponent, title: 'Exams', canActivate: [PermissionGuard], data: { permission: 'exam:list' } },
  { path: 'exams/create', component: TestCreateComponent, title: 'Exam-Create', canActivate: [PermissionGuard], data: { permission: ['exam:create', 'exam:edit', 'exam:duplicate'] } },
  // Orphaned screen — no button in the app links here and no catalog key covers
  // it; left ungated beyond the parent module gate per explicit instruction.
  { path: 'exams/import', component: TestimportComponent, title: 'Exam-Import' },
  { path: 'exams/question-create', component: QuestionCreateNewComponent, title: 'Exam-Question-Create', canActivate: [PermissionGuard], data: { permission: 'exam:addQuestion' } },
  { path: 'exams/question-view', component: QuestionViewComponent, title: 'Exam-Question-View', canActivate: [PermissionGuard], data: { permission: 'exam:view' } },
  { path: 'exams/question-rearrange', component: QuestionArrangementComponent, title: 'Exam-Question-rearrangeOrder', canActivate: [PermissionGuard], data: { permission: 'exam:rearrangeQuestions' } },
  { path: 'exams/question-import', component: QuestionImportNewComponent, title: 'Exam-Question-Import', canActivate: [PermissionGuard], data: { permission: 'exam:importQuestions' } },
  { path: 'exams/answer-import', component: AnswerImportComponent, title: 'Exam-Answer-Import', canActivate: [PermissionGuard], data: { permission: 'exam:importAnswers' } },
  { path: 'exams/view', component: TestViewComponent, title: 'Exam-View', canActivate: [PermissionGuard], data: { permission: 'exam:view' } },
  { path: 'exams/result-batch', component: ResultBatchComponent, title: 'Exam-Result-Batches', canActivate: [PermissionGuard], data: { permission: 'exam:view' } },
  { path: 'exams/result-view', component: ResultViewComponent, title: 'Exam-Result-View', canActivate: [PermissionGuard], data: { permission: 'exam:view' } },
  { path: 'exams/student-result', component: StudentResultComponent, title: 'Exam-Student-Result', canActivate: [PermissionGuard], data: { permission: 'exam:view' } },
  { path: 'exams/marks-import', component: MarksImportComponent, title: 'Exam-Marks-Import', canActivate: [PermissionGuard], data: { permission: 'exam:marksImport' } },
  { path: 'exams/offline-marks/:examId', component: OfflineMarksComponent, title: 'Exam-Offline-Marks', canActivate: [PermissionGuard], data: { permission: 'exam:offlineMarksEntry' } },
  { path: 'imported-exams', component: ImportedExamsComponent, title: 'Imported-Exams', canActivate: [PermissionGuard], data: { permission: 'examImport:list' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExamRoutingModule {}
