import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-support',
  standalone: false,
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent {
  supportForm!: FormGroup;
  isProceed: boolean = false;
  isUnassign: boolean = false;
  confirmAssign: boolean = false;

  isUpdate: boolean = false;
  isForward: boolean = false;

  columnsArray = [
    { key: 'ticket', label: 'Ticket NO', sortable: true },
    { key: 'area', label: 'Area', sortable: false },
    { key: 'subject', label: 'Subject', sortable: false },
    { key: 'detail', label: 'Details', sortable: false }
  ];
  dataArray = [
    { ticket: 1002345, area: 'Technical Support', subject: 'Login Issue', detail: 'User unable to login to portal' },
    { ticket: 1002346, area: 'Academic Support', subject: 'Course Material', detail: 'Request for semester syllabus' },
    { ticket: 1002347, area: 'Fee Related', subject: 'Payment Error', detail: 'Unable to process tuition fee payment' },
    { ticket: 1002348, area: 'General Inquiry', subject: 'Holiday Schedule', detail: 'Query about upcoming holidays' },
    { ticket: 1002349, area: 'Other', subject: 'Feedback', detail: 'Suggestion for improving portal interface' }
  ];
  action = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewSupport(row)
    },
  ]

  employee_options = [
    { label: 'Arun Kumar', value: 'Arun Kumar' },
    { label: 'Priya Sharma', value: 'Priya Sharma' },
    { label: 'Suresh Reddy', value: 'Suresh Reddy' },
    { label: 'Kavya Nair', value: 'Kavya Nair' },
    { label: 'Rahul Verma', value: 'Rahul Verma' }
  ];

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Support' }])
  }

  ngOnInit(): void {
    this.supportForm = this.fb.group({
      employee: ['', Validators.required],
      complete: [''],
      notComplete: [''],
      forward: ['']
    });

    const controls = ['complete', 'notComplete', 'forward'];

    controls.forEach(ctrl => {
      this.supportForm.get(ctrl)?.valueChanges.subscribe(val => {
        if (val) {
          controls.forEach(other => {
            if (other !== ctrl) {
              this.supportForm.get(other)?.setValue(false, { emitEvent: false });
            }
          });
        }
      });
    });

  }

  viewSupport(row: any) {
    this.isUnassign = true;
  }

  onClose() {
    this.isUnassign = false;
    this.isUpdate = false;
  }

  onUpdate() {
    this.isUnassign = false;
    this.isUpdate = true;
  }
  closeUpdate() {
    this.isUpdate = false;
  }

  forward() {
    this.isUpdate = false;
    this.isForward = true;
  }
  closeForward() {
    this.isForward = false;
  }

  onSubmit() {
    const { complete, notComplete, forward } = this.supportForm.value;

    if (forward) {
      this.isForward = true;
      this.isUpdate = false;
      this.supportForm.patchValue({ complete: false, notComplete: false });
    } else if (complete) {
      this.isUpdate = false;
    } else if (notComplete) {
      this.isUpdate = false;
    } else {
      alert('Please select one option');
    }
  }
}
