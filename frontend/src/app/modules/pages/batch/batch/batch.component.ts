import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-batch',
  standalone: false,
  templateUrl: './batch.component.html',
  styleUrl: './batch.component.scss'
})
export class BatchComponent {
  columnsArray = [
    { key: 'batchName', label: 'Batch Name', sortable: false },
    { key: 'students', label: 'Students', sortable: false },
    { key: 'timing', label: 'Timing', sortable: false },
  ];

  // dataArray = [
  //   { batchName: 'Batch A', students: 25, timing: '9:00 AM - 10:30 AM' },
  //   { batchName: 'Batch B', students: 30, timing: '11:00 AM - 12:30 PM' },
  //   { batchName: 'Batch C', students: 20, timing: '2:00 PM - 3:30 PM' },
  // ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      // hoverColor: '#0066FF',
      callback: (row: any) => this.viewlocation(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      // hoverColor: '#0066FF',
      callback: (row: any) => this.viewlocation(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular  fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#D42B2B',
      callback: (row: any) => this.viewlocation(row)
    },
  ]

  constructor(private breadcrumb: BredcrumpService) {
    this.breadcrumb.set([{ label: 'Batch' }]);
  }

  ngOnInit(): void {
    this.originalData = [
      { batchName: 'Batch A', students: 25, timing: '9:00 AM - 10:30 AM' },
      { batchName: 'Batch B', students: 30, timing: '11:00 AM - 12:30 PM' },
      { batchName: 'Batch C', students: 20, timing: '2:00 PM - 3:30 PM' },
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

    // 🔍 SEARCH
    if (req.search) {
      const value = req.search.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(value)
        )
      );
    }

    // 🔁 SORT
    if (req.sortKey) {
      filtered.sort((a, b) => {
        const x = a[req.sortKey!];
        const y = b[req.sortKey!];
        return req.sortDirection === 'asc'
          ? String(x).localeCompare(String(y))
          : String(y).localeCompare(String(x));
      });
    }

    // 📄 PAGINATION
    this.totalRecords = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    const end = start + req.pageSize;
    this.dataArray = filtered.slice(start, end);
  }

  viewlocation(row: any) { }
}
