import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-create-student',
  standalone: false,
  templateUrl: './create-student.component.html',
  styleUrl: './create-student.component.scss'
})
export class CreateStudentComponent {
  studentForm!: FormGroup;
  
  status_options=[
    {label: 'Active', value: 'active'},
    {label: 'Inactive', value: 'inactive'}
  ]
  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder){
    this.breadcrump.set([{label: 'Student', link: '/app/student'}, {label: 'Create'}])
  }

  ngOnInit(){
    this.studentForm = this.fb.group({
      name: ['', [Validators.required]],
      admission: ['', [Validators.required]],
      program: ['', [Validators.required]],
      center: ['', [Validators.required]],
      status: ['', [Validators.required]],
      mobile: ['', [Validators.required]],
    })
  }

  addStudent(){}
}
