import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestimportComponent } from './testimport.component';

describe('TestimportComponent', () => {
  let component: TestimportComponent;
  let fixture: ComponentFixture<TestimportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestimportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestimportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
