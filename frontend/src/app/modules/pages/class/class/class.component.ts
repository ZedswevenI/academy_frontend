import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-class',
  standalone: false,
  templateUrl: './class.component.html',
  styleUrl: './class.component.scss'
})
export class ClassComponent {

  columnsArray = [
    { key: 'className', label: 'Class Name', sortable: false },
    { key: 'trainer', label: 'Trainer', sortable: false },
    { key: 'timing', label: 'Timing', sortable: false },
  ];

  // dataArray = [
  //   { className: 'Angular Basics', trainer: 'Mr. Kumar', timing: '9:00–10:30 AM' },
  //   { className: 'Python Functions', trainer: 'Ms. Anitha', timing: '11:00–12:30 PM' },
  //   { className: 'Java OOPS', trainer: 'Mr. Ravi', timing: '2:00–3:30 PM' },
  // ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;


  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Class' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { className: 'Angular Basics', trainer: 'Mr. Kumar', timing: '9:00–10:30 AM' },
      { className: 'Python Functions', trainer: 'Ms. Anitha', timing: '11:00–12:30 PM' },
      { className: 'Java OOPS', trainer: 'Mr. Ravi', timing: '2:00–3:30 PM' },
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
