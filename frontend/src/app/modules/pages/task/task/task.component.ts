import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task',
  standalone: false,
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent {

  columnsArray = [
    { key: 'task', label: 'Task Name', sortable: true },
    { key: 'assign', label: 'Assigned Date', sortable: true },
    { key: 'due', label: 'Due Date', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
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
      callback: (row: any) => this.viewTask(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Task' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { task: 'Prepare Lesson Plan', assign: '2025-01-01', due: '2025-01-05', status: 'Completed' },
      { task: 'Upload Study Materials', assign: '2025-01-02', due: '2025-01-06', status: 'In Progress' },
      { task: 'Evaluate Assignments', assign: '2025-01-03', due: '2025-01-08', status: 'Pending' },
      { task: 'Conduct Unit Test', assign: '2025-01-04', due: '2025-01-10', status: 'Not Completed' },
      { task: 'Submit Attendance Report', assign: '2025-01-05', due: '2025-01-07', status: 'Completed' },
      { task: 'Prepare Question Bank', assign: '2025-01-06', due: '2025-01-12', status: 'In Progress' },
      { task: 'Parent Meeting Preparation', assign: '2025-01-07', due: '2025-01-11', status: 'Pending' },
      { task: 'Update Student Performance', assign: '2025-01-08', due: '2025-01-13', status: 'In Progress' },
      { task: 'Curriculum Review', assign: '2025-01-09', due: '2025-01-15', status: 'Pending' },
      { task: 'Final Exam Paper Setting', assign: '2025-01-10', due: '2025-01-18', status: 'Completed' }
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

  viewTask(row: any) {
    this.router.navigate(['/app/task/view'])
  }
}
