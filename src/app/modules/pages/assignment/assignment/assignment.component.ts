import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-assignment',
  standalone: false,
  templateUrl: './assignment.component.html',
  styleUrl: './assignment.component.scss'
})
export class AssignmentComponent {
  columnsArray = [
    { key: 'assignment', label: 'Assignment Title', sortable: true },
    { key: 'due', label: 'Due Date', sortable: true },
    { key: 'count', label: 'Submission Count', sortable: false },
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
      callback: (row: any) => this.viewAss(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Assignment' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { assignment: 'Math Homework – Algebra Basics', due: '15-01-2026', count: '18 / 40' },
      { assignment: 'Science Project – Human Digestive System', due: '18-01-2026', count: '22 / 40' },
      { assignment: 'English Essay – My Favorite Book', due: '20-01-2026', count: '19 / 40' },
      { assignment: 'Computer Lab – HTML & CSS Basics', due: '22-01-2026', count: '25 / 40' },
      { assignment: 'Social Studies – Indian Freedom Movement', due: '25-01-2026', count: '21 / 40' },
      { assignment: 'Physics Worksheet – Laws of Motion', due: '27-01-2026', count: '16 / 40' },
      { assignment: 'Chemistry Assignment – Periodic Table', due: '28-01-2026', count: '20 / 40' },
      { assignment: 'Biology Notes – Plant Reproduction', due: '30-01-2026', count: '23 / 40' },
      { assignment: 'Mathematics Test – Fractions & Decimals', due: '02-02-2026', count: '24 / 40' },
      { assignment: 'Computer Science – JavaScript Basics', due: '05-02-2026', count: '17 / 40' }
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

  viewAss(row:any){
    this.router.navigate(['/app/assignment/view'])
  }
}
