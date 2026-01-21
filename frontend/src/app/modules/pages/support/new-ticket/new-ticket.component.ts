import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-new-ticket',
  standalone: false,
  templateUrl: './new-ticket.component.html',
  styleUrl: './new-ticket.component.scss'
})
export class NewTicketComponent {
  ticketForm!: FormGroup;
  ticketNumber!: number;

  area_options = [
    { label: 'Technical Support', value: 'Technical Support' },
    { label: 'Academic Support', value: 'Academic Support' },
    { label: 'Fee Related', value: 'Fee Related' },
    { label: 'General Inquiry', value: 'General Inquiry' },
    { label: 'Others', value: 'Others' }
  ]

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.ticketForm = this.fb.group({
      subject: ['', [Validators.required]],
      area: ['', [Validators.required]],
      detail: ['', [Validators.required]]
    })
    this.generateTicketNumber();
  }


  generateTicketNumber() {
    this.ticketNumber = Math.floor(1000000 + Math.random() * 9000000);
  }
  createTicket() { }
}
