import { Component } from '@angular/core';
import { MENU_ITEMS, MenuItem } from '../../../../shared/menu';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  menuItems: MenuItem[] = MENU_ITEMS;
}
