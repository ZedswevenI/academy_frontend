import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionImportNewComponent } from './question-import-new.component';

describe('QuestionImportNewComponent', () => {
  let component: QuestionImportNewComponent;
  let fixture: ComponentFixture<QuestionImportNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestionImportNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionImportNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
