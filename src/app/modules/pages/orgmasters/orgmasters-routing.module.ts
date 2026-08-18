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
import { UserFormComponent } from './users/user-form/user-form.component';
import { UserViewComponent } from './users/user-view/user-view.component';
import { UserAccessComponent } from './users/user-access/user-access.component';
import { HelpCenterComponent } from './helpcenter/help-center.component';
import { PermissionGuard } from '../../../shared/permission.guard';

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
    // Migrated off the shared org-master RoleGuard onto its own PermissionGuard
    // — requires 'orgSchoolExam:list' (org-master's other children stay
    // gated only by the parent RoleGuard for now).
    path: 'school/exams',
    component: SchoolexamsComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgSchoolExam:list' }
  },
  {
    path: 'users',
    component: UsersComponent
  },
  {
    path: 'users/create',
    component: UserFormComponent
  },
  {
    path: 'users/edit/:id',
    component: UserFormComponent
  },
  {
    // :userId is the app-level userId (POST /ims/user/view-by-userid),
    // NOT the Mongo _id used by edit/:id and access/:id below.
    path: 'users/view/:userId',
    component: UserViewComponent
  },
  {
    path: 'users/access/:id',
    component: UserAccessComponent
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
