import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HelpPublicRoutingModule } from './help-public-routing.module';
import { HelpViewerComponent } from './help-viewer/help-viewer.component';

@NgModule({
  declarations: [HelpViewerComponent],
  imports: [CommonModule, FormsModule, HelpPublicRoutingModule],
})
export class HelpPublicModule {}
