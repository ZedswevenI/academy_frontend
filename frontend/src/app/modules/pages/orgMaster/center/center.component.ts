import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-center',
  standalone: false,
  templateUrl: './center.component.html',
  styleUrl: './center.component.scss'
})
export class CenterComponent {
  modalVisible = false;
  isEditMode: boolean = false

  columnsArray = [
    { key: 'name', label: 'Center Name', sortable: false },
    { key: 'code', label: 'Code', sortable: false },
    { key: 'city', label: 'City', sortable: false },
    { key: 'state', label: 'State', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
  ];
  dataArray = [
    { name: 'Coimbatore - Sub Main', code: '64', city: 'Coimbatore', state: 'TamilNadu', status: 'Active' }
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-edit',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editCenter(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc3545',
      callback: (row: any) => this.deleteCenter(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Center' }])
  }

  editCenter(row: any) {
    this.router.navigate(['/app/org-master/center/add'], {
      state: {
        isEditMode: true,
        rowData: row   
      }
    });
  }

  deleteCenter(row: any) {
    this.openModal()
  }
  openModal() {
    this.modalVisible = true;
  }
  onModalClosed(result: boolean) {
    console.log('Modal closed. Confirmed:', result);
    this.modalVisible = false;
    if (result) {
      alert('User confirmed the action!');
    } else {
      alert('User cancelled the action.');
    }
  }
}
