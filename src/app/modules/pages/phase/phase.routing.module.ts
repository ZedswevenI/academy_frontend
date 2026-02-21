import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhaseListComponent } from './phase-list/phase-list.component';
import { PhaseCreateComponent } from './phase-create/phase-create.component';

const routes: Routes = [
  { path: 'create', component: PhaseCreateComponent, title: 'Dashboard' },
  { path: '', component: PhaseListComponent, title: 'Dashboard' }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PhaseRoutingModule { }
