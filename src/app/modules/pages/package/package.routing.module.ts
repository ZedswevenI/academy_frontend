import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PackageComponent } from './package/package.component';
import { PackCreateComponent } from './pack-create/pack-create.component';

const routes: Routes = [
    { path: '', component: PackageComponent, title: 'Package'},
    { path: 'create', component: PackCreateComponent, title: 'Package'}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class PackageRoutingModule { }