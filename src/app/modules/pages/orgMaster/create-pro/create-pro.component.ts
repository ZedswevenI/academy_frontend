import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-pro',
  standalone: false,
  templateUrl: './create-pro.component.html',
  styleUrl: './create-pro.component.scss'
})
export class CreateProComponent {
  proForm!: FormGroup;
  isEditMode: boolean = false;
  rowData: any;

  streamOptions = [
    { label: 'JEE', value: 'JEE' },
    { label: 'NEET', value: 'NEET' },
    { label: 'Foundation', value: 'Foundation' },
  ];
  durationOptions = [1, 2, 3, 4, 5, 6].map((n) => ({
    label: String(n),
    value: n,
  }));
  eligibleClassOptions = Array.from({ length: 9 }, (_, i) => 5 + i).map(
    (n) => ({ label: String(n), value: n }),
  );
  startingClassOptions = Array.from({ length: 8 }, (_, i) => 5 + i).map(
    (n) => ({ label: String(n), value: n }),
  );

  subjectOptions: any[] = [];
  private subjectByCode = new Map<string, any>();
  private subjectByName = new Map<string, any>();
  private existingSubjectIds = new Set<string>();

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router) {
    const navigation = history.state;
    this.isEditMode = navigation?.isEditMode ?? false;
    this.rowData = navigation?.rowData;
  }

  ngOnInit(): void {
    console.log('Received Program:', this.rowData);
    this.breadcrump.set([{ label: 'Org Master' }, { label: 'Program', link: '/app/org-master/program' }, { label: this.isEditMode ? 'Edit' : 'Add' }])

    this.proForm = this.fb.group({
      programName: ['', [Validators.required]],
      programCodes: ['', [Validators.required]],
      target: ['', [Validators.required]],
      eligibleToClass: [null, [Validators.required]],
      startingClass: [null, [Validators.required]],
      duration: [null, [Validators.required]],
      endingClass: [{ value: null, disabled: true }],
      version: ['', [Validators.required]],
      subjects: [[]],
      isActive: [false],
    });

    if (this.rowData) {
      this.proForm.patchValue({
        programName: this.rowData.programName,
        programCodes: this.rowData.programCodes,
        target: this.rowData.target,
        eligibleToClass: this.rowData.eligibleToClass,
        startingClass: this.rowData.startingClass,
        duration: this.rowData.duration,
        version: this.rowData.version,
        isActive: this.rowData.status === 'Active',
        endingClass: this.rowData.endingClass,
        subjects: this.rowData.subjects,
      });
    };

    this.loadMasters();
    this.bindDerivedFields();
  }

  // ---------------- CHECKBOX SUBJECTS ----------------
  isSubjectChecked(subjectId: string): boolean {
    const list = (this.proForm.get('subjects')?.value || []) as any[];
    return list.some((x: any) => String(x) === String(subjectId));
  }


  toggleSubject(subjectId: string, checked: boolean) {
    const ctrl = this.proForm.get('subjects');
    const list = Array.isArray(ctrl?.value) ? [...ctrl!.value] : [];
    const id = String(subjectId);

    const exists = list.some((x: any) => String(x) === id);
    if (checked && !exists) list.push(id);
    if (!checked && exists) {
      const next = list.filter((x: any) => String(x) !== id);
      ctrl?.setValue(next);
      ctrl?.markAsDirty();
      return;
    }
    ctrl?.setValue(list);
    ctrl?.markAsDirty();
  }

  // ---------------- MASTERS ----------------
  private loadMasters() {
    this.commonApi
      .fetchData(
        { entiId: localStorage.getItem('tenantId'), },
        'ims',
        `subject/list?list=full`,
      )
      .subscribe({
        next: (res: any) => {
          const rows = res?.data || [];
          this.subjectOptions = rows.map((s: any) => ({
            label: s.subjectName,
            value: s._id,
            code: (s.subjectCode || '').toString(),
          }));

          // build lookup maps for import validation (UPPER compare)
          this.subjectByCode.clear();
          this.subjectByName.clear();
          this.subjectOptions.forEach((s: any) => {
            const code = this.normKey(s.code);
            const name = this.normKey(s.label);
            if (code) this.subjectByCode.set(code, s);
            if (name) this.subjectByName.set(name, s);
          });
        },
        error: () => {
          this.subjectOptions = [];
          this.subjectByCode.clear();
          this.subjectByName.clear();
        },
      });
  }

  addPro() {
    console.log('Form value before create:', this.proForm.value);

    if (this.isEditMode) {
      const form = this.proForm.value;
      // const form = this.proForm.getRawValue();
      const editingId = this.rowData.recId || this.rowData._id;
      const payload = {
        ...form,
        // status: form.isActive ? 'Active' : 'Inactive',
        entiId: localStorage.getItem('tenantId'),
        recId: editingId
      };
      this.commonApi.fetchData(payload, 'ims/program', 'edit').subscribe({
        next: (res: any) => {
          if (!res.status) {
            this.alert.error(res.message || 'Failed to update program');
            return;
          }
          this.alert.success('Program updated successfully');
          this.router.navigate(['/app/org-master/program']);
        },
        error: () => this.alert.error('Server error while updating program')
      });

    } else {
      const form = this.proForm.value;
      const payload = {
        programName: form.programName,
        programCodes: form.programCodes,
        target: form.target,
        eligibleToClass: form.eligibleToClass,
        startingClass: form.startingClass,
        duration: form.duration,
        version: form.version,
        status: form.isActive ? 'Active' : 'Inactive',
        endingClass: form.endingClass,
        subjects: form.subjects,
        entiId: localStorage.getItem('tenantId'),
      };
      this.commonApi.fetchData(payload, 'ims/program', 'create').subscribe({
        next: (res: any) => {
          console.log('create:', res)
          if (!res.status) {
            this.alert.error(res.message || 'Failed to create program');
            return;
          }
          this.alert.success('Program created successfully');
          this.router.navigate(['/app/org-master/program']);
        },
        error: () => this.alert.error('Server error while Create program')
      });
    }

  }


  
  // ---------------- HELPERS ----------------
  private toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    const s = String(v).trim();
    if (!s) return 0;
    const m = s.match(/-?\d+/);
    if (!m) return 0;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : 0;
  }

  private splitCsv(v: any): string[] {
    const s = (v === null || v === undefined ? '' : String(v)).trim();
    if (!s) return [];
    return s
      .split(',')
      .map((x) => String(x || '').trim())
      .filter(Boolean);
  }

  private normKey(v: any): string {
    return (v === null || v === undefined ? '' : String(v))
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  private bindDerivedFields() {
    const startCtrl = this.proForm.get('startingClass');
    const durCtrl = this.proForm.get('duration');
    const endCtrl = this.proForm.get('endingClass');

    const compute = () => {
      const start = this.toNum(startCtrl?.value);
      const dur = this.toNum(durCtrl?.value);
      if (!start || !dur) {
        endCtrl?.setValue(null, { emitEvent: false });
        return;
      }
      const end = start + dur - 1;
      endCtrl?.setValue(end, { emitEvent: false });
    };

    startCtrl?.valueChanges.subscribe(() => compute());
    durCtrl?.valueChanges.subscribe(() => compute());

    // initial compute
    compute();
  }

}
