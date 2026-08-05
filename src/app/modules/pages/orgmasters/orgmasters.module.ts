import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
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
import { UsersComponent } from './users/users.component';
import { UserFormComponent } from './users/user-form/user-form.component';
import { UserViewComponent } from './users/user-view/user-view.component';
import { UserAccessComponent } from './users/user-access/user-access.component';
import { HelpCenterComponent } from './helpcenter/help-center.component';


@NgModule({
  declarations: [InstituteComponent, CenterComponent, StaffComponent, ProgramComponent, DepartmentComponent, SubjectComponent, BankaccountsComponent, TopicComponent, SubtopicComponent, ExamcategoryComponent, ExamsubcategoryComponent, CenterviewComponent, SchoolexamsComponent, UsersComponent, UserFormComponent, UserViewComponent, UserAccessComponent, HelpCenterComponent],
  imports: [CommonModule, OrgmastersRoutingModule, FormsModule, ReactiveFormsModule, UiElementsModule, DragDropModule]
})
export class OrgmastersModule {}
