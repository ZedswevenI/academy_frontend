// ============================================================
//  sidebar.component.ts  –  Permission-filtered menu
//  Replaces role-based filtering — see shared/menu.ts for the
//  MenuItem.permission convention.
// ============================================================

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../service/auth/auth.service';
import { PermissionService } from '../../../../shared/permission.service';
import { MENU_ITEMS, MenuItem } from '../../../../shared/menu';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  menuItems: MenuItem[] = [];
  private sub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private permissionService: PermissionService,
  ) {}

  ngOnInit(): void {
    // Re-filter whenever permissions change (in-memory permissions may still
    // be loading on first render after a page reload — see PermissionService).
    this.sub = this.permissionService.permissions$.subscribe(() => {
      this.menuItems = this.filterMenuByPermission(MENU_ITEMS);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // private filterMenuByPermission(items: MenuItem[]): MenuItem[] {
  //   return items
  //     .map((item): MenuItem | null => {
  //       if (item.children) {
  //         const children = this.filterMenuByPermission(item.children);
  //         return children.length ? { ...item, children } : null;
  //       }
  //       const keys = Array.isArray(item.permission)
  //         ? item.permission
  //         : item.permission
  //           ? [item.permission]
  //           : [];
  //       return keys.length && this.permissionService.hasAny(keys) ? item : null;
  //     })
  //     .filter((item): item is MenuItem => item !== null);
  // }

  private filterMenuByPermission(items: MenuItem[]): MenuItem[] {
  return items
    .map((item): MenuItem | null => {

      // Parent menu
      if (item.children) {
        const children = this.filterMenuByPermission(item.children);

        return children.length
          ? { ...item, children }
          : null;
      }

      // Leaf menu
      const keys = Array.isArray(item.permission)
        ? item.permission
        : item.permission
          ? [item.permission]
          : [];

      if (!keys.length) {
        return null;
      }

      const hasAccess = item.requireAll
        ? this.permissionService.hasAll(keys)
        : this.permissionService.hasAny(keys);

      return hasAccess ? item : null;
    })
    .filter((item): item is MenuItem => item !== null);
}

  logout(): void {
    this.authService.logout();
  }

  toggleMenu(menu: MenuItem): void {
    menu.expanded = !menu.expanded;
  }
}
