import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-ass-view',
  standalone: false,
  templateUrl: './ass-view.component.html',
  styleUrl: './ass-view.component.scss'
})
export class AssViewComponent {

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{ label: 'Assignment', link: '/app/assignment'}, { label: 'View'}])
  }
}
