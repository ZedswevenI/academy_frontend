import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackreportComponent } from './feedbackreport.component';

describe('FeedbackreportComponent', () => {
  let component: FeedbackreportComponent;
  let fixture: ComponentFixture<FeedbackreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FeedbackreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
