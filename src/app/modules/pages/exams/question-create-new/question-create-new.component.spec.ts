import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionCreateNewComponent } from './question-create-new.component';

describe('QuestionCreateNewComponent', () => {
  let component: QuestionCreateNewComponent;
  let fixture: ComponentFixture<QuestionCreateNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestionCreateNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionCreateNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
