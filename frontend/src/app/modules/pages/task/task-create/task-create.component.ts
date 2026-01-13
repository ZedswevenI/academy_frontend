import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task-create',
  standalone: false,
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.scss'
})
export class TaskCreateComponent {
  taskForm! : FormGroup;
  faculty_options = [
    {label: 'Dr. Rajesh Kumar', value: 'Dr. Rajesh Kumar'},
    {label: 'Prof. Anitha Sharma', value: 'Prof. Anitha Sharma'},
    {label: 'Dr. Suresh Menon', value: 'Dr. Suresh Menon'},
    {label: 'Prof. Kavitha Rao', value: 'Prof. Kavitha Rao'},
    {label: 'Dr. Arjun Patel', value: 'Dr. Arjun Patel'}
  ];

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router){
    this.breadcrump.set([{label: 'Task', link: '/app/task'}, {label: 'Create'}])
  }

  ngOnInit(): void{
    this.taskForm = this.fb.group({
      task : ['', [Validators.required]],
      faculty: ['', [Validators.required]],
      due: ['', [Validators.required]],
      file: [''],
      desc: ['']
    })
  }

  //file upload
  onFilesSelected(files: File[]) {
    console.log(files);
  }

  addTask(){
    this.router.navigate(['/app/task'])
  }
}
