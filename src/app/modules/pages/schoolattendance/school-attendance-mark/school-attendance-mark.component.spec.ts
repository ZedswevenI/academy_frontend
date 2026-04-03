import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolAttendanceMarkComponent } from './school-attendance-mark.component';

describe('SchoolAttendanceMarkComponent', () => {
  let component: SchoolAttendanceMarkComponent;
  let fixture: ComponentFixture<SchoolAttendanceMarkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SchoolAttendanceMarkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolAttendanceMarkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
