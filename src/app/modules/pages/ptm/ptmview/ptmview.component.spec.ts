import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PtmviewComponent } from './ptmview.component';

describe('PtmviewComponent', () => {
  let component: PtmviewComponent;
  let fixture: ComponentFixture<PtmviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PtmviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PtmviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
