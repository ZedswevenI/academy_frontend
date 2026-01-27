import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-com-list',
  standalone: false,
  templateUrl: './com-list.component.html',
  styleUrl: './com-list.component.scss'
})
export class ComListComponent {

  columnsArray = [
    { key: 'class', label: 'Class', sortable: true },
    { key: 'batch', label: 'Batch', sortable: true },
    { key: 'stu', label: 'Student Name', sortable: true },
    { key: 'msg', label: 'Last Message', sortable: false },
    { key: 'senBy', label: 'Send Template By', sortable: false }
  ];
  dataArray = [
    { stu: 'Arun Kumar', class: 'Class 6', batch: 'Batch A', msg: 'Please submit your assignment by today.',senBy: 'WhatsApp'},
    { stu: 'Priya Sharma', class: 'Class 7', batch: 'Batch B', msg: 'Your exam schedule has been updated.', senBy: 'Email' },
    { stu: 'Rahul Verma', class: 'Class 8', batch: 'Batch C', msg: 'Fee payment reminder for this month.', senBy: 'SMS' },
    { stu: 'Sneha Patel', class: 'Class 9', batch: 'Batch A', msg: 'Parent-teacher meeting on Friday.', senBy: 'WhatsApp' },
    { stu: 'Karthik R', class: 'Class 10', batch: 'Batch A', msg: 'Your ID card is ready for collection.', senBy: 'Email'}
  ];

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Communication' }])
  }
}
