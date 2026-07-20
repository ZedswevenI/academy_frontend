import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';

@Component({
  selector: 'app-ass-view',
  standalone: false,
  templateUrl: './test-view.component.html',
  styleUrl: './test-view.component.scss'
})
export class TestViewComponent {
  constructor(
    private breadcrump: BredcrumpService,
    private backNav: BackNavigationService,
  ) {
    this.breadcrump.set([{ label: 'Assignments', link: '/app/assignment' }, { label: 'View' }]);
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/assignment' });
  }
}
