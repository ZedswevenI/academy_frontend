import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrgMasterComponent } from './org-master.component';

describe('OrgMasterComponent', () => {
  let component: OrgMasterComponent;
  let fixture: ComponentFixture<OrgMasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrgMasterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrgMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
