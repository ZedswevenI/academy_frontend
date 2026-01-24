import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-feedback',
  standalone: false,
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss'
})
export class FeedbackComponent {
  feedbackForm!: FormGroup;
  isProceed: boolean = false;

  rating = 0;
  comment = '';

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' }
  ];
  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]
  student_options = [
    { label: 'Arun Kumar', value: 'Arun Kumar' },
    { label: 'Divya Sharma', value: 'Divya Sharma' },
    { label: 'Rahul Verma', value: 'Rahul Verma' },
    { label: 'Sneha Patel', value: 'Sneha Patel' },
    { label: 'Karthik R', value: 'Karthik R' }
  ];



  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Feedback' }])
  }

  ngOnInit(): void {
    this.feedbackForm = this.fb.group({
      filter: [null, [this.filterValidator]]
    });
  }

  setRating(value: number) {
    this.rating = value;
  }

  submitFeedback() {
    const payload = {
      rating: this.rating,
      comment: this.comment
    };
    console.log('Feedback Submitted:', payload);
  }

  onProceed() {
    this.isProceed = true;
  }

  filterValidator(control: AbstractControl) {
    const val = control.value;
    if (!val || !val.value1 || !val.value2 || !val.value3) {
      return { required: true };
    }
    return null;
  }

  viewptm(row: any) { }
}
