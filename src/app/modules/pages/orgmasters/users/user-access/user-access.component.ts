// ============================================================
//  user-access.component.ts  –  Dedicated access-only screen,
//  routed at users/access/:id (Mongo _id / recId — POST
//  /ims/user/access/update requires recId, not the app-level
//  userId used by the View screen).
//
//  Basic Details / Role / Centers are shown for context but
//  locked (disabled, not hidden) — only Portal and Permissions
//  are editable here.
// ============================================================

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  selector: 'app-user-access',
  standalone: false,
  templateUrl: './user-access.component.html',
  styleUrl: './user-access.component.scss',
})
export class UserAccessComponent implements OnInit {
  userForm!: FormGroup;
  editingId: string | null = null;
  loadingUser = false;
  targetUser: any = null;

  entiId: any;
  centerOptions: any[] = [];

  permissionCatalog: DisplayPermissionGroup[] = [];
  totalPermissionCount = 0;
  catalogLoading = false;
  permissionSearch = '';
  portalOptions = [
    { value: 'CRM', label: 'CRM' },
    { value: 'ACADEMIC', label: 'Academic' },
  ];

  constructor(
    private fb: FormBuilder,
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
      { label: 'Manage Access' },
    ]);
  }

  ngOnInit(): void {
    if (!this.authService.getIsAdmin()) {
      this.alertService.error('Only the institute admin can manage user access.');
      this.router.navigate(['/app/org-master/users']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/app/org-master/users']);
      return;
    }

    this.userForm = this.fb.group({
      name: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
      phone: [{ value: '', disabled: true }],
      empCode: [{ value: '', disabled: true }],
      roleLabel: [{ value: '', disabled: true }],
      centerNames: [{ value: '', disabled: true }],
      portal: [[] as string[]],
      permissions: [[] as string[]],
    });

    this.loadCenters();
    this.loadPermissionCatalog();
    this.loadUser(id);
  }

  private loadUser(id: string): void {
    this.loadingUser = true;
    this.userService.listUsers(this.entiId).subscribe({
      next: (res: any) => {
        this.loadingUser = false;
        const row = (Array.isArray(res?.data) ? res.data : []).find((u: any) => u._id === id);
        if (!row) {
          this.alertService.error('User not found');
          this.router.navigate(['/app/org-master/users']);
          return;
        }
        if (row.isAdmin) {
          this.alertService.error("Cannot modify access for the institute admin user.");
          this.router.navigate(['/app/org-master/users']);
          return;
        }
        this.targetUser = row;
        this.editingId = row._id;
        this.userForm.patchValue({
          name: row.name || '',
          email: row.email || '',
          phone: row.phone || '',
          empCode: row.empCode || '',
          roleLabel: row.roleLabel || row.roleLevel || '',
          centerNames: this.resolveCenterNames(row).join(', '),
          portal: Array.isArray(row.portal) ? row.portal : [],
          permissions: Array.isArray(row.permissions) ? row.permissions : [],
        });
      },
      error: () => {
        this.loadingUser = false;
        this.alertService.error('Failed to load user');
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

  private resolveCenterNames(row: any): string[] {
    const centers = Array.isArray(row?.centers) ? row.centers : [];
    if (centers.length) return centers.map((c: any) => c.centerName).filter(Boolean);
    const legacyId = String(row?.centerId || '').trim();
    if (!legacyId) return ['All Centers'];
    if (row?.centerName) return [row.centerName];
    const opt = this.centerOptions.find((c) => c.value === legacyId);
    return [opt?.centerName || legacyId];
  }

  private loadPermissionCatalog(): void {
    this.catalogLoading = true;
    this.permissionCatalogService.getCatalog().subscribe({
      next: (groups) => {
        this.catalogLoading = false;
        this.permissionCatalog = groups
          .map((g) => ({
            ...g,
            moduleLabel: g.permissions[0]?.label?.split(' - ')[0]?.trim() || g.module,
          }))
          .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
        this.totalPermissionCount = groups.reduce((n, g) => n + g.permissions.length, 0);
      },
      error: () => {
        this.catalogLoading = false;
        this.alertService.error('Failed to load permission catalog');
      },
    });
  }

  isPortalSelected(value: string): boolean {
    const arr: string[] = this.userForm.get('portal')?.value || [];
    return arr.includes(value);
  }

  togglePortal(value: string, checked: boolean): void {
    const ctrl = this.userForm.get('portal');
    const arr: string[] = [...(ctrl?.value || [])];
    const idx = arr.indexOf(value);
    if (checked && idx === -1) arr.push(value);
    if (!checked && idx !== -1) arr.splice(idx, 1);
    ctrl?.setValue(arr);
  }

  get filteredPermissionCatalog(): DisplayPermissionGroup[] {
    const q = this.permissionSearch.trim().toLowerCase();
    if (!q) return this.permissionCatalog;
    return this.permissionCatalog
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) => p.label.toLowerCase().includes(q) || p.permissionKey.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.permissions.length > 0 || g.moduleLabel.toLowerCase().includes(q));
  }

  get selectedPermissionCount(): number {
    return (this.userForm.get('permissions')?.value || []).length;
  }

  isPermissionSelected(key: string): boolean {
    const arr: string[] = this.userForm.get('permissions')?.value || [];
    return arr.includes(key);
  }

  togglePermission(key: string, checked: boolean): void {
    const ctrl = this.userForm.get('permissions');
    const arr: string[] = [...(ctrl?.value || [])];
    const idx = arr.indexOf(key);
    if (checked && idx === -1) arr.push(key);
    if (!checked && idx !== -1) arr.splice(idx, 1);
    ctrl?.setValue(arr);
  }

  isModuleFullySelected(group: PermissionModuleGroup): boolean {
    const arr: string[] = this.userForm.get('permissions')?.value || [];
    return group.permissions.length > 0 && group.permissions.every((p) => arr.includes(p.permissionKey));
  }

  isModulePartiallySelected(group: PermissionModuleGroup): boolean {
    const arr: string[] = this.userForm.get('permissions')?.value || [];
    const selected = group.permissions.filter((p) => arr.includes(p.permissionKey)).length;
    return selected > 0 && selected < group.permissions.length;
  }

  toggleModule(group: PermissionModuleGroup, checked: boolean): void {
    const ctrl = this.userForm.get('permissions');
    const arr = new Set<string>(ctrl?.value || []);
    const keys = group.permissions.map((p) => p.permissionKey);
    if (checked) keys.forEach((k) => arr.add(k));
    else keys.forEach((k) => arr.delete(k));
    ctrl?.setValue(Array.from(arr));
  }

  toggleAllPermissions(checked: boolean): void {
    const ctrl = this.userForm.get('permissions');
    ctrl?.setValue(checked ? this.permissionCatalog.flatMap((g) => g.permissions.map((p) => p.permissionKey)) : []);
  }

  cancel(): void {
    this.router.navigate(['/app/org-master/users']);
  }

  /** POST /ims/user/access/update — role intentionally omitted. Its `role`
   *  field is a free-text LABEL (e.g. "Center Head"); this screen has no
   *  freeform input for that, only the legacy L1-L7 dropdown lives in the
   *  Edit screen, and that's not the same thing — sending it here would be
   *  wrong data, not a real label. */
  save(): void {
    const raw = this.userForm.getRawValue() || {};
    const payload = {
      entiId: this.entiId,
      recId: this.editingId,
      portal: (Array.isArray(raw.portal) ? raw.portal : []).filter(Boolean),
      permissions: (Array.isArray(raw.permissions) ? raw.permissions : []).filter(Boolean),
    };
    this.userService.updateUserAccess(payload).subscribe({
      next: (res: any) => {
        if (res?.status === false) { this.alertService.error(res?.message || 'Operation failed'); return; }
        this.alertService.success('User access updated successfully');
        this.router.navigate(['/app/org-master/users']);
      },
      error: (err: any) => this.alertService.error(err?.error?.message || 'Server error'),
    });
  }
}
