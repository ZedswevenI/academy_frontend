import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelBulkMailComponent } from './excel-bulk-mail.component';

describe('ExcelBulkMailComponent', () => {
  let component: ExcelBulkMailComponent;
  let fixture: ComponentFixture<ExcelBulkMailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExcelBulkMailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExcelBulkMailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
