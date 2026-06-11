import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

type Step = 'email' | 'otp' | 'reset';

@Component({
  selector: 'app-forgetpassword',
  standalone: false,
  templateUrl: './forgetpassword.component.html',
  styleUrl: './forgetpassword.component.scss'
})
export class ForgetpasswordComponent {
  step: Step = 'email';
  loading = false;
  serverError = '';
  submittedEmail = '';
  resetToken = '';
  emailForm: FormGroup;
  otpForm: FormGroup;
  resetForm: FormGroup;
  showNewPassword = false;
  showConfirmPassword = false;
  resendCooldown = 0;
  private resendTimer: any;

  constructor(
    private fb: FormBuilder,
    private api: CommonapiService,
    private alert: AlertService,
    private router: Router
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
    this.resetForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(g: FormGroup) {
    const pw = g.get('newPassword')?.value;
    const cp = g.get('confirmPassword')?.value;
    return pw === cp ? null : { mismatch: true };
  }

  sendOtp(): void {
    if (this.loading || this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.serverError = '';
    this.loading = true;
    const email = String(this.emailForm.value.email).trim().toLowerCase();
    this.api
      .fetchData({ email }, 'ims/user', 'forgot-password')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.submittedEmail = email;
          this.step = 'otp';
          this.startResendCooldown();
          this.alert.success('OTP sent to your email');
        },
        error: (err) => {
          this.serverError = err?.error?.message || 'Failed to send OTP. Please try again.';
        }
      });
  }

  verifyOtp(): void {
    if (this.loading || this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.serverError = '';
    this.loading = true;
    this.api
      .fetchData(
        { email: this.submittedEmail, otp: this.otpForm.value.otp },
        'ims/user',
        'verify-forgot-otp'
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          this.resetToken = res.resetToken;
          this.step = 'reset';
          this.alert.success('OTP verified');
        },
        error: (err) => {
          this.serverError = err?.error?.message || 'Invalid or expired OTP.';
        }
      });
  }

  resetPassword(): void {
    if (this.loading || this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.serverError = '';
    this.loading = true;
    this.api
      .fetchData(
        { resetToken: this.resetToken, newPassword: this.resetForm.value.newPassword },
        'ims/user',
        'reset-password'
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.alert.success('Password reset successfully. Please login.');
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.serverError = err?.error?.message || 'Failed to reset password. Please start again.';
        }
      });
  }

  resendOtp(): void {
    if (this.resendCooldown > 0 || this.loading) return;
    this.serverError = '';
    this.loading = true;
    this.api
      .fetchData({ email: this.submittedEmail }, 'ims/user', 'forgot-password')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.otpForm.reset();
          this.startResendCooldown();
          this.alert.success('OTP resent to your email');
        },
        error: (err) => {
          this.serverError = err?.error?.message || 'Failed to resend OTP.';
        }
      });
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;
    clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.resendTimer);
    }, 1000);
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  backToEmail(): void {
    this.step = 'email';
    this.serverError = '';
    this.otpForm.reset();
  }
}