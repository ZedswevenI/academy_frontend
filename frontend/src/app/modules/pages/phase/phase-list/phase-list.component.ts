import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-phase-list',
  standalone: false,
  templateUrl: './phase-list.component.html',
  styleUrl: './phase-list.component.scss'
})
export class PhaseListComponent {
  phaseForm!: FormGroup;
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
    { key: 'faculty', label: 'Faculty Name', sortable: true },
    { key: 'program', label: 'Program Code', sortable: false },
    { key: 'phase', label: 'Phase', sortable: false },
    { key: 'seq', label: 'Seq', sortable: false },
    { key: 'chap', label: 'Chapter', sortable: false },
    { key: 'cc', label: 'CC', sortable: false },
    { key: 'hr', label: 'Hrs', sortable: false },
    { key: 'mpt', label: 'MPT', sortable: false }
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
    this.breadcrump.set([{ label: 'Phase Part' }])
  }

  ngOnInit(): void {
    this.phaseForm = this.fb.group({
      class: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      batch: ['', [Validators.required]]
    });

    this.originalData = [
      { faculty: 'Dr. A. Kumar', program: 'CS101', phase: '1', seq: '01', chap: 'Introduction', cc: 'CC1', hr: 2, mpt: 'Yes' },
      { faculty: 'Prof. S. Reddy', program: 'CS102', phase: '1', seq: '02', chap: 'Data Structures', cc: 'CC2', hr: 3, mpt: 'No' },
      { faculty: 'Dr. M. Sharma', program: 'EE201', phase: '2', seq: '03', chap: 'Circuits', cc: 'CC1', hr: 4, mpt: 'Yes' },
      { faculty: 'Prof. N. Gupta', program: 'ME101', phase: '1', seq: '04', chap: 'Thermodynamics', cc: 'CC2', hr: 3, mpt: 'No' },
      { faculty: 'Dr. R. Iyer', program: 'CS101', phase: '2', seq: '05', chap: 'Algorithms', cc: 'CC1', hr: 2, mpt: 'Yes' },
      { faculty: 'Prof. K. Singh', program: 'EE201', phase: '1', seq: '06', chap: 'Signals', cc: 'CC2', hr: 3, mpt: 'No' },
      { faculty: 'Dr. L. Fernandes', program: 'ME101', phase: '2', seq: '07', chap: 'Dynamics', cc: 'CC1', hr: 2, mpt: 'Yes' },
      { faculty: 'Prof. P. Rao', program: 'CS102', phase: '2', seq: '08', chap: 'Databases', cc: 'CC2', hr: 3, mpt: 'No' },
      { faculty: 'Dr. V. Menon', program: 'CS101', phase: '1', seq: '09', chap: 'OOP Concepts', cc: 'CC1', hr: 2, mpt: 'Yes' },
      { faculty: 'Prof. S. Desai', program: 'EE201', phase: '2', seq: '10', chap: 'Control Systems', cc: 'CC2', hr: 4, mpt: 'No' },
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

  viewPerf(row: any) {}
}
