import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoardexamimportComponent } from './boardexamimport.component';

describe('BoardexamimportComponent', () => {
  let component: BoardexamimportComponent;
  let fixture: ComponentFixture<BoardexamimportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BoardexamimportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoardexamimportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
