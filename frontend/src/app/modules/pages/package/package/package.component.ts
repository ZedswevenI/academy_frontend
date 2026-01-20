import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-package',
  standalone: false,
  templateUrl: './package.component.html',
  styleUrl: './package.component.scss'
})
export class PackageComponent {
  packageForm!: FormGroup;
  isProceed: boolean = false;

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
    { key: 'title', label: 'Title', sortable: true },
    { key: 'due', label: 'Due Date', sortable: true },
    { key: 'class', label: 'Class', sortable: false },
    { key: 'batch', label: 'Batch', sortable: false },
    { key: 'desc', label: 'Description', sortable: false }
  ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewPack(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Package' }])
  }

  ngOnInit(): void {
    this.packageForm = this.fb.group({
      class: ['', [Validators.required]],
      batch: ['', [Validators.required]],
      student: ['', [Validators.required]]
    });

    this.originalData = [
      { title: 'Math Assignment 1', due: '2026-01-15', class: '10', batch: 'A', desc: 'Algebra and linear equations practice' },
      { title: 'Science Project', due: '2026-01-18', class: '9', batch: 'B', desc: 'Prepare a working model on renewable energy' },
      { title: 'English Essay', due: '2026-01-20', class: '8', batch: 'A', desc: 'Write an essay on environmental protection' },
      { title: 'History Homework', due: '2026-01-22', class: '10', batch: 'C', desc: 'Answer questions from Chapter 5' },
      { title: 'Computer Lab Task', due: '2026-01-25', class: '11', batch: 'A', desc: 'Create a simple HTML webpage' },
      { title: 'Physics Numericals', due: '2026-01-27', class: '12', batch: 'B', desc: 'Solve motion-related numerical problems' },
      { title: 'Chemistry Worksheet', due: '2026-01-28', class: '11', batch: 'C', desc: 'Periodic table and atomic structure worksheet' },
      { title: 'Geography Map Work', due: '2026-01-30', class: '9', batch: 'A', desc: 'Mark rivers and mountains on the map' },
      { title: 'Tamil Literature', due: '2026-02-02', class: '8', batch: 'B', desc: 'Read and summarize the given poem' },
      { title: 'Mock Test Preparation', due: '2026-02-05', class: '12', batch: 'A', desc: 'Revise all chapters for mock examination' }
    ]

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

  viewPack(row: any) { }
}
