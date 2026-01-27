import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PtmComponent } from './ptm.component';

describe('PtmComponent', () => {
  let component: PtmComponent;
  let fixture: ComponentFixture<PtmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PtmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PtmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
