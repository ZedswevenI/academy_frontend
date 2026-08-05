import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InstituteComponent } from './institute/institute.component';
import { CenterComponent } from './center/center.component';
import { StaffComponent } from './staff/staff.component';
import { ProgramComponent } from './program/program.component';
import { DepartmentComponent } from './department/department.component';
import { SubjectComponent } from './subject/subject.component';
import { BankaccountsComponent } from './bankaccounts/bankaccounts.component';
import { TopicComponent } from './topic/topic.component';
import { SubtopicComponent } from './subtopic/subtopic.component';
import { ExamcategoryComponent } from './examcategory/examcategory.component';
import { ExamsubcategoryComponent } from './examsubcategory/examsubcategory.component';
import { CenterviewComponent } from './centerview/centerview.component';
import { SchoolexamsComponent } from './schoolexams/schoolexams.component';
import { UsersComponent } from './users/users.component';
import { HelpCenterComponent } from './helpcenter/help-center.component';

const routes: Routes = [
  {
    path: 'institute',
    component: InstituteComponent
  },
  {
    path: 'center',
    component: CenterComponent
  },
  {
    path: 'center/view/:id',
    component: CenterviewComponent
  },
  {
    path: 'staff',
    component: StaffComponent
  },
  {
    path: 'program',
    component: ProgramComponent
  },
  {
    path: 'department',
    component: DepartmentComponent
  },
  {
    path: 'subject',
    component: SubjectComponent
  },
  {
    path: 'bankaccounts',
    component: BankaccountsComponent
  },
  {
    path: 'category',
    component: ExamcategoryComponent
  },
  {
    path: 'sub-category',
    component: ExamsubcategoryComponent
  },
  {
    path: 'topics',
    component: TopicComponent
  },
  {
    path: 'sub-topic',
    component: SubtopicComponent
  },
  {
    path: 'school/exams',
    component: SchoolexamsComponent
  },
  {
    path: 'users',
    component: UsersComponent
  },
  {
    path: 'help-center',
    component: HelpCenterComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrgmastersRoutingModule {}
