import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators, ValueChangeEvent } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ass-create',
  standalone: false,
  templateUrl: './test-create.component.html',
  styleUrl: './test-create.component.scss'
})
export class TestCreateComponent {
  
  constructor(private breadcrump: BredcrumpService, private fb: FormBuilder, private router: Router) {
    this.breadcrump.set([{ label: 'Assignment', link: '/app/tests' }, { label: 'Create' }])
  }
 
  addAss() {
    this.router.navigate(['/app/assignment'])
  }
 

}
