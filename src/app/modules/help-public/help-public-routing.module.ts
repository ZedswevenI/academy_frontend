import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HelpViewerComponent } from './help-viewer/help-viewer.component';

const routes: Routes = [{ path: '', component: HelpViewerComponent, title: 'Help & Tutorials' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HelpPublicRoutingModule {}
