import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircularViewComponent } from './circular-view.component';

describe('CircularViewComponent', () => {
  let component: CircularViewComponent;
  let fixture: ComponentFixture<CircularViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CircularViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CircularViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
