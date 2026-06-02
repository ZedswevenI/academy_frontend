import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvigilationviewComponent } from './invigilationview.component';

describe('InvigilationviewComponent', () => {
  let component: InvigilationviewComponent;
  let fixture: ComponentFixture<InvigilationviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InvigilationviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvigilationviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
