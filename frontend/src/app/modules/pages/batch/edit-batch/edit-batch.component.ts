import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-batch',
  standalone: false,
  templateUrl: './edit-batch.component.html',
  styleUrl: './edit-batch.component.scss'
})
export class EditBatchComponent {
  editBatch!: FormGroup;
  status_options = [
    {label: 'All', value: 'All'},
    {label: 'Draft', value: 'Draft'},
    {label: 'Active', value: 'Active'},
    {label: 'Close', value: 'Close'},
    {label: 'Inactive', value: 'Inactive'}
  ];

  ay_options = [
    {label: 'All', value: 'All'},
    {label: '2024-2025', value: '2024-2025'},
    {label: '2025-2026', value: 'Act2025-2026ive'},
    {label: '2026-2027', value: '2026-2027'},
  ];

  program_options = [
    {label: 'All', value: 'All'},
    {label: 'Program1', value: 'Program1'},
    {label: 'Program2', value: 'Program2'},
    {label: 'Program3', value: 'Program3'},
    {label: 'Program4', value: 'Program4'},
    {label: 'Program5', value: 'Program5'},
    {label: 'Program6', value: 'Program6'},
  ]

  center_options = [
    {label: 'All', value: 'All'},
    {label: 'Coimbatore - Sub Main', value: 'Coimbatore - Sub Main'},
  ]

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder){
    this.breadcrump.set([{label: 'Batch', link: '/app/batch'}, {label: 'Edit'}])
  }

  ngOnInit(): void{
    this.editBatch = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      academic: ['', [Validators.required]],
      program: ['', [Validators.required]],
      center: ['', [Validators.required]],
      filter: ['', [Validators.required]],
      start: ['', [Validators.required]],
      end: ['', [Validators.required]],
      status: ['', [Validators.required]],
      remark: ['', [Validators.required]]
    })
  }

  updateBatch(){}
}
