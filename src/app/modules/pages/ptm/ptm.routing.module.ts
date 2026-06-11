import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PtmComponent } from './ptm/ptm.component';
import { CreatePTMComponent } from './create-ptm/create-ptm.component';
import { PtmviewComponent } from './ptmview/ptmview.component';

const routes: Routes = [{ path: '', component: PtmComponent, title: 'PTM' }, { path: 'create', component: CreatePTMComponent, title: 'PTM' }, { path: 'view/:id', component: PtmviewComponent, title: 'PTM Details' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PtmRoutingModule {}
