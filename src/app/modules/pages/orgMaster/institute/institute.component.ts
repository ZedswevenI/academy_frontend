import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-institute',
  standalone: false,
  templateUrl: './institute.component.html',
  styleUrl: './institute.component.scss'
})
export class InstituteComponent {

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{label: 'Institute'}])
  }
}
