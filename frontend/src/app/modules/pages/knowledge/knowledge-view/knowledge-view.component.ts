import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-knowledge-view',
  standalone: false,
  templateUrl: './knowledge-view.component.html',
  styleUrl: './knowledge-view.component.scss'
})
export class KnowledgeViewComponent {

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Knowledge Base', link: '/app/knowledge' }, { label: 'View' }])
  }

}
