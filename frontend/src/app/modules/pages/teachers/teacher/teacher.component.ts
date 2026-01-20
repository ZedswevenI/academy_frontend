import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-teacher',
  standalone: false,
  templateUrl: './teacher.component.html',
  styleUrl: './teacher.component.scss'
})
export class TeacherComponent {

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{label: 'Teacher'}])
  }
}
