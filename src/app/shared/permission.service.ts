// ============================================================
//  permission.service.ts  –  Single source of truth for
//  "can this user do X" checks (module:action permission keys)
//  and portal access.
//
//  Permissions are held ONLY in memory (BehaviorSubject) — never
//  localStorage. A page reload wipes them; init() (called from
//  ApplayoutComponent on every authenticated page load, mirroring
//  CenterContextService.init()) detects the empty array and
//  re-fetches from the server. Login seeds the array directly via
//  setPermissions() since the login response already carries it —
//  no need for a redundant round trip right after signing in.
// ============================================================

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CommonapiService } from '../service/commonapi/commonapi.service';
import { AuthService } from '../service/auth/auth.service';

export type Portal = 'CRM' | 'ACADEMIC';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private permissionsSubject = new BehaviorSubject<string[]>([]);
  permissions$ = this.permissionsSubject.asObservable();

  private loaded = false;
  private loading = false;

  constructor(
    private commonApi: CommonapiService,
    private authService: AuthService,
  ) {}

  // ── Bootstrap ────────────────────────────────────────────────

  /**
   * Ensures the in-memory permission array is populated for the current
   * session. Call once per authenticated page load (ApplayoutComponent
   * ngOnInit — same trigger point as CenterContextService.init()).
   * No-ops if already loaded/loading, already populated (e.g. just seeded
   * by signIn()), or the user is admin (who never needs the array — every
   * check short-circuits on isAdmin() instead).
   */
  init(force = false): void {
    if (this.loading) return;
    if (!force && (this.loaded || this.permissionsSubject.value.length > 0)) {
      this.loaded = true;
      return;
    }
    if (this.authService.getIsAdmin()) {
      this.loaded = true;
      return;
    }
    if (!this.authService.hasValidSession()) return;

    this.loading = true;
    const entiId = this.authService.getTenantId();
    // Must be `targetUserId`, not `userId` — the auth middleware silently
    // overwrites a `userId` body field with the caller's own id for audit
    // purposes on every authenticated call.
    const targetUserId = this.authService.getUserId();

    this.commonApi.fetchData({ entiId, targetUserId }, 'ims/user', 'permissions').subscribe({
      next: (res: any) => {
        this.loading = false;
        this.loaded = true;
        const data = res?.data ?? {};
        this.permissionsSubject.next(Array.isArray(data.permissions) ? data.permissions : []);
        // The endpoint returns the live portal/isAdmin snapshot alongside
        // permissions — keep AuthService's cached copy in sync too, so a
        // refresh here also picks up a portal or admin-flag change without
        // requiring a full re-login.
        this.authService.setPortalAndAdmin(
          Array.isArray(data.portal) ? data.portal : [],
          !!data.isAdmin,
        );
      },
      error: () => {
        // Leave loaded=false so the next init() (e.g. next page navigation)
        // retries rather than silently locking the user out for the rest
        // of the session on a transient network failure.
        this.loading = false;
      },
    });
  }

  /** Force a fresh fetch — e.g. after a "your access was updated" signal, or
   *  periodically on app focus. Same call as init(), just explicit about
   *  bypassing the "already loaded" short-circuit. */
  refresh(): void {
    this.init(true);
  }

  /** Seed directly from the login response — skips the init() round trip. */
  setPermissions(permissions: string[]): void {
    this.loaded = true;
    this.permissionsSubject.next(Array.isArray(permissions) ? permissions : []);
  }

  reset(): void {
    this.loaded = false;
    this.loading = false;
    this.permissionsSubject.next([]);
  }

  // ── Checks ───────────────────────────────────────────────────

  isAdmin(): boolean {
    return this.authService.getIsAdmin();
  }

  hasPermission(key: string): boolean {
    return this.isAdmin() || this.permissionsSubject.value.includes(key);
  }

  hasAny(keys: string[]): boolean {
    return this.isAdmin() || keys.some((k) => this.permissionsSubject.value.includes(k));
  }

  hasAll(keys: string[]): boolean {
    return this.isAdmin() || keys.every((k) => this.permissionsSubject.value.includes(k));
  }

  hasPortal(portal: Portal): boolean {
    return this.isAdmin() || this.authService.getPortals().includes(portal);
  }
}
