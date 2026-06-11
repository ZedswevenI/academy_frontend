import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ActivityComponent } from './activity/activity.component';
import { createActivityComponent } from './create-activity/create-activity.component';

const routes: Routes = [
    { path: '', component: ActivityComponent, title: 'Activity' },
    { path: 'create', component: createActivityComponent, title: 'Create Activity' }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})

export class ActivityRoutingModule { }