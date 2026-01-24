import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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

  
  program_options = [
    {label: 'All', value: 'All'},
    {label: 'Program1', value: 'Program1'},
    {label: 'Program2', value: 'Program2'},
    {label: 'Program3', value: 'Program3'},
    {label: 'Program4', value: 'Program4'},
    {label: 'Program5', value: 'Program5'},
    {label: 'Program6', value: 'Program6'},
  ]

  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]

  center_options = [
    {label: 'All', value: 'All'},
    {label: 'Coimbatore - Sub Main', value: 'Coimbatore - Sub Main'},
  ]

  columnsArray = [
    { key: 'batch', label: 'Batch', sortable: true },
    { key: 'center', label: 'Center', sortable: true },
    { key: 'week', label: 'Week Starting', sortable: true },
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

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Time Table' }]);
  }

  ngOnInit(): void {
    this.timetableForm = this.fb.group({
      filter: ['', [Validators.required]]
    })

    this.originalData = [
      { batch: '9BATCH', center: '64', week: '30/03/2026', phase: 'Phase 1', status: 'Active' },
    ];

    this.loadTableData({ page: 1, pageSize: 5 })
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.originalData];

    //  SEARCH
    if (req.search) {
      const value = req.search.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(value)
        )
      );
    }

    //  SORT
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

  viewTimetable(row: any){
    this.router.navigate(['/app/timetable/view'])
  }
}
