import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnowledgeCreateComponent } from './knowledge-create.component';

describe('KnowledgeCreateComponent', () => {
  let component: KnowledgeCreateComponent;
  let fixture: ComponentFixture<KnowledgeCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KnowledgeCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KnowledgeCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
