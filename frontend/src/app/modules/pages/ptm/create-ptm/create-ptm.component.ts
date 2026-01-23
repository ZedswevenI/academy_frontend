import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-ptm',
  standalone: false,
  templateUrl: './create-ptm.component.html',
  styleUrl: './create-ptm.component.scss'
})
export class CreatePTMComponent {
  createPtm!: FormGroup;

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' }
  ];
  staff_options = [
    {label: 'Mr. R. Kumar', value: 'Mr. R. Kumar'},
    {label: 'Ms. Anitha', value: 'Ms. Anitha'},
    {label: 'Mr. Prakash', value: 'Mr. Prakash'},
    {label: 'Ms. Revathi', value: 'Ms. Revathi'}
  ]
  mode_options = [
    {label: 'Both', value: 'Both'},
    {label: 'Online', value: 'Online'},
    {label: 'Offline', value: 'Offline'}
  ]
  status_options = [
    {label: 'Completed', value: 'Completed'},
    {label: 'Incompleted', value: 'Incompleted'},
    {label: 'ReScheduled', value: 'ReScheduled'},
    {label: 'Scheduled', value: 'Scheduled'}
  ]

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Ptm', link: '/app/ptm' }, { label: 'Create' }])
  }

  ngOnInit(): void {
    this.createPtm = this.fb.group({
      date: ['', [Validators.required]],
      class: ['', [Validators.required]],
      time: ['', [Validators.required]],
      teacher: ['', [Validators.required]],
      mode: ['', [Validators.required]],
      status: ['', [Validators.required]]
    })
  }

  addPTM(){}
}
