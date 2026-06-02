import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';

import { InvigilationRoutingModule } from './invigilation-routing.module';
import { InvigilationComponent } from './invigilation/invigilation.component';
import { InvigilationviewComponent } from './invigilationview/invigilationview.component';
import { InvigilationcreateComponent } from './invigilationcreate/invigilationcreate.component';

@NgModule({
  declarations: [InvigilationComponent, InvigilationviewComponent, InvigilationcreateComponent],
  imports: [CommonModule, FormsModule, RouterModule, InvigilationRoutingModule, UiElementsModule]
})
export class InvigilationModule {}
