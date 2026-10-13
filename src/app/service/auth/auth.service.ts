import { Injector, NgZone, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environments';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AlertService } from '../alert/alert.service';
import { RoleLevel } from '../../shared/role.config';
import { PermissionService } from '../../shared/permission.service';

const TOKEN_KEY = 'token';
const TENANT_KEY = 'tenantId';
const USER_ID_KEY = 'userId';
const ROLE_KEY = 'userRole';
const EMAIL_KEY = 'email';
const NAME_KEY = 'name';
const CENTER_ID_KEY = 'centerId';
const CENTERS_ACCESS_KEY = 'centersAccess';
const SELECTED_CENTER_KEY = 'selectedCenterId';
const ACCESSIBLE_CENTERS_CACHE_KEY = 'accessibleCentersCache';
const STAFF_ID_KEY = 'staffId';
const SUBJECT_ID_KEY = 'subjectId';
const FACULTY_TYPE_KEY = 'facultyType';
const PORTAL_KEY = 'portal';
const IS_ADMIN_KEY = 'isAdmin';

/** Every portal this frontend deployment is allowed to serve. This app is the
 *  Academic portal — a login whose `portal[]` doesn't include it is rejected,
 *  regardless of what other portals (e.g. CRM) that user can otherwise reach. */
const REQUIRED_PORTAL = 'ACADEMIC';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  uploading = false;
  lastError: string | null = null;

  private formResetSubject = new Subject<void>();
  formReset$ = this.formResetSubject.asObservable();

  private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.loggedIn$.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private alert: AlertService,
    private injector: Injector,
  ) {}

  /** Lazy — PermissionService injects AuthService, so a normal constructor
   *  param here would be a DI cycle. Resolved on first use instead, by which
   *  point both singletons already exist. */
  private get permissionService(): PermissionService {
    return this.injector.get(PermissionService);
  }

  // ── Auth ──────────────────────────────────────────────────

  signIn(payload: any, module: any, endpoint: any): Observable<any> {
    this.uploading = true;
    this.lastError = null;

    return this.http
      .post(`${environment.baseURL}/${module}/${endpoint}`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response: any) => {
          if (!response?.data) throw new Error('Unexpected response.');
          const d = response.data;

          // Portal gate — an isAdmin login gets every portal automatically
          // (server-side), so only non-admin logins are checked here. A login
          // that can't reach this portal never touches localStorage: no
          // partial session is left behind for a stale guard to trip over.
          const portals: string[] = Array.isArray(d.portal) ? d.portal : [];
          if (!d.isAdmin && !portals.includes(REQUIRED_PORTAL)) {
            this.uploading = false;
            // Shaped like an HttpErrorResponse (`err.error.message`) so it
            // flows through the existing catchError below and the caller's
            // own error handler (see login.component.ts) without a second,
            // duplicate alert being raised here.
            // Synchronous throw inside tap() propagates as an error to the
            // subscriber — `return throwError(...)` would NOT work here,
            // tap() ignores its callback's return value.
            throw { error: { message: 'You are not authorised to access this portal.' } };
          }

          localStorage.setItem(TOKEN_KEY, d.token);
          localStorage.setItem(TENANT_KEY, d.tenantId);
          localStorage.setItem(USER_ID_KEY, d.userId);
          localStorage.setItem(ROLE_KEY, d.roleLevel); // e.g. "L5"
          localStorage.setItem(EMAIL_KEY, d.email);
          localStorage.setItem(NAME_KEY, d.name);
          localStorage.setItem(CENTER_ID_KEY, d.centerId ?? '');
          localStorage.setItem(CENTERS_ACCESS_KEY, JSON.stringify(d.centers ?? []));
          localStorage.removeItem(SELECTED_CENTER_KEY);
          // Also drop any stale accessible-centers cache from a previous
          // session (closed tab without logging out, expired token, a
          // different user on this browser, etc). Leaving it in place let
          // CommonapiService's resolveCenterId() see a multi-center cache
          // with no selection and block EVERY request — including
          // CenterContextService.init()'s own bootstrap call that would
          // otherwise refresh it, deadlocking the app until logout.
          localStorage.removeItem(ACCESSIBLE_CENTERS_CACHE_KEY);
          localStorage.setItem(STAFF_ID_KEY, d.staffId ?? '');
          localStorage.setItem(SUBJECT_ID_KEY, d.subjectId ?? '');
          localStorage.setItem(FACULTY_TYPE_KEY, d.facultyType ?? '');
          localStorage.setItem(PORTAL_KEY, JSON.stringify(portals));
          localStorage.setItem(IS_ADMIN_KEY, JSON.stringify(!!d.isAdmin));

          // Permissions are NOT persisted to localStorage — they live only in
          // PermissionService's in-memory store, seeded here from the login
          // response. A page reload wipes that memory; PermissionService's
          // own init() (called from ApplayoutComponent on every authenticated
          // page load) detects the empty array and re-fetches from the server.
          this.permissionService.setPermissions(Array.isArray(d.permissions) ? d.permissions : []);

          this.uploading = false;
          this.loggedIn$.next(true);
          this.alert.success('Login Successful!!');
          // this.ngZone.run(() => this.router.navigateByUrl('/app/dashboard'));
          this.ngZone.run(() => {
            const roleRouteMap: Record<string, string> = {
              L1: '/app/dashboard',
              L2: '/app/dashboard',
              L3: '/app/batch',
              L4: '/app/timetable',
              L5: '/app/exams/exams',
              L6: '/app/teacher',
              L7: '/app/assignment',
            };
            const defaultRoute = roleRouteMap[d.roleLevel] ?? '/app/support';
            this.router.navigateByUrl(defaultRoute);
          });
        }),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            'Login Failed. Please enter correct Email / Password.';
          this.lastError = msg;
          this.uploading = false;
          return throwError(() => err);
        }),
      );
  }

  refreshToken(): Observable<any> {
    return this.http
      .post(
        `${environment.baseURL}/ims/user/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((res: any) => {
          if (res?.token) localStorage.setItem(TOKEN_KEY, res.token);
        }),
      );
  }

  logout(): void {
    const payload = {
      entiId: localStorage.getItem(TENANT_KEY) ?? '',
      userId: localStorage.getItem(USER_ID_KEY) ?? '',
    };
    this.http
      .post(`${environment.baseURL}/ims/user/logout`, payload, {
        withCredentials: true,
      })
      .subscribe({
        next: () => this.clearSession(true),
        error: () => this.clearSession(false),
      });
  }

  private clearSession(showAlert: boolean): void {
    [
      TOKEN_KEY,
      TENANT_KEY,
      USER_ID_KEY,
      ROLE_KEY,
      EMAIL_KEY,
      NAME_KEY,
      CENTER_ID_KEY,
      CENTERS_ACCESS_KEY,
      SELECTED_CENTER_KEY,
      ACCESSIBLE_CENTERS_CACHE_KEY,
      STAFF_ID_KEY,
      SUBJECT_ID_KEY,
      FACULTY_TYPE_KEY,
      PORTAL_KEY,
      IS_ADMIN_KEY,
    ].forEach((k) => localStorage.removeItem(k));

    this.permissionService.reset();
    this.loggedIn$.next(false);
    if (showAlert) this.alert.success('You are logged out successfully!');
    this.router.navigate(['/auth/login']);
  }

  // ── Session helpers ───────────────────────────────────────

  hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  hasValidSession(): boolean {
    return this.hasToken();
  }

  setLoggedIn(): void {
    this.loggedIn$.next(true);
  }

  triggerFormReset(): void {
    this.formResetSubject.next();
  }

  // ── Role helpers ──────────────────────────────────────────

  getRole(): RoleLevel {
    return (localStorage.getItem(ROLE_KEY) ?? '') as RoleLevel;
  }

  isRole(role: RoleLevel): boolean {
    return this.getRole() === role;
  }

  hasAnyRole(roles: RoleLevel[]): boolean {
    return roles.includes(this.getRole());
  }

  // ── Portal / admin helpers ─────────────────────────────────

  getPortals(): string[] {
    try {
      return JSON.parse(localStorage.getItem(PORTAL_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  getIsAdmin(): boolean {
    return localStorage.getItem(IS_ADMIN_KEY) === 'true';
  }

  /** Refreshes the cached portal/isAdmin snapshot — e.g. after PermissionService
   *  re-fetches from POST /ims/user/permissions, which returns the current
   *  values alongside permissions[]. Keeps this session's copy in sync with
   *  the server without requiring a full re-login. */
  setPortalAndAdmin(portals: string[], isAdmin: boolean): void {
    localStorage.setItem(PORTAL_KEY, JSON.stringify(Array.isArray(portals) ? portals : []));
    localStorage.setItem(IS_ADMIN_KEY, JSON.stringify(!!isAdmin));
  }

  getUserId(): string {
    return localStorage.getItem(USER_ID_KEY) ?? '';
  }

  getTenantId(): string {
    return localStorage.getItem(TENANT_KEY) ?? '';
  }

  // ── User info helpers ─────────────────────────────────────

  getUserName(): string {
    return localStorage.getItem(NAME_KEY) ?? '';
  }

  getEmail(): string {
    return localStorage.getItem(EMAIL_KEY) ?? '';
  }

  getCenterId(): string {
    return localStorage.getItem(CENTER_ID_KEY) ?? '';
  }

  /** Raw `centers` array from the login response. Empty array means "access to all centers". */
  getCentersAccess(): any[] {
    try {
      return JSON.parse(localStorage.getItem(CENTERS_ACCESS_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  getSelectedCenterId(): string {
    return localStorage.getItem(SELECTED_CENTER_KEY) ?? '';
  }

  setSelectedCenterId(centerId: string): void {
    localStorage.setItem(SELECTED_CENTER_KEY, centerId);
  }

  /** Cache of the resolved accessible-center list, read synchronously by CommonapiService to decide whether a center selection is required before a request may proceed. */
  setAccessibleCentersCache(centers: any[]): void {
    localStorage.setItem(ACCESSIBLE_CENTERS_CACHE_KEY, JSON.stringify(centers));
  }

  getStaffId(): string {
    return localStorage.getItem(STAFF_ID_KEY) ?? '';
  }

  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Observable<any> {
    return this.http.post(`${environment.baseURL}/ims/user/change`, payload, {
      withCredentials: true,
    });
  }

  getSubjectId(): string {
    return localStorage.getItem(SUBJECT_ID_KEY) ?? '';
  }

  getFacultyType(): string {
    return localStorage.getItem(FACULTY_TYPE_KEY) ?? '';
  }

  getTeacherContext(): {
    staffId: string;
    subjectId: string;
    facultyType: string;
  } | null {
    if (this.getRole() !== 'L4') return null;
    return {
      staffId: this.getStaffId(),
      subjectId: this.getSubjectId(),
      facultyType: this.getFacultyType(),
    };
  }

  assignmentRole(): boolean {
    return (
      localStorage.getItem('email') == 'maheswari@z7i.in' ||
      localStorage.getItem('email') == 'edp1@z7i.in'
    );
  }
}
