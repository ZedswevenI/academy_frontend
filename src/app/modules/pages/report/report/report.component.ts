import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-report',
  standalone: false,
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent {
  reportForm!: FormGroup;
  isProceed: boolean = false;

  selctedReport: string | null = null;
  selectedSubject: any = null;

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' }
  ];
  student_options = [
    { label: 'Arun Kumar', value: 'Arun Kumar' },
    { label: 'Divya Sharma', value: 'Divya Sharma' },
    { label: 'Rahul Verma', value: 'Rahul Verma' },
    { label: 'Sneha Patel', value: 'Sneha Patel' },
    { label: 'Karthik R', value: 'Karthik R' }
  ];
  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]

  subjects = [
    {
      label: 'Maths',
      value: 'Maths',
      report: {
        testDate: '18-01-2026',
        testTitle: 'Unit Test – Algebra',
        description: 'Algebra & Trigonometry',
        batches: 'Batch A',
        myScore: '72 / 100',
        highestScore: '95',
        avgScore: '70'
      }
    },
    {
      label: 'Physics',
      value: 'Physics',
      report: {
        testDate: '15-01-2026',
        testTitle: 'Unit Test – Mechanics',
        description: 'Laws of Motion',
        batches: 'Batch A, Batch B',
        myScore: '68 / 100',
        highestScore: '92',
        avgScore: '66'
      }
    },
    {
      label: 'Chemistry',
      value: 'Chemistry',
      report: {
        testDate: '12-01-2026',
        testTitle: 'Unit Test – Organic',
        description: 'Hydrocarbons',
        batches: 'Batch B',
        myScore: '75 / 100',
        highestScore: '97',
        avgScore: '73'
      }
    },
    {
      label: 'Biology',
      value: 'Biology',
      report: {
        testDate: '10-01-2026',
        testTitle: 'Unit Test – Botany',
        description: 'Cell Structure',
        batches: 'Batch A',
        myScore: '80 / 100',
        highestScore: '98',
        avgScore: '78'
      }
    },
    {
      label: 'Overall',
      value: 'Overall',
      report: {
        testDate: 'Jan 2026',
        testTitle: 'Overall Performance',
        description: 'All Subjects',
        batches: 'Batch A & B',
        myScore: '74 / 100',
        highestScore: '98',
        avgScore: '72'
      }
    }
  ];


  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Report' }])
  }

  ngOnInit(): void {
    this.reportForm = this.fb.group({
      filter: [null, [this.filterValidator]]
    });
  }

  onProceed() {
    this.isProceed = true;
  }

  selectSubject(sub: any) {
    this.selectedSubject = sub;
    this.selctedReport = sub.value;
  }

  filterValidator(control: AbstractControl) {
    const val = control.value;
    if (!val || !val.value1 || !val.value2 || !val.value3) {
      return { required: true };
    }
    return null;
  }

}
