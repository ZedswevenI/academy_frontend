import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-add-faculty',
  standalone: false,
  templateUrl: './add-faculty.component.html',
  styleUrl: './add-faculty.component.scss'
})
export class AddFacultyComponent {

  constructor(private breadcrump: BredcrumpService){
      this.breadcrump.set([{label: 'Batch', link: '/app/batch'}, {label: 'Add Faculty'}])
    }
}
