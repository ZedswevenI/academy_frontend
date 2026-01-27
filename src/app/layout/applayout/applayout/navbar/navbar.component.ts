import { Component } from '@angular/core';
import { MENU_ITEMS, MenuItem } from '../../../../shared/menu';
import { NAV_ITEMS, NavItem  } from '../../../../shared/menu';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  // menuItems: MenuItem[] = MENU_ITEMS;
  navItems: NavItem[] = NAV_ITEMS;
}
