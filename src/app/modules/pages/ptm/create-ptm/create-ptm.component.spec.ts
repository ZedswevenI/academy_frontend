import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePTMComponent } from './create-ptm.component';

describe('CreatePTMComponent', () => {
  let component: CreatePTMComponent;
  let fixture: ComponentFixture<CreatePTMComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreatePTMComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePTMComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
