import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  username: any = '';
  userole: any = '';
  useremail: any = '';

  constructor(private router: Router) {
    this.username = localStorage.getItem('name');
    this.useremail = localStorage.getItem('email');
    this.userole = localStorage.getItem('userRole');
  }

  logout() {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/auth/login']);
  }

  @Output() menuToggle = new EventEmitter<void>();

  toggle() {
    this.menuToggle.emit();
  }
}
