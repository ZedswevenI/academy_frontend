import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteTableComponent } from './delete-table.component';

describe('DeleteTableComponent', () => {
  let component: DeleteTableComponent;
  let fixture: ComponentFixture<DeleteTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
