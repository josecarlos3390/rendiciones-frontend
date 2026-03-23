import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RendCmpComponent } from './rend-cmp.component';

describe('RendCmpComponent', () => {
  let component: RendCmpComponent;
  let fixture: ComponentFixture<RendCmpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RendCmpComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RendCmpComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
