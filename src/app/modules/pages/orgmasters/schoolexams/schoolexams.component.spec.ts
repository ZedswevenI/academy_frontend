import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolexamsComponent } from './schoolexams.component';

describe('SchoolexamsComponent', () => {
  let component: SchoolexamsComponent;
  let fixture: ComponentFixture<SchoolexamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SchoolexamsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolexamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
