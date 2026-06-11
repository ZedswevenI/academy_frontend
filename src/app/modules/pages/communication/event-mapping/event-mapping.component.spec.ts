import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventMappingComponent } from './event-mapping.component';

describe('EventMappingComponent', () => {
  let component: EventMappingComponent;
  let fixture: ComponentFixture<EventMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventMappingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
