import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-student',
  standalone: false,
  templateUrl: './student.component.html',
  styleUrl: './student.component.scss'
})
export class StudentComponent {

  columnsArray = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'studentName', label: 'Student Name', sortable: true },
    { key: 'batch', label: 'Batch', sortable: true },
    { key: 'phone', label: 'Phone', sortable: true },
    { key: 'parent', label: 'Parent Phone', sortable: true },
    { key: 'avg', label: 'Performance Avg', sortable: true },
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
      callback: (row: any) => this.viewStudent(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-comments',
      tooltip: 'Chat',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.chatStudent(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Student' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { id: 1, studentName: 'Arun Kumar', batch: 'Batch A', phone: '9876543210', parent: '9876500001', avg: 78 },
      { id: 2, studentName: 'Priya Sharma', batch: 'Batch A', phone: '9876543211', parent: '9876500002', avg: 85 },
      { id: 3, studentName: 'Rahul Verma', batch: 'Batch B', phone: '9876543212', parent: '9876500003', avg: 72 },
      { id: 4, studentName: 'Sneha Iyer', batch: 'Batch B', phone: '9876543213', parent: '9876500004', avg: 88 },
      { id: 5, studentName: 'Karthik Raj', batch: 'Batch C', phone: '9876543214', parent: '9876500005', avg: 91 },

      { id: 6, studentName: 'Ananya Gupta', batch: 'Batch A', phone: '9876543215', parent: '9876500006', avg: 84 },
      { id: 7, studentName: 'Vikram Singh', batch: 'Batch C', phone: '9876543216', parent: '9876500007', avg: 76 },
      { id: 8, studentName: 'Divya Patel', batch: 'Batch B', phone: '9876543217', parent: '9876500008', avg: 89 },
      { id: 9, studentName: 'Suresh Reddy', batch: 'Batch A', phone: '9876543218', parent: '9876500009', avg: 68 },
      { id: 10, studentName: 'Meena Joshi', batch: 'Batch C', phone: '9876543219', parent: '9876500010', avg: 92 },

      { id: 11, studentName: 'Ajay Nair', batch: 'Batch B', phone: '9876543220', parent: '9876500011', avg: 74 },
      { id: 12, studentName: 'Pooja Malhotra', batch: 'Batch A', phone: '9876543221', parent: '9876500012', avg: 86 },
      { id: 13, studentName: 'Rohit Mehta', batch: 'Batch C', phone: '9876543222', parent: '9876500013', avg: 79 },
      { id: 14, studentName: 'Kavya Menon', batch: 'Batch B', phone: '9876543223', parent: '9876500014', avg: 90 },
      { id: 15, studentName: 'Nitin Chauhan', batch: 'Batch A', phone: '9876543224', parent: '9876500015', avg: 71 },

      { id: 16, studentName: 'Aishwarya Rao', batch: 'Batch C', phone: '9876543225', parent: '9876500016', avg: 87 },
      { id: 17, studentName: 'Manoj Pandey', batch: 'Batch B', phone: '9876543226', parent: '9876500017', avg: 66 },
      { id: 18, studentName: 'Neha Kulkarni', batch: 'Batch A', phone: '9876543227', parent: '9876500018', avg: 93 },
      { id: 19, studentName: 'Sanjay Mishra', batch: 'Batch C', phone: '9876543228', parent: '9876500019', avg: 75 },
      { id: 20, studentName: 'Ritika Bose', batch: 'Batch B', phone: '9876543229', parent: '9876500020', avg: 82 }
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

  viewStudent(row: any) { }
  chatStudent(row: any) { }
}
