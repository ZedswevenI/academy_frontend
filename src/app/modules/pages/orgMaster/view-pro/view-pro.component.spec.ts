import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewProComponent } from './view-pro.component';

describe('ViewProComponent', () => {
  let component: ViewProComponent;
  let fixture: ComponentFixture<ViewProComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewProComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewProComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
