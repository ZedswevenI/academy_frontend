import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-close-batch',
  standalone: false,
  templateUrl: './close-batch.component.html',
  styleUrl: './close-batch.component.scss'
})
export class CloseBatchComponent {

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Batch', link: '/app/batch' }, { label: 'Close' }])
  }

}
