// ============================================================
//  user-form.component.ts  –  Create AND Edit, routed separately
//  from the list (users/create, users/edit/:id). Mode is derived
//  from whether the :id route param is present.
//
//  NOT the same component as user-view or user-access — each of
//  the four user screens (list / view / form / access) is its
//  own routed component now, not a mode flag on one shared file.
// ============================================================

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../../service/bredcrump/bredcrump.service';
import { AlertService } from '../../../../../service/alert/alert.service';
import { UserService } from '../../../../../service/admin/user.service';
import { CenterService } from '../../../../../service/admin/orgmaster/center.service';
import { PermissionCatalogService, PermissionModuleGroup, computeModuleLabels } from '../../../../../shared/permission-catalog.service';

interface DisplayPermissionGroup extends PermissionModuleGroup {
  moduleLabel: string;
}

@Component({
  selector: 'app-user-form',
  standalone: false,
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  userForm!: FormGroup;
  mode: 'create' | 'edit' = 'create';
  editingId: string | null = null;
  editingIsAdmin = false;
  loadingUser = false;

  entiId: any;
  centers: any[] = [];
  centerOptions: any[] = [];

  permissionCatalog: DisplayPermissionGroup[] = [];
  totalPermissionCount = 0;
  catalogLoading = false;
  permissionSearch = '';
  portalOptions = [
    { value: 'CRM', label: 'CRM' },
    { value: 'ACADEMIC', label: 'Academic' },
  ];

  roleOptions = [
    { value: 'L1', label: 'L1 - Super Admin' },
    { value: 'L2', label: 'L2 - Admissions' },
    { value: 'L3', label: 'L3 - AO' },
    { value: 'L4', label: 'L4 - Teacher' },
    { value: 'L5', label: 'L5 - Exam' },
    { value: 'L6', label: 'L6 - Account' },
    { value: 'L7', label: 'L7 - EDP' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumb: BredcrumpService,
    private alertService: AlertService,
    private userService: UserService,
    private centerService: CenterService,
    private permissionCatalogService: PermissionCatalogService,
  ) {
    this.entiId = localStorage.getItem('tenantId');
  }

  ngOnInit(): void {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      role: [null, Validators.required],
      empCode: [''],
      password: [''],
      centerIds: [[] as string[]],
      portal: [[] as string[]],
      permissions: [[] as string[]],
      isActive: [true],
    });

    const id = this.route.snapshot.paramMap.get('id');
    this.mode = id ? 'edit' : 'create';
    this.breadcrumb.set([
      { label: 'Org-Master' },
      { label: 'Users', link: '/app/org-master/users' },
      { label: this.mode === 'create' ? 'Create' : 'Edit' },
    ]);

    this.loadCenters();
    this.loadPermissionCatalog();

    if (id) {
      this.loadUser(id);
    } else {
      this.userForm.get('empCode')?.enable({ emitEvent: false });
      this.applyPasswordRules();
    }

    this.applyCenterValidator();
    this.userForm.get('role')?.valueChanges.subscribe(() => this.applyCenterValidator());
  }

  /** No dedicated single-user-by-id endpoint confirmed yet — reuses the same
   *  list?list=full call the table uses and finds the matching row. Fine for
   *  admin-screen traffic volume; swap to a direct fetch if/when one exists. */
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
        this.patchFromRow(row);
      },
      error: () => {
        this.loadingUser = false;
        this.alertService.error('Failed to load user');
        this.router.navigate(['/app/org-master/users']);
      },
    });
  }

  private patchFromRow(row: any): void {
    this.editingId = row?._id || null;
    const centerIds = this.resolveCenterIds(row);
    this.userForm.patchValue({
      name: row?.name || '',
      email: row?.email || '',
      phone: row?.phone || '',
      role: row?.roleLevel || null,
      centerIds,
      portal: Array.isArray(row?.portal) ? row.portal : [],
      permissions: Array.isArray(row?.permissions) ? row.permissions : [],
      isActive: (row?.status || '') === 'Active',
    });
    this.userForm.get('empCode')?.setValue(row?.empCode || '', { emitEvent: false });
    this.userForm.get('empCode')?.disable({ emitEvent: false });

    // Admin users bypass permissions entirely (isAdmin === true short-circuits
    // every check) — the backend 400s if you try to edit their access, so the
    // picker is locked here rather than letting the save round-trip fail.
    const targetIsAdmin = !!row?.isAdmin;
    this.editingIsAdmin = targetIsAdmin;
    const permCtrl = this.userForm.get('permissions');
    const portalCtrl = this.userForm.get('portal');
    if (targetIsAdmin) {
      permCtrl?.disable({ emitEvent: false });
      portalCtrl?.disable({ emitEvent: false });
    } else {
      permCtrl?.enable({ emitEvent: false });
      portalCtrl?.enable({ emitEvent: false });
    }

    this.applyPasswordRules();
  }

  private loadPermissionCatalog(): void {
    this.catalogLoading = true;
    this.permissionCatalogService.getCatalog().subscribe({
      next: (groups) => {
        this.catalogLoading = false;
        const labels = computeModuleLabels(groups);
        this.permissionCatalog = groups
          .map((g) => ({
            ...g,
            moduleLabel: labels.get(g.module) || g.module,
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

  /** L1/L2/L3 are tenant-wide roles — centers are optional for them; all other roles must have at least one. */
  get centersRequired(): boolean {
    const role = this.userForm.get('role')?.value;
    return !['L1', 'L2', 'L3'].includes(role);
  }

  private applyCenterValidator(): void {
    const ctrl = this.userForm.get('centerIds');
    if (!ctrl) return;
    if (this.centersRequired) {
      ctrl.setValidators([(c) => (Array.isArray(c.value) && c.value.length > 0) ? null : { required: true }]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  isCenterSelected(centerId: string): boolean {
    const arr: string[] = this.userForm.get('centerIds')?.value || [];
    return arr.includes(centerId);
  }

  toggleCenter(centerId: string, checked: boolean): void {
    const ctrl = this.userForm.get('centerIds');
    const arr: string[] = [...(ctrl?.value || [])];
    const idx = arr.indexOf(centerId);
    if (checked && idx === -1) arr.push(centerId);
    if (!checked && idx !== -1) arr.splice(idx, 1);
    ctrl?.setValue(arr);
    ctrl?.markAsTouched();
  }

  get selectAllCenters(): boolean {
    const arr: string[] = this.userForm.get('centerIds')?.value || [];
    return this.centerOptions.length > 0 && arr.length === this.centerOptions.length;
  }

  toggleAllCenters(checked: boolean): void {
    const ctrl = this.userForm.get('centerIds');
    ctrl?.setValue(checked ? this.centerOptions.map((c) => c.value) : []);
    ctrl?.markAsTouched();
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
    ctrl?.markAsTouched();
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
    ctrl?.markAsTouched();
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
    ctrl?.markAsTouched();
  }

  toggleAllPermissions(checked: boolean): void {
    const ctrl = this.userForm.get('permissions');
    ctrl?.setValue(checked ? this.permissionCatalog.flatMap((g) => g.permissions.map((p) => p.permissionKey)) : []);
    ctrl?.markAsTouched();
  }

  private applyPasswordRules() {
    const pwd = this.userForm.get('password');
    if (!pwd) return;
    if (this.mode === 'create') {
      pwd.setValidators([Validators.required]);
      pwd.setValue('Welcome@123', { emitEvent: false });
    } else {
      pwd.clearValidators();
      pwd.setValue('', { emitEvent: false });
    }
    pwd.updateValueAndValidity({ emitEvent: false });
  }

  loadCenters(): void {
    this.centerService.listCenters(this.entiId).subscribe({
      next: (res: any) => {
        if (res?.status === false) {
          this.alertService.error(res?.message || 'Failed to load centers');
          return;
        }
        this.centers = res?.data || [];
        this.centerOptions = this.centers.map((c: any) => ({
          label: c.centerName,
          value: String(c.centerId || c._id || '').trim(),
          _id: c._id,
          centerName: c.centerName,
        }));
      },
      error: () => this.alertService.error('Server error while loading centers'),
    });
  }

  private resolveCenterIds(row: any): string[] {
    const centers = Array.isArray(row?.centers) ? row.centers : [];
    if (centers.length) {
      return centers.map((c: any) => String(c.centerId || c._id || '').trim()).filter(Boolean);
    }
    const legacyId = String(row?.centerId || '').trim();
    return legacyId ? [legacyId] : [];
  }

  cancel(): void {
    this.router.navigate(['/app/org-master/users']);
  }

  save(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.alertService.error('Please fill all required fields');
      return;
    }
    const raw = this.userForm.getRawValue() || {};
    const centerIds: string[] = (Array.isArray(raw.centerIds) ? raw.centerIds : []).filter(Boolean);
    const portal: string[] = (Array.isArray(raw.portal) ? raw.portal : []).filter(Boolean);
    const permissions: string[] = (Array.isArray(raw.permissions) ? raw.permissions : []).filter(Boolean);

    const payload: any = {
      entiId: this.entiId,
      name: String(raw.name || '').trim(),
      email: String(raw.email || '').trim().toLowerCase(),
      phone: String(raw.phone || '').trim(),
      roleLevel: String(raw.role || 'L4').trim(),
      status: raw.isActive ? 'Active' : 'Inactive',
      centerIds,
      portal,
      permissions,
    };

    const empCode = String(raw.empCode || '').trim();
    if (empCode) payload.empCode = empCode;

    if (this.mode === 'create') {
      payload.password = 'Welcome@123';
    } else {
      payload.recId = this.editingId;
    }

    const api$ = this.mode === 'create'
      ? this.userService.createUser(payload)
      : this.userService.updateUser(payload);

    api$.subscribe({
      next: (res: any) => {
        if (res?.status === false) { this.alertService.error(res?.message || 'Operation failed'); return; }
        this.alertService.success(this.mode === 'create' ? 'User created successfully' : 'User updated successfully');
        this.router.navigate(['/app/org-master/users']);
      },
      // Surfaced verbatim in case a stale client-side cache of the catalog
      // (PermissionCatalogService caches per session) sends a key the
      // backend has since renamed or removed — "Unknown permission key(s): ..."
      // is the earliest signal of that.
      error: (err: any) => this.alertService.error(err?.error?.message || 'Server error'),
    });
  }
}
