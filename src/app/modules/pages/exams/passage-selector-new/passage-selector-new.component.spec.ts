import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassageSelectorNewComponent } from './passage-selector-new.component';

describe('PassageSelectorNewComponent', () => {
  let component: PassageSelectorNewComponent;
  let fixture: ComponentFixture<PassageSelectorNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PassageSelectorNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassageSelectorNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
