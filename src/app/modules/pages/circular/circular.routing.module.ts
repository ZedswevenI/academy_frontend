import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CircularComponent } from './circular/circular.component';
import { CreateCircularComponent } from './create-circular/create-circular.component';

const routes: Routes = [
    { path: '', component: CircularComponent, title: 'Circular'},
    { path: 'create', component: CreateCircularComponent, title: 'Circular'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class CircularRoutingModule { }