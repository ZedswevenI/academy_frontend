import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-timetable',
  standalone: false,
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss'
})
export class TimetableComponent {
  timetableForm!: FormGroup;
  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  loading: boolean = false;

  program_options = []
  batch_options = []
  center_options = []

  columnsArray = [
    { key: 'batchCode', label: 'Batch', sortable: true },
    { key: 'centerCode', label: 'Center', sortable: true },
    { key: 'wkStartOn', label: 'Week Starting', sortable: true },
    { key: 'phase', label: 'Phase', sortable: true },
    { key: 'status', label: 'Status', sortable: true }
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewTimetable(row)
    },
  ]

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService) {
    this.breadcrump.set([{ label: 'Time Table' }]);
  }

  ngOnInit(): void {
    this.timetableForm = this.fb.group({
      filter: ['', [Validators.required]]
    })

    this.loadAllLookupsAndInit();
  }

  // program, batch, center List
  loadAllLookupsAndInit() {
    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.loading = true;

    forkJoin({
      program: this.commonApi.fetchData(body, 'ims', 'program/list?list=full'),
      batch: this.commonApi.fetchData(body, 'batch', 'list?list=full'),
      center: this.commonApi.fetchData(body, 'ims', 'center/list?list=full'),
    }).subscribe({
      next: ({ program, batch, center }) => {
        this.program_options = program.data || [];
        this.batch_options = batch.data || [];
        this.center_options = center.data || [];
      },
      error: (err) => {
        this.loading = false;
        this.alert.error(`Unable to load initial data!`);
      }
    });
  }

  fetchTableData(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  }) {
    this.loading = true;

    // Pagination & Sort
    let sortParam = '';
    if (params.sortKey) {
      sortParam =
        params.sortDirection === 'desc'
          ? `-${params.sortKey}`
          : params.sortKey;
    }

    const query: any = {
      page: params.page,
      limit: params.pageSize
    };
    if (sortParam) query.sort = sortParam;
    if (params.search) query.search = params.search;

    //filter (optional)
    // if (this.statusFilter && this.statusFilter !== 'all') {
    //   query.status = this.statusFilter;
    // }
    // if (this.selectedProgram) {
    //   query.programId = this.selectedProgram;
    // }
    // if (this.selectedCenter) {
    //   query.centerId = this.selectedCenter;
    // }

    // Build query string
    const queryString = Object.keys(query)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
      )
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'timetable', `list?${queryString}`).subscribe({
      next: (res: any) => {
        this.dataArray = res.data;
        this.totalRecords = res?.count || 0;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.alert.error('Error loading admissions');
      }
    });
  }


  viewTimetable(row: any) {
    // this.router.navigate(['/app/timetable/view'])
    const item = row?._raw || row;
    this.router.navigate(['/app/timetable/view', item._id]);
  }
}
