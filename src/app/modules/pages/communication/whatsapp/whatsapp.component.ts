import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-whatsapp',
  standalone: false,
  templateUrl: './whatsapp.component.html',
  styleUrl: './whatsapp.component.scss'
})
export class WhatsappComponent {

  contacts = [
    { id: 1, name: 'Arun', lastMessage: 'See you!' },
    { id: 2, name: 'Gokul', lastMessage: 'Hello!' },
    { id: 3, name: 'Ramya', lastMessage: 'Got it.' }
  ];

  // activeContact: any = null;
  activeContact: any = this.contacts.find(contact => contact.id === 1);

  messages = [
    { text: 'Hi!', fromMe: false, time: '10:00 AM' },
    { text: 'Hello!', fromMe: true, time: '10:01 AM' }
  ];

  newMessage = '';


  constructor(private breadcrump: BredcrumpService) {
    this.breadcrump.set([{ label: 'Communiation', link: '/app/communication' }, { label: 'WhatsApp' }]);
  }

   selectContact(contact: any) {
    this.activeContact = contact;
    // Load messages for this contact if needed
  }

  sendMessage() {
    if (this.newMessage.trim() && this.activeContact) {
      this.messages.push({ text: this.newMessage, fromMe: true, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
      this.newMessage = '';
      // Scroll to bottom or add response logic
    }
  }

}
