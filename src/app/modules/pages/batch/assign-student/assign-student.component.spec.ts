import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignStudentComponent } from './assign-student.component';

describe('AssignStudentComponent', () => {
  let component: AssignStudentComponent;
  let fixture: ComponentFixture<AssignStudentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssignStudentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignStudentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
