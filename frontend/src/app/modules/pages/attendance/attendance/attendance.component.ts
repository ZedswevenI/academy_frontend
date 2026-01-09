import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-attendance',
  standalone: false,
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent {
  selectedDay: boolean = false;
  form!: FormGroup;
  originalData: any[] = [];
  totalRecords = 0;

  batch_options: any[] = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ];

  class_options: any[] = [
    { label: 'Angular Basics', value: 'Angular Basics' },
    { label: 'Python Functions', value: 'Python Functions' },
    { label: 'Java OOPS', value: 'Java OOPS' }
  ];

  columnsArray = [
    { key: 'batchCode', label: 'Batch Code', sortable: false },
    { key: 'time', label: 'Timing', sortable: false },
    { key: 'venue', label: 'Venue', sortable: false },
    { key: 'otp', label: 'OTP', sortable: false },
    { key: 'desc', label: 'Description', sortable: false }
  ];
  dataArray: any[] = [];


  dates = [
    { label: '7 Jan', value: '2026-01-07' },
    { label: '8 Jan', value: '2026-01-08' },
    { label: '9 Jan', value: '2026-01-09' },
    { label: '10 Jan', value: '2026-01-10' },
    { label: '11 Jan', value: '2026-01-11' },
    { label: '12 Jan', value: '2026-01-12' },
    { label: '13 Jan', value: '2026-01-13' }
  ];

  actions = [
    {
      type: 'simple',
      color: 'primary',
      text: 'Mark Attendance',
      callback: (row: any) => this.markAttendance(row)
    },
  ]
  selectedDate: string | null = null;

  selectDate(date: any) {
    this.selectedDay = true;
    this.selectedDate = date.value;
  }
  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Attendance' }]);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      batch: ['', [Validators.required]],
      class: ['', [Validators.required]],
      attendance: ['', [Validators.required]]
    })

    this.originalData = [
      { batchCode: 'BCH101', time: '09:00 AM - 11:00 AM', venue: 'Room 201', otp: '123456', desc: 'Maths basics' },
      { batchCode: 'BCH102', time: '11:15 AM - 01:15 PM', venue: 'Room 202', otp: '234567', desc: 'Physics fundamentals' },
      { batchCode: 'BCH103', time: '01:30 PM - 03:30 PM', venue: 'Room 203', otp: '345678', desc: 'Chemistry intro' },
      { batchCode: 'BCH104', time: '03:45 PM - 05:45 PM', venue: 'Room 204', otp: '456789', desc: 'Biology basics' },
      { batchCode: 'BCH105', time: '06:00 PM - 08:00 PM', venue: 'Room 205', otp: '567890', desc: 'English grammar' },
      { batchCode: 'BCH106', time: '08:15 AM - 10:15 AM', venue: 'Room 206', otp: '678901', desc: 'Computer basics' },
      { batchCode: 'BCH107', time: '10:30 AM - 12:30 PM', venue: 'Room 207', otp: '789012', desc: 'History overview' },
      { batchCode: 'BCH108', time: '12:45 PM - 02:45 PM', venue: 'Room 208', otp: '890123', desc: 'Geography intro' },
      { batchCode: 'BCH109', time: '03:00 PM - 05:00 PM', venue: 'Room 209', otp: '901234', desc: 'Economics basics' },
      { batchCode: 'BCH110', time: '05:15 PM - 07:15 PM', venue: 'Room 210', otp: '012345', desc: 'Art & craft' }
    ];

    this.loadTableData({ page: 1, pageSize: 5 })
  }

  // markAttendance(){
  //   const attendance = this.form.get('attendance')?.value;
  //   if(attendance === true){
  //     this.router.navigate(['/app/attendance/table'])
  //   }
  // }
  markAttendance(row?: any) {
    this.router.navigate(['/app/attendance/table'])
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
