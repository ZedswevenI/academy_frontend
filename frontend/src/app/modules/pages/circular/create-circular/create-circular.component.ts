import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-circular',
  standalone: false,
  templateUrl: './create-circular.component.html',
  styleUrl: './create-circular.component.scss'
})
export class CreateCircularComponent {
  circularForm!: FormGroup;
  class_options = [
    {label: 'All', value: 'All'},
    {label: '1-5', value: '1-5'},
    {label: '6-9', value: '6-9'},
    {label: '10-12', value: '10-12'}
  ];
  type_options = [
    {label: 'Academic', value: 'Academic'},
    {label: 'Exam', value: 'Exam'},
    {label: 'Holiday', value: 'Holiday'},
    {label: 'Fee', value: 'Fee'},
    {label: 'Event', value: 'Event'},
    {label: 'General', value: 'General'},
  ];
  issued_options = [
    {label: 'All', value: 'All'},
    {label: 'Students',value: 'Students'}, 
    {label: 'Teachers', value: 'Teachers'}
  ]

  constructor(private breadcrumb: BredcrumpService, private fb: FormBuilder) {
    this.breadcrumb.set([{ label: 'Circular', link: '/app/circular' }, { label: 'Create' }])
  }

  ngOnInit(): void{
    this.circularForm = this.fb.group({
      class: ['', [Validators.required]],
      title: ['', [Validators.required]],
      des: ['', [Validators.required]],
      type: ['', [Validators.required]],
      issue: ['', [Validators.required]],
      date: ['', [Validators.required]]
    })
  }

  addCircular(){}
}
