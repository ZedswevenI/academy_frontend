import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchperformanceComponent } from './batchperformance.component';

describe('BatchperformanceComponent', () => {
  let component: BatchperformanceComponent;
  let fixture: ComponentFixture<BatchperformanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BatchperformanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BatchperformanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
