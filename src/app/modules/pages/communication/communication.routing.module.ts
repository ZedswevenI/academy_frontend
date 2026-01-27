import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommunicationComponent } from './communication/communication.component';
import { WhatsappComponent } from './whatsapp/whatsapp.component';
import { MailComponent } from './mail/mail.component';
import { MsgComponent } from './msg/msg.component';
import { ComListComponent } from './com-list/com-list.component';

const routes: Routes = [
  { path: '', component: ComListComponent, title: 'Communication'},
  { path: 'create', component: CommunicationComponent, title: 'Communication'},
  { path: 'whatsApp', component: WhatsappComponent, title: 'Communication - WhatsAPP'},
  { path: 'email', component: MailComponent, title: 'Communication - EMail'},
  { path: 'message', component: MsgComponent, title: 'Communication - MESSAGE'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommunicationRoutingModule { }
