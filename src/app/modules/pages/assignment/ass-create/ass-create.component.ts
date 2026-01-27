import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ass-create',
  standalone: false,
  templateUrl: './ass-create.component.html',
  styleUrl: './ass-create.component.scss'
})
export class AssCreateComponent {
  assForm!: FormGroup;
  isProceed: boolean = false;
  isUnassign: boolean = false;
  confirmAssign: boolean = false;

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' }
  ];
  subject_options = [
    { label: 'Maths', value: 'Maths' },
    { label: 'Physics', value: 'Physics' },
    { label: 'Chemistry', value: 'Chemistry' },
    { label: 'Biology', value: 'Biology' }
  ]
  topic_options = [
    { label: 'Algebra', value: 'Algebra' },
    { label: 'Mechanics', value: 'Mechanics' },
    { label: 'Organic Chemistry', value: 'Organic' },
    { label: 'Cell Biology', value: 'Cell' },
  ];
  sub_options = [
    { label: 'Linear Equations', value: 'Linear' },
    { label: 'Motion', value: 'Motion' },
    { label: 'Hydrocarbons', value: 'Hydrocarbons' },
    { label: 'Cell Structure', value: 'Structure' },
  ]

  columnsArray = [
    { key: 'class', label: 'Class', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'topic', label: 'Topic', sortable: false },
    { key: 'sub', label: 'Sub Topic', sortable: false }
  ];

  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  actions = [
    {
      type: 'change',
      text: 'Assign',
      value: 'assign',
      callback: (row: any) => this.assign(row)
    },
    {
      type: 'change',
      text: 'Unassign',
      value: 'unassign',
      callback: (row: any) => this.unassign(row)
    }
  ];



  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Assignment', link: '/app/assignment' }, { label: 'Create' }])
  }

  ngOnInit(): void {
    this.assForm = this.fb.group({
      class: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      topic: ['', [Validators.required]],
      sub: ['', [Validators.required]]
    });

    this.originalData = [
      { class: 'Class 8', subject: 'Maths', topic: 'Algebra', sub: 'Linear Equations', status: 'assigned' },
      { class: 'Class 9', subject: 'Maths', topic: 'Geometry', sub: 'Triangles', status: 'assigned' },
      { class: 'Class 10', subject: 'Maths', topic: 'Trigonometry', sub: 'Heights & Distances', status: 'unassigned' },
      { class: 'Class 8', subject: 'Physics', topic: 'Mechanics', sub: 'Laws of Motion', status: 'assigned' },
      { class: 'Class 9', subject: 'Physics', topic: 'Optics', sub: 'Reflection of Light', status: 'unassigned' },
      { class: 'Class 10', subject: 'Chemistry', topic: 'Organic Chemistry', sub: 'Hydrocarbons', status: 'assigned' },
      { class: 'Class 9', subject: 'Chemistry', topic: 'Chemical Bonding', sub: 'Covalent Bonds', status: 'assigned' },
      { class: 'Class 8', subject: 'Biology', topic: 'Cell Biology', sub: 'Cell Structure', status: 'unassigned' },
      { class: 'Class 9', subject: 'Biology', topic: 'Genetics', sub: 'Mendel Experiments', status: 'assigned' },
      { class: 'Class 10', subject: 'Biology', topic: 'Human Anatomy', sub: 'Digestive System', status: 'unassigned' }
    ]

    this.loadTableData({ page: 1, pageSize: 5 });
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let filtered = [...this.originalData];

    // SEARCH
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

    // PAGINATION
    this.totalRecords = filtered.length;
    const start = (req.page - 1) * req.pageSize;
    const end = start + req.pageSize;
    this.dataArray = filtered.slice(start, end);
  }

  addAss() {
    this.router.navigate(['/app/assignment'])
  }

  onProceed() {
    this.isProceed = true;
  }

  assign(row: any) { }

  unassign(row: any) {
    this.isUnassign = true;
  }
  
  onConfirm() {
    if (!this.confirmAssign) {
      alert('Please confirm by checking the box.');
      return;
    }
    this.confirmAssign = true;
    this.isUnassign = false;
  }
  onClose(){
    this.isUnassign = false
  }

}
