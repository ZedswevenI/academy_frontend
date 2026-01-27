import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter } from 'rxjs';
import { Router } from '@angular/router';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-communication',
  standalone: false,
  templateUrl: './communication.component.html',
  styleUrl: './communication.component.scss'
})
export class CommunicationComponent {

  communicationForm!: FormGroup;

  class_options = [
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'Class 12', value: 'Class 12' }
  ];
  batch_options = [
    { label: 'Batch A', value: 'Batch A' },
    { label: 'Batch B', value: 'Batch B' },
    { label: 'Batch C', value: 'Batch C' }
  ]
  student_options = [
    { label: 'Arun Kumar', value: 'Arun Kumar' },
    { label: 'Divya Sharma', value: 'Divya Sharma' },
    { label: 'Rahul Verma', value: 'Rahul Verma' },
    { label: 'Sneha Patel', value: 'Sneha Patel' },
    { label: 'Karthik R', value: 'Karthik R' }
  ];

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router, private alertService: AlertService) {
    this.breadcrump.set([{ label: 'Communiation', link: '/app/communication' }, {label: 'Create'}]);
  }

  ngOnInit() {
    this.communicationForm = this.fb.group({
      filter: ['', [Validators.required]],
      whatsapp: [false],
      mail: [false],
      sms: [false]
    });

    const controls = ['whatsapp', 'mail', 'sms'];

    controls.forEach(ctrl => {
      this.communicationForm.get(ctrl)?.valueChanges.subscribe(val => {
        if (val) {
          controls.forEach(other => {
            if (other !== ctrl) {
              this.communicationForm.get(other)?.setValue(false, { emitEvent: false });
            }
          });
        }
      });
    });

  }

  onSubmit() {
    this.alertService.success('Record saved successfully!');

    // const { whatsapp, mail, sms } = this.communicationForm.value;

    // if (whatsapp) {
    //   this.router.navigate(['/app/communication/whatsApp']);
    // }
    // else if (mail) {
    //   this.router.navigate(['/app/communication/email']);
    // }
    // else if (sms) {
    //   this.router.navigate(['/app/communication/message']);
    // }
    // else {
    //   alert('Please select one communication option');
    // }
  }
}
