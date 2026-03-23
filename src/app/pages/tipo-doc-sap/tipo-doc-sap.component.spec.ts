import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoDocSapComponent } from './tipo-doc-sap.component';

describe('TipoDocSapComponent', () => {
  let component: TipoDocSapComponent;
  let fixture: ComponentFixture<TipoDocSapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoDocSapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TipoDocSapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
