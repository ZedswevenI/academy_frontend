import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssViewComponent } from './ass-view.component';

describe('AssViewComponent', () => {
  let component: AssViewComponent;
  let fixture: ComponentFixture<AssViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
