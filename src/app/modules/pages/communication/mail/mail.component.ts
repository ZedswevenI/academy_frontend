import { Component, ViewChild, ElementRef } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-mail',
  standalone: false,
  templateUrl: './mail.component.html',
  styleUrl: './mail.component.scss'
})
export class MailComponent {
  mailForm!: FormGroup;
  to: string = '';
  subject: string = '';
  showCc: boolean = false;
  @ViewChild('bodyDiv') bodyDiv!: ElementRef;

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Communiation', link: '/app/communication' }, { label: 'Email' }]);
  }

  ngOnInit(): void{
    this.mailForm = this.fb.group({
      body: ['']
    })
  }
  format(command: string) {
    document.execCommand(command, false);
  }

  sendEmail() {
    const body = this.bodyDiv.nativeElement.innerHTML;
    console.log('To:', this.to);
    console.log('Subject:', this.subject);
    console.log('Body:', body);
    alert('Email sent! (Check console)');
  }
}
