import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-changepassword',
  standalone: false,
  templateUrl: './changepassword.component.html',
  styleUrl: './changepassword.component.scss'
})
export class ChangepasswordComponent {
  loading = false;
  serverError = '';
  showCurrent = false;
  showNew = false;
  showConfirm = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: CommonapiService,
    private alert: AlertService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(g: FormGroup) {
    const np = g.get('newPassword')?.value;
    const cp = g.get('confirmPassword')?.value;
    return np === cp ? null : { mismatch: true };
  }

  get f() {
    return this.form.controls;
  }

  submit(): void {
    if (this.loading || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverError = '';
    this.loading = true;

    const payload = {
      currentPassword: this.form.value.currentPassword,
      newPassword: this.form.value.newPassword
    };

    this.api
      .fetchData(payload, 'ims/user', 'change')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.alert.success('Password changed successfully. Please login again.');
          localStorage.clear();
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.serverError = err?.error?.message || 'Failed to change password. Please try again.';
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/app/dashboard']);
  }
}