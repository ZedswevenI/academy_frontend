import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-add-center',
  standalone: false,
  templateUrl: './add-center.component.html',
  styleUrl: './add-center.component.scss'
})
export class AddCenterComponent {

  centerForm!: FormGroup;
  isEditMode: boolean = false;
  rowData: any;

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router) {
    const navigation = history.state;
    this.isEditMode = navigation?.isEditMode ?? false;
    this.rowData = navigation?.rowData;

  }

  ngOnInit(): void {
    console.log('Received center:', this.rowData);
    this.breadcrump.set([{ label: 'Org Master' }, { label: 'Center', link: '/app/org-master/center' }, { label: this.isEditMode ? 'Edit' : 'Add' }])

    this.centerForm = this.fb.group({
      centerName: ['', [Validators.required]],
      centerCode: ['', [Validators.required]],
      email: [''],
      phone: ['', [Validators.required]],
      cntatName: ['', [Validators.required]],
      address1: ['', [Validators.required]],
      address2: [''],
      area: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      country: [''],
      pincode: ['', [Validators.required]],
      status: [false],
    });

    if (this.rowData) {
      this.centerForm.patchValue({
        centerName: this.rowData.centerName,
        centerCode: this.rowData.centerCode,
        email: this.rowData.email,
        phone: this.rowData.phone,
        cntatName: this.rowData.cntatName,
        address1: this.rowData.address1,
        address2: this.rowData.address2,
        area: this.rowData.area,
        city: this.rowData.city,
        state: this.rowData.state,
        country: this.rowData.country,
        pincode: this.rowData.pincode,
        status: this.rowData.status,
      });
    }

  }

  addCenter() {
    console.log('Form value before create:', this.centerForm.value);

    if (this.isEditMode) {
      const form = this.centerForm.value;
      const editingId = this.rowData.recId || this.rowData._id;
      const payload = {
        ...form,
        entiId: localStorage.getItem('tenantId'),
        recId: editingId
      };
      this.commonApi.fetchData(payload, 'ims/center', 'edit').subscribe({
        next: (res: any) => {
          if (!res.status) {
            this.alert.error(res.message || 'Failed to update center');
            return;
          }
          this.alert.success('Center updated successfully');
          this.router.navigate(['/app/org-master/center']);
        },
        error: () => this.alert.error('Server error while updating center')
      });

    } else {
      const form = this.centerForm.value;
      const payload = {
        centerName: form.centerName,
        centerCode: form.centerCode,
        email: form.email,
        phone: form.phone,
        contactName: form.cntatName,
        address1: form.address1,
        address2: form.address2,
        area: form.area,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        status: form.isActive ? 'Active' : 'Inactive',
        entiId: localStorage.getItem('tenantId'),
      };
      this.commonApi.fetchData(payload, 'ims/center', 'create').subscribe({
        next: (res: any) => {
          console.log('create:', res)
          if (!res.status) {
            this.alert.error(res.message || 'Failed to create center');
            return;
          }
          this.alert.success('Center created successfully');
          this.router.navigate(['/app/org-master/center']);
        },
        error: () => this.alert.error('Server error while Create center')
      });
    }

  }

}
