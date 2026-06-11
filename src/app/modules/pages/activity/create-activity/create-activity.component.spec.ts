import { ComponentFixture, TestBed } from '@angular/core/testing';

import { createActivityComponent } from './create-activity.component';

describe('createActivityComponent', () => {
  let component: createActivityComponent;
  let fixture: ComponentFixture<createActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [createActivityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(createActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
