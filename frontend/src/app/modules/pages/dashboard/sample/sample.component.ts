import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';


@Component({
  selector: 'app-sample',
  standalone: false,
  templateUrl: './sample.component.html',
  styleUrl: './sample.component.scss'
})
export class SampleComponent {
  form!: FormGroup;

  //select
  field_options: any[] = [
    { label: 'Text Field', value: 'text' },
    { label: 'Number Field', value: 'number' }
  ];

  //multiselect
  field_options2 = [
    { label: 'Text Field', value: 'text' },
    { label: 'Number Field', value: 'number' },
    { label: 'Date Field', value: 'date' }
  ];

  //radiobutton
  radioOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' }
  ];

  //autocomplete
  countries = [
    { id: 1, name: 'India' },
    { id: 2, name: 'USA' },
    { id: 3, name: 'Germany' }
  ];

  //readonly
  showcountries = false;

  constructor(private fb: FormBuilder, private alertService: AlertService, private breadcrumb: BredcrumpService) { 
    this.breadcrumb.set([{ label: 'Dashboard' }]);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      location: ['', [Validators.required]],
      type: ['', [Validators.required]],
      check: ['', [Validators.required]],
      selectedFields: [[], Validators.required],
      gender: ['', [Validators.required]],
      country: ['', [Validators.required]],
      specific: ['', [Validators.required]],
      conform: [''],
      desc: [''],
      file: [''],
      // countryName: [''], 
      // countryId: [null],  
    })
  }

  //importfile
  onFilesSelected(files: File[]) {
    console.log(files);
  }

  //autocomplete
  onCountrySelect(event: any) {
    console.log('Selected country:', event);

    // set the id for readonly
    this.form.get('countryId')?.setValue(event.id);

    // set name for autocomplete
    this.form.get('countryName')?.setValue(event.name);
  }


}
