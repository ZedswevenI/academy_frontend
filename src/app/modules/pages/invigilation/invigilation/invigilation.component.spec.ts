import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvigilationComponent } from './invigilation.component';

describe('InvigilationComponent', () => {
  let component: InvigilationComponent;
  let fixture: ComponentFixture<InvigilationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InvigilationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvigilationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
