import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-program',
  standalone: false,
  templateUrl: './program.component.html',
  styleUrl: './program.component.scss'
})
export class ProgramComponent {
  modalVisible = false;
  isEditMode: boolean = false

  columnsArray = [
    { key: 'name', label: 'Program Name', sortable: true },
    { key: 'code', label: 'Code', sortable: false },
    { key: 'stream', label: 'Stream', sortable: true },
    { key: 'class', label: 'Eligible Class', sortable: true },
    { key: 'dur', label: 'Duration', sortable: true },
    { key: 'start', label: 'Start Class', sortable: true },
    { key: 'version', label: 'Version', sortable: true },
    { key: 'sub', label: 'Subject', sortable: false },
    { key: 'active', label: 'Active', sortable: false },
  ];
  dataArray = [
    {
    name: 'IIT Foundation',
    code: 'IIT-FND',
    stream: 'Science',
    class: '8–10',
    dur: '2 Years',
    start: 'Class 8',
    version: 'v1.0',
    sub: 'Physics, Chemistry, Maths',
    active: true
  },
  {
    name: 'NEET Crash Course',
    code: 'NEET-CC',
    stream: 'Medical',
    class: '12',
    dur: '6 Months',
    start: 'Class 12',
    version: 'v2.1',
    sub: 'Biology, Physics, Chemistry',
    active: true
  },
  {
    name: 'JEE Advanced',
    code: 'JEE-ADV',
    stream: 'Engineering',
    class: '11–12',
    dur: '2 Years',
    start: 'Class 11',
    version: 'v3.0',
    sub: 'Physics, Chemistry, Maths',
    active: false
  }
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewDep(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-edit',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editDep(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc3545',
      callback: (row: any) => this.deleteDep(row)
    },
  ]

  constructor(private breadcrump: BredcrumpService, private router: Router) {
    this.breadcrump.set([{ label: 'Program' }])
  }

  viewDep(row: any){
    this.router.navigate(['/app/org-master/program/view'])
  }
  editDep(row: any) {
    this.router.navigate(['/app/org-master/program/add'], {
      state: {
        isEditMode: true,
        rowData: row
      }
    });
  }

  deleteDep(row: any) {
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
