import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { AlertService } from '../../../../service/alert/alert.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

@Component({
  selector: 'app-institute-form',
  standalone: false,
  templateUrl: './institute-form.component.html',
  styleUrl: './institute-form.component.scss'
})
export class InstituteFormComponent {
  institueForm!: FormGroup;
  institute: any;

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private alert: AlertService,
    private commonApi: CommonapiService) {
    this.breadcrump.set([{ label: 'Org Master' }, { label: 'Institute', link: '/app/org-master/institute' }, { label: 'Edit' }]);

    const navigation = this.router.getCurrentNavigation();
    this.institute = navigation?.extras?.state?.['institute'];
    console.log('Received institute:', this.institute);
  }

  ngOnInit(): void {
    this.institueForm = this.fb.group({
      name: ['', Validators.required],
      code: [''],
      city: [''],
      state: [''],
      pincode: [''],
      addressLine1: [''],
      addressLine2: [''],
      contactEmail: [''],
      phone: [''],
      isActive: [false]
    });

    if (this.institute) {
      this.institueForm.patchValue({
        name: this.institute.name,
        code: this.institute.code,
        city: this.institute.city,
        state: this.institute.state,
        pincode: this.institute.pincode,
        addressLine1: this.institute.addressLine1,
        addressLine2: this.institute.addressLine2,
        contactEmail: this.institute.contactEmail,
        phone: this.institute.phone,
        isActive: this.institute.isActive === true
      });
    }
  }

  updateInstitute() {
    if (this.institueForm.invalid) {
      this.alert.error('Please fill all required fields');
      return;
    }

    const form = this.institueForm.value;
    const payload = {
      tenantName: form.name,
      tenantCode: form.code,
      entCity: form.city,
      entState: form.state,
      entZip: form.pincode,
      entAddress1: form.addressLine1,
      entAddress2: form.addressLine2,
      email: form.contactEmail,
      phone: form.phone,
      status: form.isActive ? 'Active' : 'Inactive',
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(payload, 'ims', 'update').subscribe({
      next: (res: any) => {
        if (!res.status) {
          this.alert.error(res.message || 'Failed to update institute');
          return;
        }

        this.alert.success('Institute updated successfully');
        this.router.navigate(['/app/org-master/institute']);
      },
      error: () => this.alert.error('Server error while updating institute')
    });
  }
}
