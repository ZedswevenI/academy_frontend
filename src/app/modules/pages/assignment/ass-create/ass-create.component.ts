import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../service/auth/auth.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';

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
  sub_options: any[] = [];
  tenantId: any;

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



  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private backNav: BackNavigationService
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Assignment', link: '/app/assignment' }, { label: 'Create' }])
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/assignment' });
  }

  ngOnInit(): void {
    this.assForm = this.fb.group({
      class: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      topic: ['', [Validators.required]],
      sub: ['', [Validators.required]]
    });

    const role = this.authService.getRole();
    if (role === 'L4') {
      this.loadTeacherMaps();
    } else {
      // Keep hardcoded/defaults for other roles if not explicitly defined
      this.class_options = [
        { label: 'Class 6', value: 'Class 6' },
        { label: 'Class 7', value: 'Class 7' },
        { label: 'Class 8', value: 'Class 8' },
        { label: 'Class 9', value: 'Class 9' },
        { label: 'Class 10', value: 'Class 10' },
        { label: 'Class 11', value: 'Class 11' },
        { label: 'Class 12', value: 'Class 12' }
      ];
      this.subject_options = [
        { label: 'Maths', value: 'Maths' },
        { label: 'Physics', value: 'Physics' },
        { label: 'Chemistry', value: 'Chemistry' },
        { label: 'Biology', value: 'Biology' }
      ];
      this.topic_options = [
        { label: 'Algebra', value: 'Algebra' },
        { label: 'Mechanics', value: 'Mechanics' },
        { label: 'Organic Chemistry', value: 'Organic' },
        { label: 'Cell Biology', value: 'Cell' },
      ];
      this.sub_options = [
        { label: 'Linear Equations', value: 'Linear' },
        { label: 'Motion', value: 'Motion' },
        { label: 'Hydrocarbons', value: 'Hydrocarbons' },
        { label: 'Cell Structure', value: 'Structure' },
      ];
    }

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

  private loadTeacherMaps(): void {
    const staffId = this.authService.getStaffId();
    this.commonApi.fetchData({ tenantId: this.tenantId, staffId }, 'teacher', 'getstaffmaps').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          const data = res.data;

          // Classes
          this.class_options = (data.classes || []).map((c: any) => ({
            label: `Class ${c.classNo}`,
            value: `Class ${c.classNo}`
          }));

          // Subjects
          this.subject_options = (data.subjects || []).map((s: any) => ({
            label: s.subjectName,
            value: s.subjectName
          }));

          // Topics (AssCreate uses text names in hardcoded data, so we pull names)
          this.topic_options = (data.topics || []).map((t: any) => ({
            label: t.topicName,
            value: t.topicName
          }));

          // Sub Topics
          this.sub_options = (data.subTopics || []).map((st: any) => ({
            label: st.subTopicName,
            value: st.subTopicName
          }));
        }
      },
      error: () => this.alert.error('Error loading teacher assignments')
    });
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
  onClose() {
    this.isUnassign = false
  }

}
