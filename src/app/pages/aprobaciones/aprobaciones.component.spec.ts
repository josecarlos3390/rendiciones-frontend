import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprobacionesComponent } from './aprobaciones.component';

describe('AprobacionesComponent', () => {
  let component: AprobacionesComponent;
  let fixture: ComponentFixture<AprobacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobacionesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AprobacionesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
