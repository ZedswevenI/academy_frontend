import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-phase-create',
  standalone: false,
  templateUrl: './phase-create.component.html',
  styleUrl: './phase-create.component.scss'
})
export class PhaseCreateComponent implements OnInit {

  tenantId: string = '';
  loading      = false;
  topicsLoading = false;

  // Edit mode
  isEditMode = false;
  editData: any = null;
  phaseId: string = '';

  phaseForm!: FormGroup;

  // ── All classes (full list) ──
  allClasses = [
    { label: '6th',       value: 6  },
    { label: '7th',       value: 7  },
    { label: '8th',       value: 8  },
    { label: '9th',       value: 9  },
    { label: '10th',      value: 10 },
    { label: '11th',      value: 11 },
    { label: '12th',      value: 12 },
    { label: '12th Pass', value: 13 }
  ];

  // Filtered based on selected program
  classes: any[] = [...this.allClasses];

  // All subjects from API
  allSubjects: any[] = [];
  // Filtered based on selected program
  subjects: any[] = [];

  // Programs
  programs: any[] = [];
  selectedProgram: any = null;

  availableTopics: any[] = [];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId') || '';

    const state: any = history.state;
    if (state?.phase) {
      this.isEditMode = true;
      this.editData   = state.phase;
      this.phaseId    = state.phase.phaseId;
      this.breadcrump.set([{ label: 'Phase Plan', link: '/app/phase' }, { label: 'Edit' }]);
    } else {
      this.breadcrump.set([{ label: 'Phase Plan', link: '/app/phase' }, { label: 'Create' }]);
    }
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadPrograms();
    this.loadSubjects();
  }

  // ====================================================
  // FORM INIT
  // ====================================================

  private initializeForm(): void {
    this.phaseForm = this.fb.group({
      programId: ['', Validators.required],
      phaseName: ['', Validators.required],
      classNo:   [null, Validators.required],
      subjectId: ['', Validators.required],
      sortOrder: [1, [Validators.required, Validators.min(1)]],
      topics:    this.fb.array([])
    });

    // Program change → filter class & subject
    this.phaseForm.get('programId')?.valueChanges.subscribe(val => {
      this.onProgramChange(val);
    });

    // Class / Subject change → load topics (create mode only)
    this.phaseForm.get('classNo')?.valueChanges.subscribe(() => {
      if (!this.isEditMode) this.onClassOrSubjectChange();
    });

    this.phaseForm.get('subjectId')?.valueChanges.subscribe(() => {
      if (!this.isEditMode) this.onClassOrSubjectChange();
    });
  }

  get topicsArray(): FormArray {
    return this.phaseForm.get('topics') as FormArray;
  }

  // ====================================================
  // PROGRAM CHANGE
  // ====================================================

  onProgramChange(programId: string, resetFields = true): void {
    this.selectedProgram = this.programs.find(p => p.programId === programId) || null;

    if (resetFields) {
      this.phaseForm.patchValue(
        { classNo: null, subjectId: '' },
        { emitEvent: false }
      );
      this.topicsArray.clear();
      this.availableTopics = [];
    }

    if (!this.selectedProgram) {
      this.classes  = [...this.allClasses];
      this.subjects = [...this.allSubjects];
      return;
    }

    // Filter classes between startingClass and endingClass
    this.classes = this.allClasses.filter(
      c => c.value >= this.selectedProgram.startingClass &&
           c.value <= this.selectedProgram.endingClass
    );

    // Filter subjects by program's subjects array (list of _ids)
    const programSubjectIds: string[] = this.selectedProgram.subjects || [];
    this.subjects = this.allSubjects.filter(s =>
      programSubjectIds.includes(s._id)
    );
  }

  // ====================================================
  // LOAD PROGRAMS
  // ====================================================

  private loadPrograms(): void {
    this.commonApi.fetchData(
      { entiId: this.tenantId },
      'ims/program',
      'list?list=full'
    ).subscribe({
      next: (res: any) => {
        this.programs = (res?.data || []).filter((p: any) => p.status === 'Active');
      },
      error: () => this.alert.error('Error loading programs')
    });
  }

  // ====================================================
  // LOAD SUBJECTS
  // ====================================================

  private loadSubjects(): void {
    this.commonApi.fetchData(
      { entiId: this.tenantId },
      'ims/subject',
      'list?list=full'
    ).subscribe({
      next: (res: any) => {
        this.allSubjects = res?.data || [];
        this.subjects    = [...this.allSubjects];

        if (this.isEditMode && this.editData) {
          this.populateEditForm();
        }
      },
      error: () => this.alert.error('Error loading subjects')
    });
  }

  // ====================================================
  // EDIT MODE PATCH
  // ====================================================

