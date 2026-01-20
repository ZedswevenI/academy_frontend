import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PtmComponent } from './ptm/ptm.component';

const routes: Routes = [
    { path: '', component: PtmComponent, title: 'PTM'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class PtmRoutingModule { }