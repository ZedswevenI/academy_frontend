import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-performance-list',
  standalone: false,
  templateUrl: './performance-list.component.html',
  styleUrl: './performance-list.component.scss'
})
export class PerformanceListComponent {
  Form!: FormGroup;
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
  subject_options = [
    { label: 'Maths', value: 'Maths' },
    { label: 'Physics', value: 'Physics' },
    { label: 'Chemistry', value: 'Chemistry' },
    { label: 'Biology', value: 'Biology' }
  ]
  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]

  columnsArray = [
    { key: 'id', label: 'Enrolment nNumber', sortable: true },
    { key: 'name', label: 'Student Name', sortable: true },
    { key: 'batch', label: 'Batch Code', sortable: true },
    { key: 'class', label: 'Class', sortable: false },
    { key: 'sub', label: 'Subject', sortable: false },
    { key: 'ass', label: 'Assgn', sortable: false },
    { key: 'test', label: 'Test', sortable: false },
    { key: 'net', label: 'Net', sortable: false }
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewPerf(row)
    },
  ]
  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Student Performance' }])
  }

  ngOnInit(): void {
    this.Form = this.fb.group({
      class: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      batch: ['', [Validators.required]]
    });

    this.originalData = [
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2001', name: 'Aarav Kumar', ass: 1.98, test: 9.71, net: 2.71 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2002', name: 'Diya Sharma', ass: 2.19, test: 6.82, net: 2.61 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2003', name: 'Rohan Patel', ass: 0.97, test: 3.06, net: 1.14 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2004', name: 'Ananya Iyer', ass: 1.94, test: 7.03, net: 2.43 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2005', name: 'Karthik Raj', ass: 1.75, test: 7.23, net: 2.25 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2006', name: 'Meera Nair', ass: 2.5, test: 6.36, net: 2.86 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2007', name: 'Sanjay Verma', ass: 0.43, test: 8.74, net: 1.19 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2008', name: 'Pooja Singh', ass: 1.98, test: 9.71, net: 2.71 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2009', name: 'Rahul Das', ass: 2.19, test: 6.82, net: 2.61 },
      { batch: 'Batch A', sub: 'Maths', class: 'Class 7', id: 'ENR2010', name: 'Nithya Krishnan', ass: 0.97, test: 3.06, net: 1.14 }
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

  viewPerf(row: any) {
    this.router.navigate(['/app/student/view'], { state: { isPerformance: true }})
  }
}
