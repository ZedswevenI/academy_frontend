import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-circular',
  standalone: false,
  templateUrl: './circular.component.html',
  styleUrl: './circular.component.scss'
})
export class CircularComponent {

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{label: 'Circular'}])
  }
}
