import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-circular',
  standalone: false,
  templateUrl: './circular.component.html',
  styleUrl: './circular.component.scss'
})
export class CircularComponent {
  columnsArray = [
    { key: 'class', label: 'Class', sortable: true },
    { key: 'title', label: 'Title', sortable: false },
    { key: 'des', label: 'Description', sortable: false },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'applicableFor', label: 'Applicable For', sortable: false },
    { key: 'date', label: 'Date', sortable: true },
  ];
  dataArray =  [
  {
    class: '6–8',
    title: 'Unit Test Schedule',
    des: 'Unit test will be conducted from 10 Feb to 15 Feb for all subjects.',
    type: 'Exam',
    applicableFor: 'Student',
    date: '10-Feb-2026'
  },
  {
    class: '9–10',
    title: 'Annual Exam Guidelines',
    des: 'Guidelines for annual examination including hall ticket instructions.',
    type: 'Exam',
    applicableFor: 'Student',
    date: '01-Mar-2026'
  },
  {
    class: '11–12',
    title: 'Board Exam Orientation',
    des: 'Orientation session for board exam preparation and assessment pattern.',
    type: 'Academic',
    applicableFor: 'Both',
    date: '20-Jan-2026'
  },
  {
    class: '6–12',
    title: 'Holiday for Students Only',
    des: 'School will remain closed for students due to internal evaluation.',
    type: 'Holiday',
    applicableFor: 'Student',  
    date: '26-Jan-2026'
  },
  {
    class: '8–12',
    title: 'Fee Payment Reminder',
    des: 'Last date for term fee payment is 15 Feb.',
    type: 'Fee',
    applicableFor: 'Student',
    date: '05-Feb-2026'
  },
  {
    class: 'All',
    title: 'Exam Question Paper',
    des: 'Submit Question Papers',
    type: 'Exam',
    applicableFor: 'Teacher',
    date: '05-Feb-2026'
  }
];

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Circular' }])
  }



}
