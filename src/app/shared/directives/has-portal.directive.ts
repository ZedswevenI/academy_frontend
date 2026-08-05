// ============================================================
//  has-portal.directive.ts  –  Structural directive for
//  portal-scoped UI (relevant once CRM shares this app; a no-op
//  today since every route here is already ACADEMIC-only).
//
//  Usage:
//    <div *appHasPortal="'CRM'">...</div>
//
//  Re-evaluates on PermissionService.permissions$ emissions — portal
//  itself has no dedicated observable, but AuthService.setPortalAndAdmin()
//  is always called in the same PermissionService.init()/refresh() cycle
//  that updates permissions, so permissions$ is a reliable proxy signal
//  for "portal access may have just changed."
// ============================================================

import { Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionService, Portal } from '../permission.service';

@Directive({
  selector: '[appHasPortal]',
})
export class HasPortalDirective implements OnInit, OnDestroy {
  private required: Portal | null = null;
  private sub?: Subscription;
  private hasView = false;

  @Input()
  set appHasPortal(portal: Portal) {
    this.required = portal;
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService,
  ) {}

  ngOnInit(): void {
    this.sub = this.permissionService.permissions$.subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateView(): void {
    const allowed = !this.required || this.permissionService.hasPortal(this.required);
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
