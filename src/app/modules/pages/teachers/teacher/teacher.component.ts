import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teacher',
  standalone: false,
  templateUrl: './teacher.component.html',
  styleUrl: './teacher.component.scss'
})
export class TeacherComponent {

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  columnsArray = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'teacherName', label: 'Teacher Name', sortable: true },
    { key: 'join', label: 'Joined On', sortable: true },
    { key: 'phone', label: 'Phone', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'handle', label: 'Classes Handle', sortable: true },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewTeacher(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Teachers' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { id: 'Z7I010', teacherName: 'Anita Sharma', join: '12-06-2026', phone: '9876543210', subject: 'Mathematics', handle: 'Class 8, Class 9' },
      { id: 'Z7I005', teacherName: 'Rohit Verma', join: '03-11-2021', phone: '9123456780', subject: 'Physics', handle: 'Class 11, Class 12' },
      { id: 'Z7I008', teacherName: 'Meena Iyer', join: '18-01-2023', phone: '9988776655', subject: 'Chemistry', handle: 'Class 10' },
      { id: 'Z7I002', teacherName: 'Suresh Kumar', join: '25-07-2020', phone: '9090909090', subject: 'Biology', handle: 'Class 11' },
      { id: 'Z7I006', teacherName: 'Priya Nair', join: '09-03-2022', phone: '9345678123', subject: 'English', handle: 'Class 6, Class 7' },
      { id: 'Z7I001', teacherName: 'Arjun Patel', join: '14-09-2019', phone: '9786541230', subject: 'History', handle: 'Class 8' },
      { id: 'Z7I009', teacherName: 'Kavitha Reddy', join: '01-05-2023', phone: '9898989898', subject: 'Geography', handle: 'Class 9' },
      { id: 'Z7I004', teacherName: 'Manoj Singh', join: '20-02-2021', phone: '9567123456', subject: 'Computer Science', handle: 'Class 10, Class 11' },
      { id: 'Z7I003', teacherName: 'Deepa Joshi', join: '05-12-2020', phone: '9012345678', subject: 'Economics', handle: 'Class 12' },
      { id: 'Z7I007', teacherName: 'Vikram Rao', join: '17-08-2022', phone: '9871234567', subject: 'Tamil', handle: 'Class 6, Class 8' }
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

  viewTeacher(row: any) {
    this.router.navigate(['/app/teacher/view'])
  }

}
