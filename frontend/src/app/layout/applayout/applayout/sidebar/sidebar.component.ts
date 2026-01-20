import { Component } from '@angular/core';
import { MENU_ITEMS, MenuItem } from '../../../../shared/menu';
import { Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  menuItems: MenuItem[] = MENU_ITEMS;

  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  constructor(private router: Router){}

  logout(){
    this.router.navigate(['/auth/login']);
  }
}
