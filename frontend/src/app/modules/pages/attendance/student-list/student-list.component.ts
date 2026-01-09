import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-list',
  standalone: false,
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.scss'
})
export class StudentListComponent implements OnInit {
  students: any[] = [];
  selectAll: boolean = false;

  presentCount = 0;
  absentCount = 0;
  absentStudents: string[] = [];
  presentStudents: string[] = [];
  showSummary = false;

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Attendance', link: '/app/attendance' }, { label: 'Student List' }])
  }
  ngOnInit(): void {
    this.students = [
      { id: 1, name: 'Alice Johnson', rollNo: 'ST-101', present: null },
      { id: 2, name: 'Bob Smith', rollNo: 'ST-102', present: null },
      { id: 3, name: 'Charlie Brown', rollNo: 'ST-103', present: null },
      { id: 4, name: 'David Lee', rollNo: 'ST-104', present: null },
      { id: 5, name: 'Emma Wilson', rollNo: 'ST-105', present: null },
      { id: 6, name: 'Fiona Davis', rollNo: 'ST-106', present: null },
      { id: 7, name: 'George Miller', rollNo: 'ST-107', present: null },
      { id: 8, name: 'Hannah Taylor', rollNo: 'ST-108', present: null },
      { id: 9, name: 'Ian Anderson', rollNo: 'ST-109', present: null },
      { id: 10, name: 'Julia Thomas', rollNo: 'ST-110', present: null },
      { id: 11, name: 'Kevin Martin', rollNo: 'ST-111', present: null },
      { id: 12, name: 'Laura Jackson', rollNo: 'ST-112', present: null },
      { id: 13, name: 'Michael White', rollNo: 'ST-113', present: null },
      { id: 14, name: 'Nina Harris', rollNo: 'ST-114', present: null },
      { id: 15, name: 'Oliver Clark', rollNo: 'ST-115', present: null },
      { id: 16, name: 'Paula Lewis', rollNo: 'ST-116', present: null },
      { id: 17, name: 'Quentin Walker', rollNo: 'ST-117', present: null },
      { id: 18, name: 'Rachel Hall', rollNo: 'ST-118', present: null },
      { id: 19, name: 'Samuel Young', rollNo: 'ST-119', present: null },
      { id: 20, name: 'Tina King', rollNo: 'ST-120', present: null },
    ];

  }

  toggleAttendance(student: any) {
    if (student.present === null) {
      student.present = true;
    } else {
      student.present = !student.present;
    }

    this.selectAll =
      this.students.length > 0 &&
      this.students.every(s => s.present === true);
  }


  submitAttendance() {
    this.students.forEach(student => {
      if (student.present === null) {
        student.present = false;
      }
    });

    const present = this.students.filter(s => s.present === true);
    const absent = this.students.filter(s => s.present === false || s.present === null);

    this.presentCount = present.length;
    this.presentStudents = present.map(s => s.name);
    this.absentCount = absent.length;
    this.absentStudents = absent.map(s => s.name);

    this.showSummary = true;
  }

  toggleSelectAll() {
    this.students.forEach(student => {
      student.present = this.selectAll ? true : false;
    });
  }

  onConfirm() {
    console.log('Present Students:', this.presentStudents);
    console.log('Absent Students:', this.absentStudents);
    this.router.navigate(['/app/attendance'])
  }
}
