import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-view-teacher',
  standalone: false,
  templateUrl: './view-teacher.component.html',
  styleUrl: './view-teacher.component.scss'
})
export class ViewTeacherComponent {

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{label: 'Teachers', link: '/app/teacher'}, {label: 'View'}])
  }
}
