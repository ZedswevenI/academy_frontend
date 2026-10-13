import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../../service/auth/auth.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  showPassword = false;
  loading = false;
  submitted = false;
  serverError = '';
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    public service: AuthService,
    private alert: AlertService
  ) {
    this.service.formReset$.subscribe(() => {
      this.loading = false;
      this.submitted = false;
      this.serverError = '';
      this.form.reset();
    });

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.form.controls;
  }

  togglePassword() {
    if (this.loading) return;
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loading) return;
    this.submitted = true;
    this.serverError = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alert.error('Please enter valid email & password.');
      return;
    }
    const payload = {
      email: String(this.form.value.email || '').trim().toLowerCase(),
      password: String(this.form.value.password || '').trim()
    };
    this.loading = true;
    this.service
      .signIn(payload, 'ims/user', 'login')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (_res) => {
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            'Login Failed. Please enter correct Email/Password';
          this.serverError = msg;
          this.alert.error(msg);
        }
      });
  }
}