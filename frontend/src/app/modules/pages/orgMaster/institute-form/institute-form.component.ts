import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-institute-form',
  standalone: false,
  templateUrl: './institute-form.component.html',
  styleUrl: './institute-form.component.scss'
})
export class InstituteFormComponent {
  institueForm!: FormGroup;

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder){
    this.breadcrump.set([{label: 'Institute', link: '/app/org-master/institute'}, {label: 'Edit'}])
  }

  ngOnInit(): void{
    this.institueForm = this.fb.group({
      institute: ['', [Validators.required]],
      code: ['', [Validators.required]],
      active: [false],
      add1: ['', [Validators.required]],
      add2: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      pin: ['', [Validators.required]],
      email: ['', [Validators.required]],
      phone: ['', [Validators.required]]
    })
  }

  updateInstitute(){}
}
