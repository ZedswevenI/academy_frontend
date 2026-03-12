// import { Component } from '@angular/core';
// import { MENU_ASSIGNMENT, MENU_ITEMS, MenuItem } from '../../../../shared/menu';
// import { Input, Output, EventEmitter } from '@angular/core';
// import { Router } from '@angular/router';
// import { AuthService } from '../../../../service/auth/auth.service';

// @Component({
//   selector: 'app-sidebar',
//   standalone: false,
//   templateUrl: './sidebar.component.html',
//   styleUrl: './sidebar.component.scss'
// })
// export class SidebarComponent {
//   menuItems: MenuItem[] = MENU_ITEMS;

//   @Input() open = false;
//   @Output() close = new EventEmitter<void>();

//   constructor(private router: Router,private authService: AuthService) {
//     authService.assignmentRole() ? this.menuItems = MENU_ASSIGNMENT : MENU_ITEMS;
//   }

//   logout() {
//     this.router.navigate(['/auth/login']);
//   }

//   toggleMenu(menu: any) {
//     menu.expanded = !menu.expanded;
//   }
// }

// ============================================================
//  sidebar.component.ts  –  Role-filtered menu
//  Replaces existing sidebar.component.ts
// ============================================================

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../service/auth/auth.service';
import { MENU_ITEMS, MenuItem } from '../../../../shared/menu';
import { RoleLevel } from '../../../../shared/role.config';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  menuItems: MenuItem[] = [];

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const role = this.authService.getRole() as RoleLevel;
    this.menuItems = this.filterMenuByRole(MENU_ITEMS, role);
  }

  private filterMenuByRole(items: MenuItem[], role: RoleLevel): MenuItem[] {
    return items
      .filter(item => item.roles.includes(role))
      .map(item => ({
        ...item,
        children: item.children ? this.filterMenuByRole(item.children, role) : undefined
      }))
      .filter(item => !item.children || item.children.length > 0);
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMenu(menu: MenuItem): void {
    menu.expanded = !menu.expanded;
  }
}
