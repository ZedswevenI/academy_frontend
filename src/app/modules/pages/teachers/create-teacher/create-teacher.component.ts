import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-teacher',
  standalone: false,
  templateUrl: './create-teacher.component.html',
  styleUrl: './create-teacher.component.scss'
})
export class CreateTeacherComponent {
  teacherForm!: FormGroup;

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' },
  ]

  subject_options = [
    { label: 'Maths', value: 'Maths' },
    { label: 'Physics', value: 'Physics' },
    { label: 'Chemistry', value: 'Chemistry' },
    { label: 'Biology', value: 'Biology' }
  ]

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Teachers', link: '/app/teacher' }, { label: 'Create' }])
  }

  ngOnInit(): void {
    this.teacherForm = this.fb.group({
      name: ['', [Validators.required]],
      staff: ['', [Validators.required]],
      id: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      mail: ['', [Validators.required]],
      center: ['', [Validators.required]],
      dep: ['', [Validators.required]],
      week: ['', [Validators.required]],
      join: ['', [Validators.required]],
      relieve: ['', [Validators.required]],
      type: ['', [Validators.required]],
      sub: ['', [Validators.required]],
      update: ['', [Validators.required]],
    })
  }
  addTeacher() { }
}
