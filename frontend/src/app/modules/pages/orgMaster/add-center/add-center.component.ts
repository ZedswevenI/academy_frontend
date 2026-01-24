import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-add-center',
  standalone: false,
  templateUrl: './add-center.component.html',
  styleUrl: './add-center.component.scss'
})
export class AddCenterComponent {

  centerForm!: FormGroup;
  isEditMode: boolean = false;
  rowData: any;

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private route: ActivatedRoute) {
    const navigation = history.state;
    this.isEditMode = navigation?.isEditMode ?? false;
    this.rowData = navigation?.rowData;
  }

  ngOnInit(): void {
    this.breadcrump.set([{ label: 'Center', link: '/app/org-master/center' }, { label: this.isEditMode ? 'Edit' : 'Add' }])

    this.centerForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      active: [''],
      contact: ['', [Validators.required]],
      area: ['', [Validators.required]],
      pin: ['', [Validators.required]],
      add1: ['', [Validators.required]],
      add2: ['']
    })
  }

  addCenter(){}
}
