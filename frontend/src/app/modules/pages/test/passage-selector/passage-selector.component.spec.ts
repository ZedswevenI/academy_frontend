import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassageSelectorComponent } from './passage-selector.component';

describe('PassageSelectorComponent', () => {
  let component: PassageSelectorComponent;
  let fixture: ComponentFixture<PassageSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PassageSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassageSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
