import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-create-pro',
  standalone: false,
  templateUrl: './create-pro.component.html',
  styleUrl: './create-pro.component.scss'
})
export class CreateProComponent {
  proForm!: FormGroup;
  isEditMode: boolean = false;
  rowData: any;

  stream_options = [];
  class_options = [];
  start_options = [];
  dur_options = [];

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    const navigation = history.state;
    this.isEditMode = navigation?.isEditMode ?? false;
    this.rowData = navigation?.rowData;
  }

  ngOnInit(): void{
    this.breadcrump.set([{ label: 'Program', link: '/app/org-master/program' }, { label: this.isEditMode ? 'Edit' : 'Add' }])

    this.proForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      stream: ['', [Validators.required]],
      class: ['', [Validators.required]],
      start: ['', [Validators.required]],
      dur: ['', [Validators.required]],
      end: ['', [Validators.required]],
      version: ['', [Validators.required]],
      active: [''],
      eng: [''],
      math: [''],
      phys: [''],
      chem: ['']
    });

  }

  addPro(){}
}
