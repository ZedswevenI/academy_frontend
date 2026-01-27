import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-ptm',
  standalone: false,
  templateUrl: './ptm.component.html',
  styleUrl: './ptm.component.scss'
})
export class PtmComponent {
  ptmForm!: FormGroup;
  isProceed: boolean = false;

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' }
  ];
  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]
  student_options = [
    { label: 'Arun Kumar', value: 'Arun Kumar' },
    { label: 'Divya Sharma', value: 'Divya Sharma' },
    { label: 'Rahul Verma', value: 'Rahul Verma' },
    { label: 'Sneha Patel', value: 'Sneha Patel' },
    { label: 'Karthik R', value: 'Karthik R' }
  ];

  columnsArray = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'class', label: 'Class', sortable: true },
    { key: 'time', label: 'Timing', sortable: false },
    { key: 'teacher', label: 'Incharge', sortable: true },
    { key: 'mode', label: 'Mode', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewptm(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Ptm' }])
  }

  ngOnInit(): void {
    this.ptmForm = this.fb.group({
      filter: [null, [this.filterValidator]]
    });

    this.originalData = [
      { date: '10-Jan-2026', class: '6th', time: '10:00am  - 4:00pm', teacher: 'Mr. R. Kumar', mode: 'Offline', status: 'Completed' },
      { date: '12-Jan-2026', class: '7th', time: '10:00am  - 4:00pm', teacher: 'Mr. R. Kumar', mode: 'Offline', status: 'Completed' },
      { date: '14-Jan-2026', class: '8th', time: '10:00am  - 4:00pm', teacher: 'Ms. Anitha', mode: 'Online', status: 'Completed' },
      { date: '15-Jan-2026', class: '9th', time: '10:00am  - 4:00pm', teacher: 'Ms. Anitha', mode: 'Offline', status: 'Completed' },
      { date: '18-Jan-2026', class: '10th', time: '10:00am  - 4:00pm', teacher: 'Mr. Prakash', mode: 'Offline', status: 'Completed' },
      { date: '20-Jan-2026', class: '11th', time: '10:00am  - 4:00pm', teacher: 'Mr. Prakash', mode: 'Online', status: 'Completed' },
      { date: '22-Jan-2026', class: '12th', time: '10:00am  - 4:00pm', teacher: 'Ms. Revathi', mode: 'Offline', status: 'Scheduled' },
    ];

    this.loadTableData({ page: 1, pageSize: 5 });
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.originalData];

    // SEARCH
    if (req.search) {
      const value = req.search.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(value)
        )
      );
    }

    // SORT
    if (req.sortKey) {
      filtered.sort((a, b) => {
        const x = a[req.sortKey!];
        const y = b[req.sortKey!];
        return req.sortDirection === 'asc'
          ? String(x).localeCompare(String(y))
          : String(y).localeCompare(String(x));
      });
    }

    // PAGINATION
    this.totalRecords = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    const end = start + req.pageSize;
    this.dataArray = filtered.slice(start, end);
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

  viewptm(row: any) { }
}
