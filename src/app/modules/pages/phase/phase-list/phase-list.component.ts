import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { AbstractControl } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-phase-list',
  standalone: false,
  templateUrl: './phase-list.component.html',
  styleUrl: './phase-list.component.scss',
})
export class PhaseListComponent {
  phaseForm!: FormGroup;
  isProceed: boolean = false;
  loading: boolean = false;
  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  class_options = [
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: ' 10', value: 10 },
    { label: '11', value: 11 },
    { label: '12', value: 12 },
  ];
  subject_options = [];
  columnsArray = [
    { key: 'phase', label: 'Phase', sortable: false },
    { key: 'chap', label: 'Chapter', sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewPerf(row),
    },
  ];
  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
  ) {
    this.breadcrump.set([{ label: 'Phase Part' }]);
  }

  ngOnInit(): void {
    this.phaseForm = this.fb.group({});
    this.loadSubjects();
  }

  loadSubjects() {
    const entiId = localStorage.getItem('tenantId');
    this.loading = true;
    this.commonApi.fetchData(
      { entiId },
      'ims',
      'subject/list?list=full',
    ).subscribe({
      next: (res: any) => {
        this.subject_options = res.data
      },
      error : (err : any) =>{}
    })
  }

  onProceed() {
    this.isProceed = true;
  }

  filterValidator(control: AbstractControl) {
    const val = control.value;
    if (!val || !val.value1 || !val.value2 || !val.value3) {
      return { required: true };
    }
    return null;
  }

  viewPerf(row: any) {}
}
