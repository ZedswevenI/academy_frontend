import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-grid-list',
  standalone: false,
  templateUrl: './grid-list.component.html',
  styleUrl: './grid-list.component.scss'
})
export class GridListComponent {
students = [
    {
      name: 'Arjun R',
      code: 'Z7I-JEE-2025-001',
      initials: 'AR',
      status: 'Active',
      course: 'JEE 2 Year Classroom',
      center: 'Gandhipuram Center',
      phone: '9000000001',
      city: 'Coimbatore',
      attendance: 94
    },
    {
      name: 'Lakshmi S',
      code: 'Z7I-NEET-2025-014',
      initials: 'LS',
      status: 'Active',
      course: 'NEET 1 Year Repeaters',
      center: 'Nungambakkam Center',
      phone: '9000000002',
      city: 'Chennai',
      attendance: 88
    },
    {
      name: 'Rahul Mehta',
      code: 'Z7I-JEE-2024-032',
      initials: 'RM',
      status: 'Completed',
      course: 'JEE Crash Course',
      center: 'Gandhipuram Center',
      phone: '9000000003',
      city: 'Coimbatore',
      attendance: 91
    }
  ];

   constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Student'}])
  }

}
