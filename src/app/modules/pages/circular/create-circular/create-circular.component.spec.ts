import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCircularComponent } from './create-circular.component';

describe('CreateCircularComponent', () => {
  let component: CreateCircularComponent;
  let fixture: ComponentFixture<CreateCircularComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateCircularComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateCircularComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
