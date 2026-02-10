import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentEnableComponent } from './assignment-enable.component';

describe('AssignmentEnableComponent', () => {
  let component: AssignmentEnableComponent;
  let fixture: ComponentFixture<AssignmentEnableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssignmentEnableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignmentEnableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
