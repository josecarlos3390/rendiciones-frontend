import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntegracionComponent } from './integracion.component';

describe('IntegracionComponent', () => {
  let component: IntegracionComponent;
  let fixture: ComponentFixture<IntegracionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntegracionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IntegracionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
