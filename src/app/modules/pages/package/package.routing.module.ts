import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PackageComponent } from './package/package.component';
import { PackCreateComponent } from './pack-create/pack-create.component';

const routes: Routes = [
    { path: '', component: PackageComponent, title: 'Study Materials'},
    { path: 'create', component: PackCreateComponent, title: 'Study Materials'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class PackageRoutingModule { }