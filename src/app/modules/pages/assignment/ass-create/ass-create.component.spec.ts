import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssCreateComponent } from './ass-create.component';

describe('AssCreateComponent', () => {
  let component: AssCreateComponent;
  let fixture: ComponentFixture<AssCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
