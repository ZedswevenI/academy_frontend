// ============================================================
//  has-role.directive.ts  –  Structural directive for UI hiding
//  Place at: src/app/shared/directives/has-role.directive.ts
//
//  Usage:
//    <div *appHasRole="['L1','L3']">Only L1 and L3 see this</div>
//    <button *appHasRole="['L1']">Download</button>
// ============================================================

import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../service/auth/auth.service'; // adjust path
import { RoleLevel } from '../role.config'; // adjust path

@Directive({
  selector: '[appHasRole]'
})
export class HasRoleDirective implements OnInit {
  private allowedRoles: RoleLevel[] = [];

  @Input()
  set appHasRole(roles: RoleLevel[]) {
    this.allowedRoles = roles;
  }

  constructor(private templateRef: TemplateRef<any>, private viewContainer: ViewContainerRef, private authService: AuthService) {}

  ngOnInit(): void {
    const userRole = this.authService.getRole() as RoleLevel;
    if (this.allowedRoles.includes(userRole)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
