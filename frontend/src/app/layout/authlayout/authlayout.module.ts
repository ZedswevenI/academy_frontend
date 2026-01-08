import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes } from '@angular/router';

import { AuthlayoutComponent } from './authlayout/authlayout.component';
import { AuthlayoutRoutingModule } from './authlayout.routing.module';
import { LoginComponent } from '../../modules/auth/components/login/login.component';
import { RegisterComponent } from '../../modules/auth/components/register/register.component';

const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent }
];

@NgModule({
  declarations: [AuthlayoutComponent],
  imports: [CommonModule, AuthlayoutRoutingModule],
})
export class AuthlayoutModule {}
