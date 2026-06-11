// import { NgZone, Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { HttpHeaders } from '@angular/common/http';
// import { Router } from '@angular/router';
// import { environment } from '../../../environments/environments';
// import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
// import { tap, catchError } from 'rxjs/operators';
// import { AlertService } from '../alert/alert.service';

// type UserRole = 'admin' | 'manager' | 'supervisor' | 'staff';

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthService {
//   headers = new HttpHeaders().set('Content-Type', 'application/json');
//   Uploading: Boolean = false;
//   lastError: string | null = null;
//   private formResetSubject = new Subject<void>();
//   formReset$ = this.formResetSubject.asObservable();
//   private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());
//   isLoggedIn$ = this.loggedIn$.asObservable();

//   constructor(
//     private http: HttpClient,
//     private router: Router,
//     private ngZone: NgZone,
//     private alert: AlertService,
//   ) {}

//   signIn(payload: any, module: any, endpoint: any): Observable<any> {
//     this.Uploading = true;
//     this.lastError = null;
//     return this.http
//       .post(`${environment.baseURL}/${module}/${endpoint}`, payload, {
//         withCredentials: true,
//       })
//       .pipe(
//         tap((response: any) => {
//           if (!response?.data) {
//             throw new Error('Unexpected response.');
//           }
//           localStorage.setItem('token', response.data.token);
//           localStorage.setItem('tenantId', response.data.tenantId);
//           localStorage.setItem('userid', response.data.userId);
//           localStorage.setItem('userRole', response.data.roleLevel);
//           localStorage.setItem('email', response.data.email);
//           localStorage.setItem('name', response.data.name);
//           this.alert.success(`Login Successful!!`);
//           this.Uploading = false;
//           this.loggedIn$.next(true);
//           this.ngZone.run(() => this.router.navigateByUrl('/app/dashboard'));
//         }),
//         catchError((err) => {
//           const msg =
//             err?.error?.message ||
//             err?.error?.error ||
//             'Login Failed. Please enter correct Email/Password';

//           this.lastError = msg;
//           this.Uploading = false;
//           return throwError(() => err);
//         }),
//       );
//   }

//   triggerFormReset() {
//     this.formResetSubject.next();
//   }

//   refreshToken(): Observable<any> {
//     return this.http
//       .post(
//         `${environment.baseURL}/ims/user/auth/refresh`,
//         {},
//         { withCredentials: true },
//       )
//       .pipe(
//         tap((res: any) => {
//           localStorage.setItem('token', res.token);
//         }),
//       );
//   }

//   logout() {
//     this.http
//       .post(
//         `${environment.baseURL}/ims/user/logout`,
//         {},
//         { withCredentials: true },
//       )
//       .subscribe({
//         next: (res) => {
//           localStorage.removeItem('token');
//           localStorage.removeItem('userid');
//           localStorage.removeItem('tenantId');
//           localStorage.removeItem('role');
//           localStorage.removeItem('email');
//           localStorage.removeItem('name');
//           localStorage.removeItem('userRole');
//           this.alert.success(`You are Loggedout Successfully!!`);
//           this.router.navigate(['/auth/login']);
//         },
//         error: (err) => {
//           localStorage.removeItem('token');
//           localStorage.removeItem('token');
//           localStorage.removeItem('tenantid');
//           localStorage.removeItem('userid');
//           localStorage.removeItem('usertype');
//           localStorage.removeItem('isAdmin');
//           localStorage.removeItem('userRole');
//           localStorage.removeItem('loggedusername');
//           this.router.navigate(['/auth/signout']);
//         },
//       });
//   }
//   hasToken(): boolean {
//     const t = localStorage.getItem('token');
//     return !!t;
//   }

//   hasValidSession(): boolean {
//     return this.hasToken();
//   }

//   setLoggedIn() {
//     this.loggedIn$.next(true);
//   }

//   changePassword(payload: { currentPassword: string; newPassword: string }) {
//     return this.http.post(`${environment.baseURL}/ims/user/change`, payload, {
//       withCredentials: true,
//     });
//   }

//   getRole(): UserRole {
//     const fromStorage = localStorage.getItem('userRole') || '';
//     return fromStorage as UserRole;
//   }

//   isRole(role: UserRole): boolean {
//     return this.getRole() === role;
//   }

//   hasAnyRole(roles: UserRole[]): boolean {
//     const current = this.getRole();
//     return roles.includes(current);
//   }

//   assignmentRole(): boolean {
//     return (
//       localStorage.getItem('email') == 'maheswari@z7i.in' ||
//       localStorage.getItem('email') == 'edp1@z7i.in'
//     );
//   }
// }

// ============================================================
//  auth.service.ts  –  Cleaned up, role-aware
//  Replaces existing auth.service.ts
// ============================================================

import { NgZone, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environments';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AlertService } from '../alert/alert.service';
import { RoleLevel } from '../../shared/role.config';

const TOKEN_KEY = 'token';
const TENANT_KEY = 'tenantId';
const USER_ID_KEY = 'userId';
const ROLE_KEY = 'userRole';
const EMAIL_KEY = 'email';
const NAME_KEY = 'name';
const CENTER_ID_KEY = 'centerId';
const STAFF_ID_KEY = 'staffId';
const SUBJECT_ID_KEY = 'subjectId';
const FACULTY_TYPE_KEY = 'facultyType';

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
  ) {}

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
          localStorage.setItem(TOKEN_KEY, d.token);
          localStorage.setItem(TENANT_KEY, d.tenantId);
          localStorage.setItem(USER_ID_KEY, d.userId);
          localStorage.setItem(ROLE_KEY, d.roleLevel); // e.g. "L5"
          localStorage.setItem(EMAIL_KEY, d.email);
          localStorage.setItem(NAME_KEY, d.name);
          localStorage.setItem(CENTER_ID_KEY, d.centerId ?? '');
          localStorage.setItem(STAFF_ID_KEY, d.staffId ?? '');
          localStorage.setItem(SUBJECT_ID_KEY, d.subjectId ?? '');
          localStorage.setItem(FACULTY_TYPE_KEY, d.facultyType ?? '');
          this.uploading = false;
          this.loggedIn$.next(true);
          this.alert.success('Login Successful!!');
          this.ngZone.run(() => this.router.navigateByUrl('/app/dashboard'));
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
    this.http
      .post(
        `${environment.baseURL}/ims/user/logout`,
        {},
        { withCredentials: true },
      )
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
      STAFF_ID_KEY,
      SUBJECT_ID_KEY,
      FACULTY_TYPE_KEY,
    ].forEach((k) => localStorage.removeItem(k));

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
