import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDepComponent } from './create-dep.component';

describe('CreateDepComponent', () => {
  let component: CreateDepComponent;
  let fixture: ComponentFixture<CreateDepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateDepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateDepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
