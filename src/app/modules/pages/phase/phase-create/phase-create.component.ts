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
  loading = false;
  topicsLoading = false;

  phaseForm!: FormGroup;

  classes = [
    { label: '6th', value: 6 },
    { label: '7th', value: 7 },
    { label: '8th', value: 8 },
    { label: '9th', value: 9 },
    { label: '10th', value: 10 },
    { label: '11th', value: 11 },
    { label: '12th', value: 12 },
    { label: '12th Pass', value: 13 }
  ];

  subjects: any[] = [];
  availableTopics: any[] = [];

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId') || '';
    this.breadcrump.set([{ label: 'Phase Plan', link: '/app/phase-plan' }, { label: 'Create' }]);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadSubjects();
  }

  private initializeForm(): void {
    this.phaseForm = this.fb.group({
      phaseName: ['', Validators.required],
      classNo: [null, Validators.required],
      subjectId: ['', Validators.required],
      sortOrder: [1, [Validators.required, Validators.min(1)]],
      topics: this.fb.array([])
    });

    // When class or subject changes, reload topics
    this.phaseForm.get('classNo')?.valueChanges.subscribe(() => {
      this.onClassOrSubjectChange();
    });

    this.phaseForm.get('subjectId')?.valueChanges.subscribe(() => {
      this.onClassOrSubjectChange();
    });
  }

  get topicsArray(): FormArray {
    return this.phaseForm.get('topics') as FormArray;
  }

  private loadSubjects(): void {
    const body = { entiId: this.tenantId };
    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          this.subjects = res?.data || [];
        },
        error: () => this.alert.error('Error loading subjects')
      });
  }

  private onClassOrSubjectChange(): void {
    const classNo = this.phaseForm.get('classNo')?.value;
    const subjectId = this.phaseForm.get('subjectId')?.value;

    // Clear existing topics
    this.topicsArray.clear();
    this.availableTopics = [];

    if (classNo && subjectId) {
      this.loadAvailableTopics(classNo, subjectId);
    }
  }

  private loadAvailableTopics(classNo: number, subjectId: string): void {
    this.topicsLoading = true;
    const body = {
      tenantId: this.tenantId,
      classNo: Number(classNo),
      subjectId: subjectId
    };

    this.commonApi.fetchData(body, 'batch/phase', 'available-topics')
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
      const group = this.fb.group({
        topicId: [topic.topicId],
        topicName: [topic.topicName],
        sortOrder: [topic.sortOrder],
        estHours: [null, [Validators.min(1)]],
        selected: [true]
      });

      // Toggle estHours enabled/disabled based on checkbox
      group.get('selected')?.valueChanges.subscribe((isSelected: any) => {
        const estHoursCtrl = group.get('estHours');
        if (isSelected) {
          estHoursCtrl?.enable();
          estHoursCtrl?.setValidators([Validators.min(1)]);
        } else {
          estHoursCtrl?.disable();
          estHoursCtrl?.clearValidators();
        }
        estHoursCtrl?.updateValueAndValidity();
      });

      this.topicsArray.push(group);
    });
  }
  onSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.topicsArray.controls.forEach(c => c.get('selected')?.setValue(checked));
  }

  getTopicControl(index: number, controlName: string) {
    return this.topicsArray.at(index).get(controlName);
  }

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
        topicId: t.topicId,
        topicName: t.topicName,
        estHours: Number(t.estHours),
        sortOrder: t.sortOrder
      }));

    if (selectedTopics.length === 0) {
      this.alert.error('Please select at least one topic');
      return;
    }

    const payload = {
      tenantId: this.tenantId,
      phaseName: formValue.phaseName,
      classNo: Number(formValue.classNo),
      subjectId: formValue.subjectId,
      sortOrder: formValue.sortOrder,
      topics: selectedTopics
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'batch/phase', 'create')
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.router.navigate(['/app/phase']);
             this.alert.success('Phase plan created successfully');

          }
        },
        error: () => {
          this.loading = false;
          this.alert.error('Error creating phase plan');
        }
      });
  }

  isAllSelected(): boolean {
    return this.topicsArray.controls.length > 0 &&
      this.topicsArray.controls.every(c => c.get('selected')?.value === true);
  }

  // onSelectAll(event: Event): void {
  //   const checked = (event.target as HTMLInputElement).checked;
  //   this.topicsArray.controls.forEach(c => c.get('selected')?.setValue(checked));
  // }

  cancel(): void {
    this.router.navigate(['/app/phase']);
  }
}