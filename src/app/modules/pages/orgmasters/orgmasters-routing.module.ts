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
import { PermissionReferenceComponent } from './permission-reference/permission-reference.component';
import { PermissionGuard } from '../../../shared/permission.guard';

const routes: Routes = [
  {
    path: 'institute',
    component: InstituteComponent
  },
  {
    path: 'center',
    component: CenterComponent,
    canActivate: [PermissionGuard],
    // data: { 
    //   permission: 'orgCenter:list'
    // }
    data: {
      permission: ['orgCenter:list', 'orgCenter:view'],
      requireAll: true
    }
  },
  {
    path: 'center/view/:id',
    component: CenterviewComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgCenter:view' }
  },
  {
    path: 'staff',
    component: StaffComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgStaff:list', 'orgStaff:view'],
      requireAll: true
    }
  },
  {
    path: 'program',
    component: ProgramComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgProgram:list', 'orgProgram:view'],
      requireAll: true
    },

  },
  {
    path: 'department',
    component: DepartmentComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgDept:list', 'orgDept:list'],
      requireAll: true
    }
  },
  {
    path: 'subject',
    component: SubjectComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgSubject:list', 'orgSubject:create'],
      requireAll: true
    }
  },
  {
    path: 'bankaccounts',
    component: BankaccountsComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgBankAccount:list' }
  },
  {
    path: 'category',
    component: ExamcategoryComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgExamCategory:list', 'orgExamCategory:create'],
      requireAll: true
    },
  },
  {
    // Every action on this screen (list/create/edit/delete/import) is bundled
    // under the one orgExamCategory:addSubCategories key — no separate list key exists.
    path: 'sub-category',
    component: ExamsubcategoryComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgExamCategory:addSubCategories', 'orgExamCategory:createSubCategories'],
      requireAll: true
    }
  },
  {
    path: 'topics',
    component: TopicComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgTopic:list', 'orgTopic:create'],
      requireAll: true
    }
  },
  {
    path: 'sub-topic',
    component: SubtopicComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgSubTopic:list', 'orgSubTopic:create'],
      requireAll: true
    }
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
    component: UsersComponent,
    canActivate: [PermissionGuard],
    data: {
      permission: ['orgUser:list', 'orgUser:view'],
      requireAll: true
    }
  },
  {
    path: 'users/create',
    component: UserFormComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgUser:create' }
  },
  {
    path: 'users/edit/:id',
    component: UserFormComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgUser:edit' }
  },
  {
    // :userId is the app-level userId (POST /ims/user/view-by-userid),
    // NOT the Mongo _id used by edit/:id and access/:id below.
    path: 'users/view/:userId',
    component: UserViewComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgUser:view' }
  },
  {
    path: 'users/access/:id',
    component: UserAccessComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgUser:assignAccess' }
  },
  {
    path: 'help-center',
    component: HelpCenterComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgHelpCenter:list' }
  },
  {
    // Admin-only cross-reference of the full permission catalog — not tied
    // to a single permission key, gated instead by AuthService.getIsAdmin()
    // inside the component (same convention as users/access/:id).
    path: 'permissions-reference',
    component: PermissionReferenceComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'orgUser:assignAccess' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrgmastersRoutingModule { }
