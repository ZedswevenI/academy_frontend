// ============================================================
//  user-view.component.ts  –  Standalone, read-only. Routed at
//  users/view/:id, fetches its own data — NOT the create/edit
//  form in a disabled state.
// ============================================================

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BredcrumpService } from '../../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../../service/alert/alert.service';
import { UserService } from '../../../../../service/admin/user.service';
import { CenterService } from '../../../../../service/admin/orgmaster/center.service';
import { AuthService } from '../../../../../service/auth/auth.service';
import { PermissionCatalogService, PermissionModuleGroup } from '../../../../../shared/permission-catalog.service';

interface DisplayPermissionGroup extends PermissionModuleGroup {
  moduleLabel: string;
}

@Component({
  selector: 'app-user-view',
  standalone: false,
  templateUrl: './user-view.component.html',
  styleUrl: './user-view.component.scss',
})
export class UserViewComponent implements OnInit {
  entiId: any;
  loading = false;
  user: any = null;

  centerOptions: any[] = [];
  permissionCatalog: DisplayPermissionGroup[] = [];
  totalPermissionCount = 0;

  portalOptions = [
    { value: 'CRM', label: 'CRM' },
    { value: 'ACADEMIC', label: 'Academic' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumb: BredcrumpService,
    private alertService: AlertService,
    private userService: UserService,
    private centerService: CenterService,
    private authService: AuthService,
    private permissionCatalogService: PermissionCatalogService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([
      { label: 'Org-Master' },
      { label: 'Users', link: '/app/org-master/users' },
      { label: 'View' },
    ]);
  }

  ngOnInit(): void {
    // Route carries the app-level userId (not the Mongo _id) — that's what
    // POST /ims/user/view-by-userid is keyed on.
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.router.navigate(['/app/org-master/users']);
      return;
    }
    this.loadCenters();
    this.loadPermissionCatalog();
    this.loadUser(userId);
  }

  private loadUser(userId: string): void {
    this.loading = true;
    this.userService.viewUserByUserId(this.entiId, userId).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === false || !res?.data) {
          this.alertService.error(res?.message || 'User not found');
          this.router.navigate(['/app/org-master/users']);
          return;
        }
        this.user = res.data;
      },
      error: (err: any) => {
        this.loading = false;
        this.alertService.error(err?.error?.message || 'Failed to load user');
        this.router.navigate(['/app/org-master/users']);
      },
    });
  }

  private loadCenters(): void {
    this.centerService.listCenters(this.entiId).subscribe({
      next: (res: any) => {
        const centers = res?.data || [];
        this.centerOptions = centers.map((c: any) => ({
          value: String(c.centerId || c._id || '').trim(),
          centerName: c.centerName,
        }));
      },
    });
  }

  private loadPermissionCatalog(): void {
    this.permissionCatalogService.getCatalog().subscribe({
      next: (groups) => {
        this.permissionCatalog = groups
          .map((g) => ({
            ...g,
            moduleLabel: g.permissions[0]?.label?.split(' - ')[0]?.trim() || g.module,
          }))
          .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
        this.totalPermissionCount = groups.reduce((n, g) => n + g.permissions.length, 0);
      },
    });
  }

  get centerNames(): string[] {
    const centers = Array.isArray(this.user?.centers) ? this.user.centers : [];
    if (centers.length) return centers.map((c: any) => c.centerName).filter(Boolean);
    const legacyId = String(this.user?.centerId || '').trim();
    if (!legacyId) return ['All Centers'];
    if (this.user?.centerName) return [this.user.centerName];
    const opt = this.centerOptions.find((c) => c.value === legacyId);
    return [opt?.centerName || legacyId];
  }

  hasPortal(portal: string): boolean {
    return Array.isArray(this.user?.portal) && this.user.portal.includes(portal);
  }

  hasPermission(key: string): boolean {
    return Array.isArray(this.user?.permissions) && this.user.permissions.includes(key);
  }

  get grantedCount(): number {
    return Array.isArray(this.user?.permissions) ? this.user.permissions.length : 0;
  }

  /** Only modules with at least one granted permission — a Teacher with 80
   *  keys out of 277 shouldn't have to scroll past 40 all-empty modules. */
  get grantedGroups(): DisplayPermissionGroup[] {
    return this.permissionCatalog
      .map((g) => ({ ...g, permissions: g.permissions.filter((p) => this.hasPermission(p.permissionKey)) }))
      .filter((g) => g.permissions.length > 0);
  }

  canManageAccess(): boolean {
    return this.authService.getIsAdmin() && !this.user?.isAdmin;
  }

  close(): void {
    this.router.navigate(['/app/org-master/users']);
  }

  goToEdit(): void {
    this.router.navigate(['/app/org-master/users/edit', this.user._id]);
  }

  goToAccess(): void {
    this.router.navigate(['/app/org-master/users/access', this.user._id]);
  }
}
