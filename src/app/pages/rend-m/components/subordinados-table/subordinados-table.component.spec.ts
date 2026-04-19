import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubordinadosTableComponent } from './subordinados-table.component';

describe('SubordinadosTableComponent', () => {
  let component: SubordinadosTableComponent;
  let fixture: ComponentFixture<SubordinadosTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubordinadosTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubordinadosTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit actionClick', () => {
    const spy = vi.fn();
    component.actionClick.subscribe(spy);
    component.onActionClick('view', { U_IdRendicion: 1 } as any);
    expect(spy).toHaveBeenCalledWith({ action: 'view', item: { U_IdRendicion: 1 } });
  });

  it('should emit pageChange', () => {
    const spy = vi.fn();
    component.pageChange.subscribe(spy);
    component.pageChange.emit(2);
    expect(spy).toHaveBeenCalledWith(2);
  });
});
