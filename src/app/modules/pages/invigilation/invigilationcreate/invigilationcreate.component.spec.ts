import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvigilationcreateComponent } from './invigilationcreate.component';

describe('InvigilationcreateComponent', () => {
  let component: InvigilationcreateComponent;
  let fixture: ComponentFixture<InvigilationcreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InvigilationcreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvigilationcreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
