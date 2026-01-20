import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CircularComponent } from './circular/circular.component';

const routes: Routes = [
    { path: '', component: CircularComponent, title: 'Circular'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class CircularRoutingModule { }