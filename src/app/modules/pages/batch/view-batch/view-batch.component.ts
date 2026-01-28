import { Component, ViewChild, ElementRef } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { ActivatedRoute, Router } from '@angular/router';

declare var bootstrap: any;

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();


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

  loading: boolean = false;
  batchId = '';
  batch: any = null;

  activeTab: 'students' | 'faculty' = 'students';
  offcanvasMode: 'none' | 'edit' | 'staff' | 'assign' | 'shuffle' = 'none';

  studentRows: any[] = [];
  selected = new Set<string>();

  editForm!: FormGroup;
  staffForm!: FormGroup;

  eligibleRows: any[] = [];
  eligibleCount = 0;
  eligibleQuery = { page: 1, limit: 20, search: '' };
  eligibleSelected = new Set<string>();
  batchesFull: any[] = [];
  shuffleToBatchId = '';

  // ✅ NEW: Lists for Dropdowns
  subjectsList: any[] = [];
  staffList: any[] = [];

  confirmData = {
    title: '',
    message: '',
    btnText: 'Confirm',
    btnClass: 'btn-danger',
    action: () => { },
  };


  subject_options = [];
  faculty_options = [];

  columnsArray = [
    { key: 'student.name', label: 'Student Name', sortable: false },
    { key: 'admissionNo', label: 'Admission No.', sortable: false },
    { key: 'registrationNumber', label: 'Reg No.', sortable: false },
    { key: 'student.phone', label: 'Phone', sortable: false },
    { key: 'student.parentPhone', label: 'Parent Phone', sortable: false }
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

  @ViewChild('confirmModal') confirmModalRef!: ElementRef;
  private bsModal: any;

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private router: Router) {
    this.breadcrump.set([{ label: 'Batch', link: '/app/batch' }, { label: 'View' }])
  }

  ngOnInit(): void {
    this.batchId = safeTrim(this.route.snapshot.paramMap.get('batchId'));
    if (!this.batchId) {
      this.alert.error('Batch ID missing');
      this.router.navigate(['/app/batch']);
      return;
    }

    this.facultyForm = this.fb.group({
      subject: [''],
      faculty: ['']
    })

    this.initForms();
    this.loadBatch();
  }

  initForms() {
    this.editForm = this.fb.group({
      batchId: [this.batchId],
      batchName: ['', [Validators.required]],
      batchCode: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      status: ['ACTIVE', [Validators.required]],
      remarks: [''],
    });

    this.staffForm = this.fb.group({
      staffMap: this.fb.array([]),
    });
  }

  loadBatch() {
    this.loading = true;
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      batchId: this.batchId,
      includeStudents: true,
    };
    this.commonApi.fetchData(payload, 'batch', 'view').subscribe({
      next: (res: any) => {
        this.loading = false;
        this.batch = res?.data || null;
        this.studentRows = this.batch?.students || [];
        this.selected.clear();

        this.editForm.patchValue({
          batchName: this.batch?.batchName,
          batchCode: this.batch?.batchCode,
          startDate: this.epochMsToDateInput(this.batch?.startDate),
          endDate: this.epochMsToDateInput(this.batch?.endDate),
          status: this.batch?.status || 'ACTIVE',
          remarks: this.batch?.remarks || '',
        });

        this.staffFA.clear();
        const sm = Array.isArray(this.batch?.staffMap)
          ? this.batch.staffMap
          : [];
        sm.forEach((r: any) => this.staffFA.push(this.staffRowGroup(r)));
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Failed to load batch');
      },
    });
  }

  shuffleSelected() {
    const ids = Array.from(this.selected);
    if (!this.shuffleToBatchId) return;

    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: localStorage.getItem('tenantId'),
          userId: this.userId(),
          fromBatchId: this.batchId,
          toBatchId: this.shuffleToBatchId,
          studentIds: ids,
        },
        'batch',
        'students/shuffle',
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Students shuffled');
          this.closeOffcanvas();
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Shuffle failed');
        },
      });
  }


  private epochMsToDateInput(ms: any): string {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '';
    const d = new Date(n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  asFormGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  get staffFA(): FormArray {
    return this.staffForm.get('staffMap') as FormArray;
  }

  allSubjectsSelected(): boolean {
    return this.staffFA.controls.every(ctrl => !!ctrl.get('subjectId')?.value);
  }

  removeStaffRow(i: number) {
    this.staffFA.removeAt(i);
  }

  private staffRowGroup(x?: any): FormGroup {
    return this.fb.group({
      subjectId: [safeTrim(x?.subjectId), [Validators.required]],
      subjectName: [safeTrim(x?.subjectName)], 
      staffId: [safeTrim(x?.staffId), [Validators.required]],
      staffName: [safeTrim(x?.staffName)],
    });
  }

  
  filteredStaffMap: { [index: number]: any[] } = {};

  // onSubjectChange(index: number) {
  //   const group = this.staffFA.at(index);
  //   const subjId = group.get('subjectId')?.value;
  //   const subj = this.subjectsList.find((s) => s.subjectId === subjId);
  //   if (subj) {
  //     group.patchValue({ subjectName: subj.subjectName || subj.subjectCode });
  //   }
  // }
  onSubjectChange(index: number) {
    const group = this.staffFA.at(index);
    const subjectId = group.get('subjectId')?.value;
    console.log('Selected SubjectId:', subjectId);
    this.filteredStaffMap[index] = this.staffList.filter(
      staff => staff.subject === subjectId
    );

    console.log('Filtered Staff:', this.filteredStaffMap[index]);
    group.patchValue({
      staffId: '',
      staffName: ''
    });
  }


  // onStaffChange(index: number) {
  //   const group = this.staffFA.at(index);
  //   const sId = group.get('staffId')?.value;
  //   const st = this.staffList.find((s) => s.staffId === sId);
  //   if (st) {
  //     group.patchValue({ staffName: st.staffName });
  //   }
  // }
  onStaffChange(index: number) {
    const group = this.staffFA.at(index);
    const staffId = group.get('staffId')?.value;

    const staff = this.staffList.find(
      s => s.staffId === staffId
    );

    if (staff) {
      group.patchValue({
        staffName: staff.staffName
      });
    }
  }

  addStaffRow() {
    this.staffFA.push(this.staffRowGroup());
  }

  saveStaffMap() {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }
    const staffMap = this.staffFA.value.map((x: any) => ({
      subjectId: safeTrim(x.subjectId),
      subjectName: safeTrim(x.subjectName) || null,
      staffId: safeTrim(x.staffId),
      staffName: safeTrim(x.staffName) || null,
    }));

    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: localStorage.getItem('tenantId'),
          userId: this.userId(),
          batchId: this.batchId,
          staffMap,
        },
        'batch',
        'staff/save',
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Faculty map saved');
          this.closeOffcanvas();
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Save failed');
        },
      });
  }

  // openStudent() {
  //   this.showStudentPanel = true;
  // }

  // Assign Student
  loadEligible() {
    const qp =
      `?page=${this.eligibleQuery.page}&limit=${this.eligibleQuery.limit}` +
      (this.eligibleQuery.search ? `&search=${this.eligibleQuery.search}` : '');
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: localStorage.getItem('tenantId'), batchId: this.batchId },
        'batch',
        `students/eligible${qp}`,
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.eligibleRows = res?.data || [];
          this.eligibleCount = res?.count || 0;
        },
        error: () => (this.loading = false),
      });
  }

  openStudent(mode: 'edit' | 'staff' | 'assign' | 'shuffle') {
    this.showStudentPanel = true;
    this.offcanvasMode = mode;

    if (mode === 'staff') {
      // Fetch Subjects
      if (!this.subjectsList.length) {
        this.commonApi
          .fetchData(
            { entiId: localStorage.getItem('tenantId'), batchId: this.batchId },
            'batch',
            'subjects',
          )
          .subscribe({
            next: (res: any) => {
              this.subjectsList = res?.data || [];
              // this.subject_options = res?.data || [];
            },
          });
      }
      // Fetch Staff
      if (!this.staffList.length) {
        // Using tenant module for staff list as per your context (or wherever 'staff/list' points to)
        this.commonApi
          .fetchData({ entiId: localStorage.getItem('tenantId') }, 'ims/staff', 'list?list=full')
          .subscribe({
            next: (res: any) => {
              this.staffList = res?.data || [];
              // this.faculty_options = res?.datea || [];
            },
          });
      }
    }

    if (mode === 'assign') {
      this.eligibleSelected.clear();
      this.eligibleQuery = { page: 1, limit: 20, search: '' };
      this.loadEligible();
    }

    if (mode === 'shuffle') {
      const ids = Array.from(this.selected);
      if (!ids.length) {
        this.alert.error('Select students from the list first');
        this.closeOffcanvas();
        return;
      }
      this.shuffleToBatchId = '';
    }
  }

  closeOffcanvas() {
    this.offcanvasMode = 'none';
    this.showStudentPanel = false;
  }

  toggleEligible(id: string, checked: boolean) {
    const sid = safeTrim(id);
    if (!sid) return;
    checked
      ? this.eligibleSelected.add(sid)
      : this.eligibleSelected.delete(sid);
  }

  assignEligibleSelected() {
    const ids = Array.from(this.eligibleSelected);
    if (!ids.length) return;
    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: localStorage.getItem('tenantId'),
          userId: this.userId(),
          batchId: this.batchId,
          studentIds: ids,
        },
        'batch',
        'students/assign',
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Students assigned');
          this.closeOffcanvas();
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Assign failed');
        },
      });
  }

  closeStudent() {
    this.showStudentPanel = false;
  }

  triggerConfirmation(type: 'closeBatch' | 'removeStudents') {
    if (type === 'closeBatch') {
      this.confirmData = {
        title: 'Close Batch?',
        message:
          'This will mark the batch as CLOSED and release all assigned students. This action cannot be undone immediately.',
        btnText: 'Yes, Close Batch',
        btnClass: 'btn-danger',
        action: () => this.executeCloseBatch(),
      };
    } else if (type === 'removeStudents') {
      const count = this.selected.size;
      if (count === 0) {
        this.alert.error('Select students first');
        return;
      }
      this.confirmData = {
        title: 'Remove Students?',
        message: `Are you sure you want to remove ${count} student(s) from this batch? They will be moved to the unassigned pool.`,
        btnText: 'Remove',
        btnClass: 'btn-warning',
        action: () => this.executeRemoveStudents(),
      };
    }

    if (!this.bsModal) {
      this.bsModal = new bootstrap.Modal(this.confirmModalRef.nativeElement);
    }
    this.bsModal.show();
  }

  executeCloseBatch() {
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: localStorage.getItem('tenantId'), userId: this.userId(), batchId: this.batchId },
        'batch',
        'batch/close',
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Batch closed');
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Close failed');
        },
      });
  }

  executeRemoveStudents() {
    const ids = Array.from(this.selected);
    this.loading = true;
    this.commonApi
      .fetchData(
        { entiId: localStorage.getItem('tenantId'), userId: this.userId(), studentIds: ids },
        'batch',
        'students/remove',
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Students removed');
          this.selected.clear();
          this.loadBatch();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Remove failed');
        },
      });
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

  saveBatch() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    const startMs = this.dateToEpochMs(v.startDate);
    const endMs = this.dateToEpochMs(v.endDate);

    if (startMs >= endMs) {
      this.alert.error('End Date must be after Start Date');
      return;
    }

    const payload = {
      entiId: localStorage.getItem('tenantId'),
      userId: this.userId(),
      batchId: this.batchId,
      batchName: safeTrim(v.batchName),
      batchCode: safeTrim(v.batchCode),
      startDate: startMs,
      endDate: endMs,
      status: safeTrim(v.status),
      remarks: safeTrim(v.remarks) || null,
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'batch', 'update').subscribe({
      next: () => {
        this.loading = false;
        this.alert.success('Batch updated');
        this.closeOffcanvas();
        this.loadBatch();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Update failed');
      },
    });
  }

  private dateToEpochMs(dateStr: any): number {
    const s = safeTrim(dateStr);
    if (!s) return 0;
    const d = new Date(`${s}T00:00:00`);
    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
  }

  private userId() {
    return (
      localStorage.getItem('userId') || localStorage.getItem('userid') || null
    );
  }

}
