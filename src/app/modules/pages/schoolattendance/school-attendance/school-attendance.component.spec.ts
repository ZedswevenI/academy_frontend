import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolAttendanceComponent } from './school-attendance.component';

describe('SchoolAttendanceComponent', () => {
  let component: SchoolAttendanceComponent;
  let fixture: ComponentFixture<SchoolAttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SchoolAttendanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
