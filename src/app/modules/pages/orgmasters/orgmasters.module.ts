import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { BankaccountsComponent } from './bankaccounts/bankaccounts.component';
import { CenterComponent } from './center/center.component';
import { CenterviewComponent } from './centerview/centerview.component';
import { DepartmentComponent } from './department/department.component';
import { ExamcategoryComponent } from './examcategory/examcategory.component';
import { ExamsubcategoryComponent } from './examsubcategory/examsubcategory.component';
import { InstituteComponent } from './institute/institute.component';
import { OrgmastersRoutingModule } from './orgmasters-routing.module';
import { ProgramComponent } from './program/program.component';
import { StaffComponent } from './staff/staff.component';
import { SubjectComponent } from './subject/subject.component';
import { SubtopicComponent } from './subtopic/subtopic.component';
import { TopicComponent } from './topic/topic.component';
import { SchoolexamsComponent } from './schoolexams/schoolexams.component';


@NgModule({
  declarations: [InstituteComponent, CenterComponent, StaffComponent, ProgramComponent, DepartmentComponent, SubjectComponent, BankaccountsComponent, TopicComponent, SubtopicComponent, ExamcategoryComponent, ExamsubcategoryComponent, CenterviewComponent, SchoolexamsComponent],
  imports: [CommonModule, OrgmastersRoutingModule, FormsModule, ReactiveFormsModule, UiElementsModule]
})
export class OrgmastersModule {}
