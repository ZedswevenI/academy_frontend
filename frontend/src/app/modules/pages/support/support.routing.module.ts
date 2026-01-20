import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupportComponent } from './support/support.component';
import { NewTicketComponent } from './new-ticket/new-ticket.component';
import { ExistingTicketComponent } from './existing-ticket/existing-ticket.component';

const routes: Routes = [
    { path: '', component: SupportComponent, title: 'Support' },
    { path: 'new', component: NewTicketComponent, title: 'Support'},
    { path: 'exist', component: ExistingTicketComponent, title: 'Support'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class SupportRoutingModule { }