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
  // Attendance
  columnsArray = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'session', label: 'Session', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  // Assignment 
  columnsArray1 = [
    { key: 'title', label: 'Title', sortable: false },
    { key: 'sub', label: 'Subject', sortable: false },
    { key: 'due', label: 'Due Date', sortable: false },
    { key: 'status', label: 'Status', sortable: false }
  ];

  dataArray1: any[] = [];
  assignmentData: any[] = [];
  totalRecords1 = 0;

  // Exam
  columnsArray2 = [
    { key: 'exam', label: 'Exam', sortable: false },
    { key: 'date', label: 'Date', sortable: false },
    { key: 'score', label: 'Score', sortable: false },
    { key: 'res', label: 'Result', sortable: false }
  ];

  dataArray2: any[] = [];
  examData: any[] = [];
  totalRecords2 = 0;

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Student', link: '/app/student' }, { label: 'View' }])
  }

  ngOnInit(): void {
    //attendance
    this.originalData = [
      { date: '01/01/2025', session: 'Morning', status: 'Present' },
      { date: '02/01/2025', session: 'Evening', status: 'Present' },
      { date: '03/01/2025', session: 'Morning', status: 'Absent' },
      { date: '04/01/2025', session: 'Evening', status: 'Present' },
      { date: '05/01/2025', session: 'Morning', status: 'Present' },
    ];

    this.loadTableData({ page: 1, pageSize: 5 });

    //assignment
    this.assignmentData = [
      { title: 'Kinematics Worksheet', sub: 'Physics', due: '10/01/2025', status: 'Completed' },
      { title: 'Mole Concept Practice', sub: 'Chemistry', due: '12/01/2025', status: 'Pending' },
      { title: 'Quadratic Equations', sub: 'Mathematics', due: '15/01/2025', status: 'Completed' },
      { title: 'Newton’s Laws Assignment', sub: 'Physics', due: '18/01/2025', status: 'Overdue' },
      { title: 'Periodic Table Test', sub: 'Chemistry', due: '20/01/2025', status: 'Pending' }
    ];

    this.loadAssData({ page: 1, pageSize: 5 });

    //exam
    this.examData = [
      { exam: 'JEE Weekly Test 1', date: '25/01/2025', score: '78%', res: 'Pass' },
      { exam: 'JEE Weekly Test 2', date: '01/02/2025', score: '86%', res: 'Pass' },
    ];

    this.loadExamData({ page: 1, pageSize: 5 });

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


  loadAssData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.assignmentData];

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
    this.totalRecords1 = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    const end = start + req.pageSize;
    this.dataArray1 = filtered.slice(start, end);
  }

   loadExamData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.examData];

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
    this.totalRecords2 = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    const end = start + req.pageSize;
    this.dataArray2 = filtered.slice(start, end);
  }
}
