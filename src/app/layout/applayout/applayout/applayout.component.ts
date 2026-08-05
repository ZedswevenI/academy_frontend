import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  CenterContextService,
  CenterOption,
} from '../../../service/center/center-context.service';
import { AuthService } from '../../../service/auth/auth.service';
import { PermissionService } from '../../../shared/permission.service';

@Component({
  selector: 'app-applayout',
  standalone: false,
  templateUrl: './applayout.component.html',
  styleUrl: './applayout.component.scss'
})
export class ApplayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;

  uiCenterOptions: CenterOption[] = [];
  needsCenterSelection = false;
  noCentersAvailable = false;
  pickedCenterId = '';
  private centerSubs = new Subscription();

  constructor(
    private centerContext: CenterContextService,
    private authService: AuthService,
    private permissionService: PermissionService,
  ) {}

  ngOnInit(): void {
    this.centerContext.init();
    this.permissionService.init();
    this.centerSubs.add(
      this.centerContext.uiCenterOptions$.subscribe(
        (centers) => (this.uiCenterOptions = centers),
      ),
    );
    this.centerSubs.add(
      this.centerContext.needsSelection$.subscribe((needs) => {
        this.needsCenterSelection = needs;
        if (needs) this.pickedCenterId = '';
      }),
    );
    this.centerSubs.add(
      this.centerContext.noCentersAvailable$.subscribe(
        (v) => (this.noCentersAvailable = v),
      ),
    );
  }

  ngOnDestroy(): void {
    this.centerSubs.unsubscribe();
  }

  confirmCenterSelection(): void {
    if (!this.pickedCenterId) return;
    this.centerContext.setSelectedCenter(this.pickedCenterId);
    window.location.reload();
  }

  logoutBlocked(): void {
    this.authService.logout();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }
}
