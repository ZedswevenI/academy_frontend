import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-ass-view',
  standalone: false,
  templateUrl: './test-view.component.html',
  styleUrl: './test-view.component.scss'
})
export class TestViewComponent {
  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Assignments', link: '/app/test' }, { label: 'View' }]);
  }
}
