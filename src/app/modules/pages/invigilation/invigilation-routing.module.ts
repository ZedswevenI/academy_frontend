import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { InvigilationComponent } from './invigilation/invigilation.component';
import { InvigilationviewComponent } from './invigilationview/invigilationview.component';
import { InvigilationcreateComponent } from './invigilationcreate/invigilationcreate.component';

const routes: Routes = [{ path: '', component: InvigilationComponent }, { path: 'create', component: InvigilationcreateComponent }, { path: 'edit/:id', component: InvigilationcreateComponent }, { path: 'view/:id', component: InvigilationviewComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InvigilationRoutingModule {}
