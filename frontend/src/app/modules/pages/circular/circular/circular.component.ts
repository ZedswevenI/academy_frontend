import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-circular',
  standalone: false,
  templateUrl: './circular.component.html',
  styleUrl: './circular.component.scss'
})
export class CircularComponent {

  isRead: boolean = false;
  circulars = [
    {
      date: 'Sunday, November 2, 2025',
      items: [
        { text: 'Important notice regarding upcoming examinations', isRead: false },
        { text: 'Schedule for parent-teacher meeting', isRead: false },
      ]
    },
    {
      date: 'Tuesday, September 2, 2025',
      items: [
        { text: 'Holiday announcement for Independence Day', isRead: false }
      ]
    }
  ];

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Circular' }])
  }

  // markAsRead(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   this.isRead = input.checked;
  // }
  markAsRead(event: Event, item: any) {
    // item.isRead = true;  
    const checked = (event.target as HTMLInputElement).checked;
    item.isRead = checked;
  }

}
