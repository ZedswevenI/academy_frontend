import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsnewComponent } from './reportsnew.component';

describe('ReportsnewComponent', () => {
  let component: ReportsnewComponent;
  let fixture: ComponentFixture<ReportsnewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportsnewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsnewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
