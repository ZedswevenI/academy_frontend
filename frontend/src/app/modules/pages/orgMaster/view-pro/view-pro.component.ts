import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-view-pro',
  standalone: false,
  templateUrl: './view-pro.component.html',
  styleUrl: './view-pro.component.scss'
})
export class ViewProComponent {

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{label: 'Program', link: '/app/org-master/program'}, {label: 'View'}])
  }
}
