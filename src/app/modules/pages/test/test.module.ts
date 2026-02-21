import { NgModule } from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';
import { TestRoutingModule } from './test.routing.module';
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

@NgModule({
  declarations: [TestComponent, TestCreateComponent, TestViewComponent, QuestionCreatorComponent, QuestionImportComponent, PassageSelectorComponent, TestimportComponent,QuestionViewComponent,QuestionArrangementComponent],
  imports: [CommonModule, TestRoutingModule, UiElementsModule, ReactiveFormsModule, FormsModule, NgIf, NgFor,NgClass,DragDropModule],
  exports: []
})
export class TestModule {}
