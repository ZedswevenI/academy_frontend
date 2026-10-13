import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetablenewComponent } from './timetablenew.component';

describe('TimetablenewComponent', () => {
  let component: TimetablenewComponent;
  let fixture: ComponentFixture<TimetablenewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimetablenewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetablenewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
