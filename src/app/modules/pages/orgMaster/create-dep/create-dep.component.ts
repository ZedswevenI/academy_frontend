import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-dep',
  standalone: false,
  templateUrl: './create-dep.component.html',
  styleUrl: './create-dep.component.scss'
})
export class CreateDepComponent {
@Input() isEditMode = false;
@Input() rowData: any;
@Output() close = new EventEmitter<void>();
@Output() save = new EventEmitter<any>();

centerForm!: FormGroup;

constructor(
  private fb: FormBuilder,
  private commonApi: CommonapiService,
  private alert: AlertService,
  private router: Router
) {}

ngOnInit() {
  this.centerForm = this.fb.group({
    departmentName: ['', [Validators.required]],
    departmentCode: ['', [Validators.required]],
    isActive: [false]
  });

  if (this.isEditMode && this.rowData) {
    this.centerForm.patchValue(this.rowData);
  }
}

submit() {
  // if (this.centerForm.invalid) return;
  // this.save.emit(this.centerForm.value);

   console.log('Form value before create:', this.centerForm.value);

    if (this.isEditMode) {
      const form = this.centerForm.value;
      const payload = {
        ...form,
        entiId: localStorage.getItem('tenantId'),
      };
      this.commonApi.fetchData(payload, 'ims', 'edit').subscribe({
        next: (res: any) => {
          if (!res.status) {
            this.alert.error(res.message || 'Failed to update department');
            return;
          }
          this.alert.success('Department updated successfully');
          this.router.navigate(['/app/org-master/center']);
        },
        error: () => this.alert.error('Server error while updating Department')
      });
    } else {
      const form = this.centerForm.value;
      const payload = {
        departmentName: form.departmentName,
        departmentCode: form.departmentCode,
        isActive: form.isActive ? 'Active' : 'Inactive',
        entiId: localStorage.getItem('tenantId'),
      };
      this.commonApi.fetchData(payload, 'ims', 'create').subscribe({
        next: (res: any) => {
          console.log('create:', res)
          if (!res.status) {
            this.alert.error(res.message || 'Failed to create Department');
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
