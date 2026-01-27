import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PackCreateComponent } from './pack-create.component';

describe('PackCreateComponent', () => {
  let component: PackCreateComponent;
  let fixture: ComponentFixture<PackCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PackCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PackCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
