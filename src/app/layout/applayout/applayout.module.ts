import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApplayoutComponent } from './applayout/applayout.component';
import { HeaderComponent } from './applayout/header/header.component';
import { FooterComponent } from './applayout/footer/footer.component';
import { SidebarComponent } from './applayout/sidebar/sidebar.component';
import { NavbarComponent } from './applayout/navbar/navbar.component';
import { ApplayoutRoutingModule } from './applayout.routing.module';
import { UiElementsModule } from '../../modules/ui-elements/ui-elements.module';

@NgModule({
    declarations: [
        ApplayoutComponent,
        HeaderComponent,
        FooterComponent,
        SidebarComponent,
        NavbarComponent
    ],
    imports: [
        CommonModule,
        ApplayoutRoutingModule,
        UiElementsModule
    ]

})
export class ApplayoutModule { }