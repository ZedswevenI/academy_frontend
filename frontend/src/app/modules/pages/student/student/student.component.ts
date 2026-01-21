import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student',
  standalone: false,
  templateUrl: './student.component.html',
  styleUrl: './student.component.scss'
})
export class StudentComponent {
  activeTab: 'list' | 'grid' = 'list';

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Student' }])
  }


  setTab(tab: 'list' | 'grid') {
    this.activeTab = tab;
  }

  
}
