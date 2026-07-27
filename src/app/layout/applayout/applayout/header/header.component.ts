import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { AuthService } from '../../../../service/auth/auth.service';
import {
  ALL_CENTERS_ID,
  CenterContextService,
  CenterOption,
} from '../../../../service/center/center-context.service';
import {
  NotificationItem,
  NotificationService,
} from '../../../../service/notification/notification.service';
declare var bootstrap: any;

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
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

  readonly ALL_CENTERS_ID = ALL_CENTERS_ID;
  uiCenterOptions: CenterOption[] = [];
  selectedCenter: CenterOption | null = null;
  editingCenter = false;
  pendingCenterId = '';
  centerPanelOpen = false;
  private centerSubs = new Subscription();

  notifPanelOpen = false;
  unreadCount = 0;
  notifications: NotificationItem[] = [];
  notifLoading = false;
  private notifSubs = new Subscription();

  constructor(
    private router: Router,
    private api: CommonapiService,
    private alert: AlertService,
    private authService: AuthService,
    private centerContext: CenterContextService,
    private notificationService: NotificationService,
  ) {
    this.username = localStorage.getItem('name');
    this.useremail = localStorage.getItem('email');
    this.userole = localStorage.getItem('userRole');
  }

  ngOnInit(): void {
    this.centerContext.init();
    this.centerSubs.add(
      this.centerContext.uiCenterOptions$.subscribe(
        (centers) => (this.uiCenterOptions = centers),
      ),
    );
    this.centerSubs.add(
      this.centerContext.selectedCenter$.subscribe(
        (center) => (this.selectedCenter = center),
      ),
    );

    this.notifSubs.add(
      this.notificationService.unreadCount$.subscribe(
        (count) => (this.unreadCount = count),
      ),
    );
    this.notifSubs.add(
      this.notificationService.notifications$.subscribe(
        (items) => (this.notifications = items),
      ),
    );
    this.notifSubs.add(
      this.notificationService.loading$.subscribe(
        (loading) => (this.notifLoading = loading),
      ),
    );
    this.notificationService.startPolling();
  }

  ngOnDestroy(): void {
    this.centerSubs.unsubscribe();
    this.notifSubs.unsubscribe();
    this.notificationService.stopPolling();
  }

  toggleNotifPanel(): void {
    this.notifPanelOpen = !this.notifPanelOpen;
    if (this.notifPanelOpen) {
      this.notificationService.fetchList({ page: 1, limit: 20 });
    }
  }

  closeNotifPanel(): void {
    this.notifPanelOpen = false;
  }

  onNotificationClick(item: NotificationItem): void {
    if (!item.isRead) this.notificationService.markRead(item.notificationId);
  }

  markAllNotificationsRead(): void {
    this.notificationService.markAllRead();
  }

  removeNotification(item: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.notificationService.remove(item.notificationId);
  }

  trackByNotificationId(_: number, item: NotificationItem): string {
    return item.notificationId;
  }

  get pendingCenter(): CenterOption | null {
    return (
      this.uiCenterOptions.find((c) => c.centerId === this.pendingCenterId) ||
      null
    );
  }

  startEditCenter(): void {
    this.pendingCenterId = this.selectedCenter?.centerId || '';
    this.editingCenter = true;
    this.centerPanelOpen = false;
  }

  toggleCenterPanel(): void {
    this.centerPanelOpen = !this.centerPanelOpen;
  }

  choosePendingCenter(centerId: string): void {
    this.pendingCenterId = centerId;
    this.centerPanelOpen = false;
  }

  cancelEditCenter(): void {
    this.editingCenter = false;
    this.centerPanelOpen = false;
  }

  submitCenterChange(): void {
    const changed =
      !!this.pendingCenterId &&
      this.pendingCenterId !== this.selectedCenter?.centerId;
    this.editingCenter = false;
    this.centerPanelOpen = false;
    if (!changed) return;
    this.centerContext.setSelectedCenter(this.pendingCenterId);
    window.location.reload();
  }

  logout() {
    sessionStorage.clear();
    this.centerContext.reset();
    this.notificationService.reset();
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
