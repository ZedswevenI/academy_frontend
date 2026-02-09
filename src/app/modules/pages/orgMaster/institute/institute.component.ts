import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { InstituteService } from '../../../../service/admin/orgmaster/institution.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-institute',
  standalone: false,
  templateUrl: './institute.component.html',
  styleUrl: './institute.component.scss'
})
export class InstituteComponent {
  instituteInfo: any = {};

  constructor(
    private breadcrump: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router) {
    this.breadcrump.set([{ label: 'Org Master' }, { label: 'Institute' }])
  }

  ngOnInit(): void {
    this.loadInstitute();
  }

  // =========================
  // VIEW
  // =========================
  loadInstitute(): void {
    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'ims', `view`).subscribe({
      next: (res: any) => {
        if (res?.status === false) {
          this.alert.error(res?.message || 'Failed to load institute');
          return;
        }

        const d = res.data;

        // Map API → UI object
        this.instituteInfo = {
          name: d.tenantName,
          code: d.tenantCode,
          city: d.entCity,
          state: d.entState,
          pincode: d.entZip,
          addressLine1: d.entAddress1,
          addressLine2: d.entAddress2,
          contactEmail: d.email,
          phone: d.phone,
          isActive: d.status === 'Active'
        };
      },
      error: () => {
        this.alert.error('Server error while loading institute'),
          this, this.router.navigate(['/app/org-master/institute'])
      }
    });
  }

  editInstitute(institute: any) {
    this.router.navigate(['/app/org-master/institute/edit'], { state: { institute: this.instituteInfo } });
  }
}
