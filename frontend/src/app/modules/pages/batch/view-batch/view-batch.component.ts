import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-view-batch',
  standalone: false,
  templateUrl: './view-batch.component.html',
  styleUrl: './view-batch.component.scss'
})
export class ViewBatchComponent {
  facultyForm!: FormGroup;
  showStudentPanel = false;
  showFacultyPanel = false;
  selectedCount = 0;

  subject_options = [
    { label: 'Physics(PHY)', value: 'Physics(PHY)' },
    { label: 'Maths(MAT)', value: 'Maths(MAT)' }
  ];
  faculty_options = [
    { label: 'Rajesh K(STF001)', value: 'Rajesh K(STF001)' },
    { label: 'Saravanakumar(STF002)', value: 'Saravanakumar(STF002)' },
    { label: 'Ramesh(STF003)', value: 'Ramesh(STF003)' }
  ];

  columnsArray = [
    { key: 'name', label: 'Student Name', sortable: false },
    { key: 'add', label: 'Admission No.', sortable: false },
    { key: 'reg', label: 'Reg No.', sortable: false },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'parent', label: 'Parent Phone', sortable: false }
  ];
  dataArray = [
    {
      name: 'Arun Kumar',
      add: 'ADM2025001',
      reg: 'REG-9A-001',
      phone: '9876543210',
      parent: '9876500001'
    },
    {
      name: 'Priya Sharma',
      add: 'ADM2025002',
      reg: 'REG-9A-002',
      phone: '9876543211',
      parent: '9876500002'
    },
    {
      name: 'S Charu Nethra',
      add: 'ADM2025003',
      reg: 'REG-9A-003',
      phone: '9442611989',
      parent: '9442611990'
    }
  ];

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Batch', link: '/app/batch' }, { label: 'View' }])
  }

  ngOnInit(): void{
    this.facultyForm = this.fb.group({
      subject: [''],
      faculty: ['']
    })
  }
  openStudent() {
    this.showStudentPanel = true;
  }

  closeStudent() {
    this.showStudentPanel = false;
  }
  onStudentToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedCount += checked ? 1 : -1;
  }

  openFaculty() {
    this.showFacultyPanel = true;
  }

  closeFaculty() {
    this.showFacultyPanel = false;
  }
}
