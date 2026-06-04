import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlumniimportComponent } from './alumniimport.component';

describe('AlumniimportComponent', () => {
  let component: AlumniimportComponent;
  let fixture: ComponentFixture<AlumniimportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlumniimportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlumniimportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
