import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackresultsComponent } from './feedbackresults.component';

describe('FeedbackresultsComponent', () => {
  let component: FeedbackresultsComponent;
  let fixture: ComponentFixture<FeedbackresultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FeedbackresultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackresultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
