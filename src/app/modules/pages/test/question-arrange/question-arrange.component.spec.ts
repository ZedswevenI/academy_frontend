import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionArrangementComponent } from './question-arange.component';

describe('QuestionArrangementComponent', () => {
  let component: QuestionArrangementComponent;
  let fixture: ComponentFixture<QuestionArrangementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestionArrangementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionArrangementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