private populateEditForm(): void {
  const d = this.editData;

  // ✅ Extract plain string IDs from nested objects
  const programId  = typeof d.programId  === 'object' ? d.programId?.programId  : d.programId;
  const subjectId  = typeof d.subjectId  === 'object' ? d.subjectId?._id        : d.subjectId;
  const classNo    = d.classNo;

  // Step 1 — apply program filter first (populates classes & subjects arrays)
  if (programId) {
    this.onProgramChange(programId, false);
  }

  // Step 2 — patch all fields AFTER subjects array is populated
  this.phaseForm.patchValue({
    programId: programId || '',
    phaseName: d.phaseName,
    classNo:   classNo,
    subjectId: subjectId,   // ✅ now a plain _id string
    sortOrder: d.sortOrder
  }, { emitEvent: false });

  // Step 3 — lock fields in edit mode
  this.phaseForm.get('classNo')?.disable({ emitEvent: false });
  this.phaseForm.get('subjectId')?.disable({ emitEvent: false });
  this.phaseForm.get('programId')?.disable({ emitEvent: false });

  // Step 4 — load topics using resolved plain IDs
  this.loadAvailableTopicsForEdit(classNo, subjectId, d.topics || []);
}

  private loadAvailableTopicsForEdit(classNo: number, subjectId: string, existingTopics: any[]): void {
    this.topicsLoading = true;

    const body = {
      tenantId: this.tenantId,
      classNo:  Number(classNo),
      programId : this.phaseForm.getRawValue().programId,
      subjectId
    };

    this.commonApi.fetchData(body, 'institue/phase', 'available-topics')
      .subscribe({
        next: (res: any) => {
          this.availableTopics = res?.data || [];
          this.buildTopicsFormArrayForEdit(this.availableTopics, existingTopics);
          this.topicsLoading = false;
        },
        error: () => {
          this.alert.error('Error loading topics');
          this.topicsLoading = false;
        }
      });
  }

  private buildTopicsFormArrayForEdit(available: any[], existing: any[]): void {
    this.topicsArray.clear();

    const existingMap = new Map<string, any>();
    existing.forEach(t => existingMap.set(t.topicId, t));

    const availableIds = new Set(available.map(t => t.topicId));

    available.forEach((topic: any) => {
      const existingEntry = existingMap.get(topic.topicId);
      const isSelected    = !!existingEntry;
      const estHours      = existingEntry?.estHours ?? null;
      this.topicsArray.push(
        this.buildTopicGroup(topic.topicId, topic.topicName, topic.sortOrder, estHours, isSelected)
      );
    });

    existing.forEach((t: any) => {
      if (!availableIds.has(t.topicId)) {
        this.topicsArray.push(
          this.buildTopicGroup(t.topicId, t.topicName, t.sortOrder, t.estHours, true)
        );
      }
    });
  }

  // ====================================================
  // CREATE MODE — TOPIC LOAD
  // ====================================================

  private onClassOrSubjectChange(): void {
    const classNo   = this.phaseForm.get('classNo')?.value;
    const subjectId = this.phaseForm.get('subjectId')?.value;

    this.topicsArray.clear();
    this.availableTopics = [];

    if (classNo && subjectId) {
      this.loadAvailableTopics(classNo, subjectId);
    }
  }

  private loadAvailableTopics(classNo: number, subjectId: string): void {
    this.topicsLoading = true;
    const body = { tenantId: this.tenantId, classNo: Number(classNo), subjectId,  programId: this.phaseForm.get('programId')?.value, };

    this.commonApi.fetchData(body, 'institue/phase', 'available-topics')
      .subscribe({
        next: (res: any) => {
          this.availableTopics = res?.data || [];
          this.buildTopicsFormArray();
          this.topicsLoading = false;
        },
        error: () => {
          this.alert.error('Error loading topics');
          this.topicsLoading = false;
        }
      });
  }

  private buildTopicsFormArray(): void {
    this.topicsArray.clear();
    this.availableTopics.forEach((topic: any) => {
      this.topicsArray.push(
        this.buildTopicGroup(topic.topicId, topic.topicName, topic.sortOrder, null, true)
      );
    });
  }

  // ====================================================
  // SHARED TOPIC GROUP BUILDER
  // ====================================================

  private buildTopicGroup(
    topicId: string,
    topicName: string,
    sortOrder: number,
    estHours: number | null,
    selected: boolean
  ): FormGroup {
    const group = this.fb.group({
      topicId:   [topicId],
      topicName: [topicName],
      sortOrder: [sortOrder],
      estHours:  [estHours, selected ? [Validators.min(1)] : []],
      selected:  [selected]
    });

    if (!selected) group.get('estHours')?.disable();

    group.get('selected')?.valueChanges.subscribe((isSelected: any) => {
      const ctrl = group.get('estHours');
      if (isSelected) {
        ctrl?.enable();
        ctrl?.setValidators([Validators.min(1)]);
      } else {
        ctrl?.disable();
        ctrl?.clearValidators();
        ctrl?.setValue(null);
      }
      ctrl?.updateValueAndValidity();
    });

    return group;
  }

  isAllSelected(): boolean {
    return this.topicsArray.controls.length > 0 &&
      this.topicsArray.controls.every(c => c.get('selected')?.value === true);
  }

  onSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.topicsArray.controls.forEach(c => c.get('selected')?.setValue(checked));
  }

  getTopicControl(index: number, controlName: string) {
    return this.topicsArray.at(index).get(controlName);
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  submitPhase(): void {
    if (this.phaseForm.invalid) {
      this.alert.error('Please fill all required fields');
      this.phaseForm.markAllAsTouched();
      return;
    }

    const formValue = this.phaseForm.getRawValue();

    const selectedTopics = formValue.topics
      .filter((t: any) => t.selected)
      .map((t: any) => ({
        topicId:   t.topicId,
        topicName: t.topicName,
        estHours:  Number(t.estHours),
        sortOrder: t.sortOrder
      }));

    if (selectedTopics.length === 0) {
      this.alert.error('Please select at least one topic');
      return;
    }

    if (this.isEditMode) {
      this.updatePhase(formValue, selectedTopics);
    } else {
      this.createPhase(formValue, selectedTopics);
    }
  }

  private createPhase(formValue: any, selectedTopics: any[]): void {
    const payload = {
      tenantId:  this.tenantId,
      programId: formValue.programId,         // ✅ included
      phaseName: formValue.phaseName,
      classNo:   Number(formValue.classNo),
      subjectId: formValue.subjectId,
      sortOrder: formValue.sortOrder,
      topics:    selectedTopics
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'institue/phase', 'create')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success('Phase plan created successfully');
            this.router.navigate(['/app/phase']);
          }
        },
        error: (e) => { this.loading = false; this.alert.error(e.error.message); }
      });
  }

  private updatePhase(formValue: any, selectedTopics: any[]): void {
    const payload = {
      tenantId:  this.tenantId,
      phaseId:   this.phaseId,
      programId: formValue.programId,         // ✅ included
      phaseName: formValue.phaseName,
      sortOrder: formValue.sortOrder,
      topics:    selectedTopics
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'institue/phase', 'update')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.alert.success('Phase plan updated successfully');
            this.router.navigate(['/app/phase']);
          }
        },
        error: (e) => { this.loading = false; this.alert.error(e.error.message); }
      });
  }

  cancel(): void {
    this.router.navigate(['/app/phase']);
  }
}