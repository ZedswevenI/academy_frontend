import { NgZone, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environments';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AlertService } from '../alert/alert.service';

type UserRole = 'admin' | 'manager' | 'supervisor' | 'staff';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  headers = new HttpHeaders().set('Content-Type', 'application/json');
  Uploading: Boolean = false;
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

  signIn(payload: any, module: any, endpoint: any): Observable<any> {
    this.Uploading = true;
    this.lastError = null;
    return this.http
      .post(`${environment.baseURL}/${module}/${endpoint}`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response: any) => {
          if (!response?.data) {
            throw new Error('Unexpected response.');
          }
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('tenantId', response.data.tenantId);
          localStorage.setItem('userid', response.data.userId);
          localStorage.setItem('userRole', response.data.roleLevel);
          localStorage.setItem('email', response.data.email);
          localStorage.setItem('name', response.data.name);
          this.alert.success(`Login Successful!!`);
          this.Uploading = false;
          this.loggedIn$.next(true);
          this.ngZone.run(() => this.router.navigateByUrl('/app/dashboard'));
        }),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            'Login Failed. Please enter correct Email/Password';

          this.lastError = msg;
          this.Uploading = false;
          return throwError(() => err);
        }),
      );
  }

  triggerFormReset() {
    this.formResetSubject.next();
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
          localStorage.setItem('token', res.token);
        }),
      );
  }

  logout() {
    this.http
      .post(
        `${environment.baseURL}/ims/user/logout`,
        {},
        { withCredentials: true },
      )
      .subscribe({
        next: (res) => {
          localStorage.removeItem('token');
          localStorage.removeItem('userid');
          localStorage.removeItem('tenantId');
          localStorage.removeItem('role');
          localStorage.removeItem('email');
          localStorage.removeItem('name');
          localStorage.removeItem('userRole');
          this.alert.success(`You are Loggedout Successfully!!`);
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          localStorage.removeItem('token');
          localStorage.removeItem('token');
          localStorage.removeItem('tenantid');
          localStorage.removeItem('userid');
          localStorage.removeItem('usertype');
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('userRole');
          localStorage.removeItem('loggedusername');
          this.router.navigate(['/auth/signout']);
        },
      });
  }
  hasToken(): boolean {
    const t = localStorage.getItem('token');
    return !!t;
  }

  hasValidSession(): boolean {
    return this.hasToken();
  }

  setLoggedIn() {
    this.loggedIn$.next(true);
  }

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.http.post(`${environment.baseURL}/ims/user/change`, payload, {
      withCredentials: true,
    });
  }

  getRole(): UserRole {
    const fromStorage = localStorage.getItem('userRole') || '';
    return fromStorage as UserRole;
  }

  isRole(role: UserRole): boolean {
    return this.getRole() === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const current = this.getRole();
    return roles.includes(current);
  }

  assignmentRole(): boolean {
    return (
      localStorage.getItem('email') == 'maheswari@z7i.in' ||
      localStorage.getItem('email') == 'edp1@z7i.in'
    );
  }
}
