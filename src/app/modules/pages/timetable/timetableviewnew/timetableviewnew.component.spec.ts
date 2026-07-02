import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableviewnewComponent } from './timetableviewnew.component';

describe('TimetableviewnewComponent', () => {
  let component: TimetableviewnewComponent;
  let fixture: ComponentFixture<TimetableviewnewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimetableviewnewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetableviewnewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
