import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup } from '@angular/forms';

interface ChatMessage {
  text: string;
  time: string;
  sent: boolean; // true = sent by user, false = received
}


@Component({
  selector: 'app-msg',
  standalone: false,
  templateUrl: './msg.component.html',
  styleUrl: './msg.component.scss'
})
export class MsgComponent {

  chatMessages: ChatMessage[] = [
    { text: 'Hello sir', time: '09:10 AM', sent: false },
    { text: 'Yes, tell me', time: '09:11 AM', sent: true },
    { text: 'Assignment submitted?', time: '09:12 AM', sent: false },
  ];

  newMessage: string = '';

  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder) {
    this.breadcrump.set([{ label: 'Communiation', link: '/app/communication' }, { label: 'SMS' }]);
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.chatMessages.push({ text: this.newMessage, time: time, sent: true });
    this.newMessage = '';

    // Scroll to bottom after sending
    setTimeout(() => {
      const container = document.querySelector('.messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  }
}
