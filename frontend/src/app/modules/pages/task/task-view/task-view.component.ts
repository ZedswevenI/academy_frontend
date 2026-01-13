import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-task-view',
  standalone: false,
  templateUrl: './task-view.component.html',
  styleUrl: './task-view.component.scss'
})
export class TaskViewComponent {
  isStatus: boolean = false;
  selectedStatus: string | null = null;

  statusOptions = [
    { label: 'Completed', checked: false },
    { label: 'Not Completed', checked: false },
    { label: 'In Progress', checked: false },
    { label: 'Need more Time', checked: false },
  ];

  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Task', link: '/app/task' }, { label: 'View' }])
  }

  onAct() {
    this.isStatus = true;
  }

  onClose() {
    this.isStatus = false;
  }

  selectStatus(index: number) {
    this.statusOptions.forEach((item, i) => {
      item.checked = i === index;
    });
  }

  onConfirm() {
    const selected = this.statusOptions.find(s => s.checked);
    if (!selected) {
      alert('Please select a status.');
      return;
    }

    this.selectedStatus = selected.label;
    console.log('Selected status:', selected.label);
    this.isStatus = false; 

    this.statusOptions.forEach(s => s.checked = false);
  }
}
