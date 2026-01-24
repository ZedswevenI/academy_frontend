import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-dep',
  standalone: false,
  templateUrl: './create-dep.component.html',
  styleUrl: './create-dep.component.scss'
})
export class CreateDepComponent {
@Input() isEditMode = false;
@Input() rowData: any;
@Output() close = new EventEmitter<void>();
@Output() save = new EventEmitter<any>();

centerForm!: FormGroup;

constructor(private fb: FormBuilder) {}

ngOnInit() {
  this.centerForm = this.fb.group({
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
    active: ['']
  });

  if (this.isEditMode && this.rowData) {
    this.centerForm.patchValue(this.rowData);
  }
}

submit() {
  if (this.centerForm.invalid) return;
  this.save.emit(this.centerForm.value);
}
}
