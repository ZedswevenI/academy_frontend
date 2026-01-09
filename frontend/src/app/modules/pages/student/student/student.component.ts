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
    { key: 'studentName', label: 'Student Name', sortable: true },
    { key: 'batch', label: 'Batch', sortable: true },
    { key: 'className', label: 'Class', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;


  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Student' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { studentName: 'Arun Kumar', batch: 'Batch A', className: 'Angular Fundamentals', status: 'Active' },
      { studentName: 'Priya Sharma', batch: 'Batch A', className: 'Angular Fundamentals', status: 'Active' },
      { studentName: 'Rohit Verma', batch: 'Batch A', className: 'Angular Fundamentals', status: 'Active' },
      { studentName: 'Anitha R', batch: 'Batch A', className: 'Angular Fundamentals', status: 'Inactive' },
      { studentName: 'Suresh M', batch: 'Batch B', className: 'Python Basics', status: 'Active' },
      { studentName: 'Deepak T', batch: 'Batch B', className: 'Python Basics', status: 'Active' },
      { studentName: 'Nisha K', batch: 'Batch B', className: 'Python Basics', status: 'Inactive' },
      { studentName: 'Rakesh P', batch: 'Batch B', className: 'Python Basics', status: 'Active' },
      { studentName: 'Meera S', batch: 'Batch C', className: 'Java OOPS', status: 'Active' },
      { studentName: 'Vikram L', batch: 'Batch C', className: 'Java OOPS', status: 'Inactive' },
      { studentName: 'Kavya N', batch: 'Batch C', className: 'Java OOPS', status: 'Active' },
      { studentName: 'Sanjay R', batch: 'Batch C', className: 'Java OOPS', status: 'Active' },
      { studentName: 'Anjali P', batch: 'Batch D', className: 'HTML & CSS', status: 'Active' },
      { studentName: 'Rahul S', batch: 'Batch D', className: 'HTML & CSS', status: 'Inactive' },
      { studentName: 'Tanya V', batch: 'Batch D', className: 'HTML & CSS', status: 'Active' },
      { studentName: 'Manoj K', batch: 'Batch D', className: 'HTML & CSS', status: 'Active' },
      { studentName: 'Priyanka J', batch: 'Batch E', className: 'React Basics', status: 'Active' },
      { studentName: 'Amit B', batch: 'Batch E', className: 'React Basics', status: 'Inactive' },
      { studentName: 'Sneha M', batch: 'Batch E', className: 'React Basics', status: 'Active' },
      { studentName: 'Vijay R', batch: 'Batch E', className: 'React Basics', status: 'Active' },
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
}
