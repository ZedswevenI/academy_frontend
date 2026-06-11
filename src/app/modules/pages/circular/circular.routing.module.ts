import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CircularComponent } from './circular/circular.component';
import { CreateCircularComponent } from './create-circular/create-circular.component';
import { CircularViewComponent } from './circular-view/circular-view.component';

const routes: Routes = [
    { path: '', component: CircularComponent, title: 'Circular' },
    { path: 'create', component: CreateCircularComponent, title: 'Circular' },
    { path: 'view', component: CircularViewComponent, title: 'Circular' },

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class CircularRoutingModule { }