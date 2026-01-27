import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-assign-student',
  standalone: false,
  templateUrl: './assign-student.component.html',
  styleUrl: './assign-student.component.scss'
})
export class AssignStudentComponent {
  showAssignPanel = true;
  assignForm!: FormGroup;
  modalVisible = false;

  status_options = [
    { label: 'All', value: 'All' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Active', value: 'Active' },
    { label: 'Close', value: 'Close' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  ay_options = [
    { label: 'All', value: 'All' },
    { label: '2024-2025', value: '2024-2025' },
    { label: '2025-2026', value: 'Act2025-2026ive' },
    { label: '2026-2027', value: '2026-2027' },
  ];

  program_options = [
    { label: 'All', value: 'All' },
    { label: 'Program1', value: 'Program1' },
    { label: 'Program2', value: 'Program2' },
    { label: 'Program3', value: 'Program3' },
    { label: 'Program4', value: 'Program4' },
    { label: 'Program5', value: 'Program5' },
    { label: 'Program6', value: 'Program6' },
  ]

  center_options = [
    { label: 'All', value: 'All' },
    { label: 'Coimbatore - Sub Main', value: 'Coimbatore - Sub Main' },
  ]

  columnsArray = [
    { key: 'batchName', label: 'Batch Name', sortable: true },
    { key: 'batchCode', label: 'Batch Code', sortable: true },
    { key: 'ay', label: 'AY', sortable: true },
    { key: 'program', label: 'Program', sortable: false },
    { key: 'center', label: 'Center', sortable: false },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'student', label: 'Students', sortable: false },
  ];
  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewbatch(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editbatch(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-users-gear',
      tooltip: 'Add Faculty',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.add(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-user-plus',
      tooltip: 'Assign Student',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.assign(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-lock',
      tooltip: 'Close Batch',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.close(row)
    },
  ]
  students = [
    {
      name: 'fgsdffs',
      phone: '902064259002',
      admissionNo: '7894654654'
    }
  ];

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Batch', link: '/app/batch' }, { label: 'Assign Student' }])
  }

  ngOnInit(): void {
    this.originalData = [
      { batchName: '9th Class', batchCode: '9BATCH', ay: '2025-2029', program: 'Prime 4 year', center: 'Coimbatore-Sub main', status: 'Active', student: '3' },
      { batchName: '10th Class', batchCode: '10BATCH', ay: '2025-2029', program: 'Prime 4 year', center: 'Coimbatore-Main', status: 'Active', student: '5' },
      { batchName: '11th Science', batchCode: '11SCI', ay: '2024-2028', program: 'Integrated 4 year', center: 'Chennai-Main', status: 'Active', student: '12' },
      { batchName: '12th Science', batchCode: '12SCI', ay: '2024-2028', program: 'Integrated 4 year', center: 'Chennai-Sub', status: 'Inactive', student: '8' },
      { batchName: 'NEET Batch A', batchCode: 'NEET01', ay: '2025-2027', program: 'NEET 2 year', center: 'Bangalore-Main', status: 'Active', student: '25' },
      { batchName: 'NEET Batch B', batchCode: 'NEET02', ay: '2025-2027', program: 'NEET 2 year', center: 'Bangalore-Sub', status: 'Active', student: '18' },
      { batchName: 'JEE Batch A', batchCode: 'JEE01', ay: '2025-2028', program: 'JEE 3 year', center: 'Hyderabad-Main', status: 'Active', student: '30' },
      { batchName: 'JEE Batch B', batchCode: 'JEE02', ay: '2025-2028', program: 'JEE 3 year', center: 'Hyderabad-Sub', status: 'Inactive', student: '20' },
      { batchName: 'Foundation 8th', batchCode: 'FND08', ay: '2025-2027', program: 'Foundation 2 year', center: 'Coimbatore-Main', status: 'Active', student: '15' },
      { batchName: 'Foundation 7th', batchCode: 'FND07', ay: '2025-2027', program: 'Foundation 2 year', center: 'Madurai-Main', status: 'Active', student: '10' }
    ];

    this.loadTableData({ page: 1, pageSize: 5 });

    this.assignForm = this.fb.group({
      search: [''],
      status: [''],
      ay: [''],
      program: [''],
      center: ['']
    })
  }

  closeAssign() {
    this.showAssignPanel = false;
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.originalData];

    //  SEARCH
    if (req.search) {
      const value = req.search.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(value)
        )
      );
    }

    // SORT
    if (req.sortKey) {
      filtered.sort((a, b) => {
        const x = a[req.sortKey!];
        const y = b[req.sortKey!];
        return req.sortDirection === 'asc'
          ? String(x).localeCompare(String(y))
          : String(y).localeCompare(String(x));
      });
    }

    //  PAGINATION
    this.totalRecords = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    const end = start + req.pageSize;
    this.dataArray = filtered.slice(start, end);
  }

  viewbatch(row: any) {
    this.router.navigate(['/app/batch/view'])
  }
  editbatch(row: any) {
    this.router.navigate(['/app/batch/edit'])
  }
  add(row: any) {
    // this.router.navigate(['/app/batch/addFaculty'])
    this.router.navigate(['/app/batch/view'])
  }
  assign(row: any) {
    // this.router.navigate(['/app/batch/assign'])
    this.showAssignPanel = true
  }
  close(row: any) {
    // this.router.navigate(['/app/batch/close'])
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
