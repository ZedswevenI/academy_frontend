// ============================================================
//  permission.guard.ts  –  Protects routes based on permission
//  keys (and optionally portal), replacing role.guard.ts's
//  RoleLevel-based ROUTE_ACCESS lookup.
//
//  Runs ALONGSIDE role.guard.ts during migration — nothing here
//  removes RoleGuard from pages.routing.module.ts. A route only
//  starts using this guard once it declares route data explicitly:
//
//    { path: 'batch', canActivate: [PermissionGuard],
//      data: { permission: 'batch:list' } }
//
//  `permission` may be a single key or an array (checked as
//  "any of" — matches the menu convention of gating on the
//  module's :list action).
// ============================================================

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../service/auth/auth.service';
import { PermissionService, Portal } from './permission.service';
import { AlertService } from '../service/alert/alert.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private permission: PermissionService,
    private alert: AlertService,
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean> | boolean {
    if (!this.auth.hasValidSession()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // canActivate runs before ANY component in the route tree is created —
    // including ApplayoutComponent, whose ngOnInit() is what normally
    // triggers PermissionService to fetch. Waiting on ensureLoaded() here
    // (instead of reading the in-memory array synchronously) is what makes
    // a fresh page reload work instead of racing an empty permissions[]
    // to a false "not authorised" redirect.
    return this.permission.ensureLoaded().pipe(
      map(() => {
        const required = route.data?.['permission'] as string | string[] | undefined;
        const requiredPortal = route.data?.['portal'] as Portal | undefined;

        if (requiredPortal && !this.permission.hasPortal(requiredPortal)) {
          this.alert.error('You are not authorised to access this portal.');
          this.router.navigate(['/auth/login']);
          return false;
        }

        // if (required) {
        //   const keys = Array.isArray(required) ? required : [required];
        //   if (!this.permission.hasAny(keys)) {
        //     this.alert.error("You don't have permission to access this page.");
        //     this.router.navigate(['/auth/login']);
        //     return false;
        //   }
        // }
        if (required) {
          const keys = Array.isArray(required) ? required : [required];
          const requireAll = route.data?.['requireAll'] === true;

          const hasAccess = requireAll
            ? this.permission.hasAll(keys)
            : this.permission.hasAny(keys);

          if (!hasAccess) {
            this.alert.error("You don't have permission to access this page.");
            this.router.navigate(['/auth/login']);
            return false;
          }
        }

        return true;
      }),
    );
  }
}
