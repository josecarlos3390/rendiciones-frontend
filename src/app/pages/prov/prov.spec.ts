import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Prov } from './prov';

describe('Prov', () => {
  let component: Prov;
  let fixture: ComponentFixture<Prov>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prov],
    }).compileComponents();

    fixture = TestBed.createComponent(Prov);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
