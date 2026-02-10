import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssignmentRoutingModule } from './assignment.routing.module';
import { AssignmentComponent } from './assignment/assignment.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AssCreateComponent } from './ass-create/ass-create.component';
import { AssViewComponent } from './ass-view/ass-view.component';

@NgModule({
  declarations: [AssignmentComponent, AssCreateComponent, AssViewComponent],
  imports: [CommonModule, AssignmentRoutingModule, UiElementsModule, ReactiveFormsModule, FormsModule],
  exports: []
})
export class AssignmentModule {}
