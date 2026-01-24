import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-department',
  standalone: false,
  templateUrl: './department.component.html',
  styleUrl: './department.component.scss'
})
export class DepartmentComponent {
  modalVisible = false;
  isEditMode: boolean = false;
  selectedRow: any = null;

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
    this.breadcrump.set([{ label: 'Department' }])
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

  openCreate() {
    this.isEditMode = false;
    this.selectedRow = null;
    this.open();
  }

  editCenter(row: any) {
    this.isEditMode = true;
    this.selectedRow = row;
    this.open();
  }

  open() {
    const modal = new (window as any).bootstrap.Modal(
      document.getElementById('centerModal')
    );
    modal.show();
  }

  close() {
    const modalEl = document.getElementById('centerModal');
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
  }

  onSave(data: any) {
    if (this.isEditMode) {
      console.log('Update center', data);
    } else {
      console.log('Create center', data);
    }
    this.close();
  }
}
