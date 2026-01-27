import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-view-table',
  standalone: false,
  templateUrl: './view-table.component.html',
  styleUrl: './view-table.component.scss'
})
export class ViewTableComponent {

  batch = '9BATCH - 64 - Phase 1';
  weekStarting = 'Mar 30, 2026';
  status = 'Active';

  timetable = [
    {
      day: 'WEDNESDAY',
      period1: {
        subject: 'PSA',
        hall: 'Hall A'
      },
      period2: {
        subject: 'STF002',
        hall: 'Hall A'
      }
    }
  ];

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{label: 'Timetable', link: '/app/timetable'}, {label: 'View'}])
  }
}
