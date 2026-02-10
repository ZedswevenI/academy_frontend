import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { ActivatedRoute, Router } from '@angular/router';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();


@Component({
  selector: 'app-view-pro',
  standalone: false,
  templateUrl: './view-pro.component.html',
  styleUrl: './view-pro.component.scss'
})
export class ViewProComponent {
  loading: boolean = false;
  program: any = null;
  programId = '';
  rowData: any;
  v: any;

  constructor(
    private breadcrump: BredcrumpService, 
    private commonApi: CommonapiService, 
    private alert: AlertService,
    private route: ActivatedRoute,
    private router: Router) {
    this.breadcrump.set([{ label: 'Org Master' }, { label: 'Program', link: '/app/org-master/program' }, { label: 'View' }]);

    const navigation = history.state;
    this.rowData = navigation?.rowData;
  }

  ngOnInit(): void {
   this.programId = safeTrim(this.route.snapshot.paramMap.get('programId'));
  
  if (!this.programId) {
    this.alert.error('Program ID missing');
    this.router.navigate(['/app/org-master/program']);
    return;
  };
  
  this.loadProgram();
  }

  loadProgram() {
    this.loading = true;
    // const recId = this.rowData?.recId || this.rowData?._id;
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      recId: this.programId,
    };
    this.commonApi.fetchData(payload, 'ims', 'program/view').subscribe({
      next: (res: any) => {
        this.loading = false;
        this.program = res?.data || { subjects: [] } || null;
        console.log(this.program)
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Failed to load program');
      },
    });
  }
}
