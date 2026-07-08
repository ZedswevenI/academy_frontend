import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Output, EventEmitter } from '@angular/core';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { AuthService } from '../../../../service/auth/auth.service';
declare var bootstrap: any;

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  username: any = '';
  userole: any = '';
  useremail: any = '';
  @ViewChild('changePwdModal') changePwdModal!: ElementRef;
  private modalInstance: any;
  cpLoading = false;
  cpTouched = false;
  cpServerError = '';
  cpForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  cpShow = { current: false, newPwd: false, confirm: false };

  constructor(
    private router: Router,
    private api: CommonapiService,
    private alert: AlertService,
    private authService: AuthService,
  ) {
    this.username = localStorage.getItem('name');
    this.useremail = localStorage.getItem('email');
    this.userole = localStorage.getItem('userRole');
  }

  logout() {
    sessionStorage.clear();
    this.authService.logout();
  }

  @Output() menuToggle = new EventEmitter<void>();

  toggle() {
    this.menuToggle.emit();
  }

  openChangePassword(): void {
    this.cpForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.cpShow = { current: false, newPwd: false, confirm: false };
    this.cpTouched = false;
    this.cpServerError = '';
    document.body.appendChild(this.changePwdModal.nativeElement);
    this.modalInstance = new bootstrap.Modal(
      this.changePwdModal.nativeElement,
      {
        backdrop: true,
        keyboard: true,
      },
    );
    this.modalInstance.show();
  }

  closeChangePassword(): void {
    this.modalInstance?.hide();
    setTimeout(() => {
      if (this.changePwdModal?.nativeElement?.parentNode === document.body) {
        document.body.removeChild(this.changePwdModal.nativeElement);
      }
    }, 300);
  }

  submitChangePassword(): void {
    this.cpTouched = true;
    if (!this.cpForm.currentPassword) return;
    if (!this.cpForm.newPassword || this.cpForm.newPassword.length < 8) return;
    if (this.cpForm.newPassword !== this.cpForm.confirmPassword) return;
    this.cpLoading = true;
    this.cpServerError = '';
    this.api
      .fetchData(
        {
          currentPassword: this.cpForm.currentPassword,
          newPassword: this.cpForm.newPassword,
        },
        'ims/user',
        'change',
      )
      .subscribe({
        next: () => {
          this.cpLoading = false;
          this.closeChangePassword();
          this.alert.success('Password changed. Please login again.');
          setTimeout(() => {
            localStorage.clear();
            this.router.navigate(['/auth/login']);
          }, 1500);
        },
        error: (err: any) => {
          this.cpLoading = false;
          this.cpServerError =
            err?.error?.message || 'Failed to change password.';
        },
      });
  }
}
