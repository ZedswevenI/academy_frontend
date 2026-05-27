import { NgModule } from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';
import { ExamRoutingModule } from './exam.routing.module';
import { TestComponent } from './tests/test.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TestCreateComponent } from './test-create/test-create.component';
import { TestViewComponent } from './test-view/test-view.component';
import { QuestionCreatorComponent } from './question-create/question-creator.component';
import { QuestionImportComponent } from './question-import/question-import.component';
import { PassageSelectorComponent } from './passage-selector/passage-selector.component';
import { TestimportComponent } from './testimport/testimport.component';
import { QuestionViewComponent } from './question-view/question-view.component';
import { QuestionArrangementComponent } from './question-arrange/question-arange.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
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

@NgModule({
  declarations: [
    TestComponent,
    TestCreateComponent,
    TestViewComponent,
    QuestionCreatorComponent,
    QuestionImportComponent,
    PassageSelectorComponent,
    TestimportComponent,
    QuestionViewComponent,
    QuestionArrangementComponent,
    ExamInstructionsComponent,
    ExamPassageComponent,
    ExamQuestionsComponent,
    ResultBatchComponent,
    ResultViewComponent,
    AnswerImportComponent,
    StudentResultComponent,
    MarksImportComponent,
    ImportedExamsComponent,
    QuestionCreateNewComponent,
    PassageSelectorNewComponent
  ],
  imports: [CommonModule, ExamRoutingModule, UiElementsModule, ReactiveFormsModule, FormsModule, NgIf, NgFor, NgClass, DragDropModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  exports: []
})
export class ExamModule {}
