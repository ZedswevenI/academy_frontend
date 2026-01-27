import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-view-teacher',
  standalone: false,
  templateUrl: './view-teacher.component.html',
  styleUrl: './view-teacher.component.scss'
})
export class ViewTeacherComponent {
  isupdate: boolean = false;

  // Attendance
  columnsArray = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'session', label: 'Session', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];

  dataArray = [
    { date: '01/01/2025', session: 'Morning', status: 'Present' },
    { date: '02/01/2025', session: 'Evening', status: 'Present' },
    { date: '03/01/2025', session: 'Morning', status: 'Absent' },
    { date: '04/01/2025', session: 'Evening', status: 'Present' },
    { date: '05/01/2025', session: 'Morning', status: 'Present' },
  ];

  // Assignment 
  columnsArray1 = [
    { key: 'title', label: 'Title', sortable: false },
    { key: 'unit', label: 'Unit', sortable: false },
    { key: 'sub', label: 'Subject', sortable: false },
    { key: 'due', label: 'Due Date', sortable: false },
  ];

  dataArray1 = [
    { title: 'Newton Laws Worksheet', unit: 'Unit 1', sub: 'Physics', due: '25-Jan-2026' },
    { title: 'Motion and Kinematics', unit: 'Unit 2', sub: 'Physics', due: '28-Jan-2026' },
    { title: 'Work, Energy & Power', unit: 'Unit 3', sub: 'Physics', due: '30-Jan-2026' },
    { title: 'Laws of Thermodynamics', unit: 'Unit 4', sub: 'Physics', due: '02-Feb-2026' },
    { title: 'Waves and Oscillations', unit: 'Unit 5', sub: 'Physics', due: '05-Feb-2026' }
  ];

  //Feedback
  columnsArray4 = [
    { key: 'date', label: 'Date', sortable: false },
    { key: 'teach', label: 'Staff', sortable: false },
    { key: 'sub', label: 'Subject', sortable: false },
    { key: 'feedback', label: 'Feedback', sortable: false }
  ];

  dataArray4 = [
    { date: '18-Jan-2026', teach: 'Mr. R. Rajesh', sub: 'Physics', feedback: 'Explains concepts clearly with real-life examples.' },
    { date: '19-Jan-2026', teach: 'Mr. R. Rajesh', sub: 'Physics', feedback: 'Very patient in clearing doubts during class.' },
    { date: '20-Jan-2026', teach: 'Mr. R. Rajesh', sub: 'Physics', feedback: 'Uses diagrams and experiments which help understanding.' },
    { date: '21-Jan-2026', teach: 'Mr. R. Rajesh', sub: 'Physics', feedback: 'Good pace of teaching and regular revision sessions.' },
    { date: '22-Jan-2026', teach: 'Mr. R. Rajesh', sub: 'Physics', feedback: 'Encourages questions and interactive learning.' }
  ];

  //Relieving Date
  columnsArray5 = [
    { key: 'name', label: 'Staff Name', sortable: false },
    { key: 'code', label: 'staff Code', sortable: false },
    { key: 'id', label: 'Employee ID', sortable: false },
    { key: 'join', label: 'Joining Date', sortable: false },
    { key: 'relieve', label: 'Relieving Date', sortable: false },
  ];

  dataArray5 = [
    { name: 'Mr. R. Rajesh', code: 'STF002', id: 'EMP003', join: '01-Jan-2026', relieve: '23-Jan-2026' },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-edit',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editDate(row)
    },
  ];

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Teachers', link: '/app/teacher' }, { label: 'View' }])
  }

  editDate(row: any) {
    this.isupdate = true;
  }

  onConfirm() { }
  onClose() {
    this.isupdate = false
  }

}
