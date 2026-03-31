import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrctjComponent } from './prctj.component';

describe('PrctjComponent', () => {
  let component: PrctjComponent;
  let fixture: ComponentFixture<PrctjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrctjComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrctjComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
