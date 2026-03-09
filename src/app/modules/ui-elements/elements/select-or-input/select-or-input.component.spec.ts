import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectOrInputComponent } from './select-or-input.component';

describe('SelectOrInputComponent', () => {
  let component: SelectOrInputComponent;
  let fixture: ComponentFixture<SelectOrInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectOrInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectOrInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
