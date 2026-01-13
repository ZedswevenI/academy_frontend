import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-view',
  standalone: false,
  templateUrl: './student-view.component.html',
  styleUrl: './student-view.component.scss'
})
export class StudentViewComponent {
  isPerformance: boolean = false;

  columnsArray = [
    { key: 'batch', label: 'Batch Code', sortable: false },
    { key: 'enroll', label: 'Enrolment', sortable: false },
    { key: 'name', label: 'Name', sortable: false },
    { key: 'ass', label: 'Ass', sortable: false },
    { key: 'test', label: 'Test', sortable: false },
    { key: 'net', label: 'Net', sortable: false }
  ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Student', link: '/app/student' }, { label: 'View' }])
  }

  ngOnInit(): void {

    this.originalData = [
      { batch: 'Batch A', enroll: 'ENR2001', name: 'Priya Sharma', ass: '1.98', test: '9.71', net: '2.71' }
    ];

    this.loadTableData({ page: 1, pageSize: 5 });
    
    this.isPerformance = history.state?.isPerformance ?? false;
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
}
