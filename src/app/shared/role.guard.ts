// ============================================================
//  role.guard.ts  –  Protects routes based on roleLevel
//  Place this file at: src/app/core/guards/role.guard.ts
// ============================================================

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../service/auth/auth.service'; // adjust path if needed
import { canAccessRoute, RoleLevel } from '../shared/role.config'; // adjust path if needed

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.auth.hasValidSession()) {
      this.router.navigate(['/auth/login']);
      return false;
    }
    const role = this.auth.getRole() as RoleLevel;
    console.log('role ', role);
    const segments = state.url.replace(/^\/app\//, '').split('/');
    console.log('segments ', segments);
    const topSegment = segments[0];
    console.log('topSegment ', topSegment);
    if (!canAccessRoute(role, topSegment)) {
      console.log('false condition called');
      this.router.navigate(['/auth/login']);
      return false;
    }
    return true;
  }
}
