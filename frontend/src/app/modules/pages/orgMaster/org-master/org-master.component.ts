import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-org-master',
  standalone: false,
  templateUrl: './org-master.component.html',
  styleUrl: './org-master.component.scss'
})
export class OrgMasterComponent {

  constructor(private breadcrump: BredcrumpService){
    this.breadcrump.set([{label: 'Org-Master'}])
  }
}
