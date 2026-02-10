import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnableassignmentRoutingModule } from './enableassignment-routing.module';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AssignmentEnableComponent } from './assignment-enable/assignment-enable.component';

@NgModule({
  declarations: [AssignmentEnableComponent],
  imports: [CommonModule, EnableassignmentRoutingModule, UiElementsModule, FormsModule, ReactiveFormsModule]
})
export class EnableassignmentModule {}
