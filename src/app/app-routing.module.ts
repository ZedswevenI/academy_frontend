import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('../app/layout/authlayout/authlayout.module').then(
        (m) => m.AuthlayoutModule
      ),
  },
  {
    path: 'app',
    loadChildren: () =>
      import('../app/layout/applayout/applayout.module').then(
        (m) => m.ApplayoutModule
      ),
  },
  {
    // Public, unauthenticated Help Center — deliberately a sibling of
    // 'auth'/'app' rather than nested under pages.routing.module.ts, so it
    // never picks up RoleGuard. Reachable at app.com/help with no login.
    path: 'help',
    loadChildren: () =>
      import('../app/modules/help-public/help-public.module').then(
        (m) => m.HelpPublicModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
