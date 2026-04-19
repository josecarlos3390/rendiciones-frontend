/**
 * RendicionTableComponent Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RendicionTableComponent, RendicionAction } from './rendicion-table.component';
import { RendM } from '@models/rend-m.model';

describe('RendicionTableComponent', () => {
  let component: RendicionTableComponent;
  let fixture: ComponentFixture<RendicionTableComponent>;

  const mockRendicion: RendM = {
    U_IdRendicion: 1,
    U_IdUsuario: 'U001',
    U_IdPerfil: 1,
    U_NomUsuario: 'Test User',
    U_NombrePerfil: 'Test Perfil',
    U_Preliminar: '',
    U_Estado: 1,
    U_Cuenta: 'C001',
    U_NombreCuenta: 'Cuenta Test',
    U_Empleado: 'E001',
    U_NombreEmpleado: 'Juan Perez',
    U_FechaIni: '2024-01-01',
    U_FechaFinal: '2024-01-31',
    U_Monto: 1000,
    U_Objetivo: 'Test objetivo',
    U_FechaCreacion: '2024-01-01',
    U_FechaMod: '2024-01-01',
    U_AUXILIAR1: '',
    U_AUXILIAR2: '',
    U_AUXILIAR3: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RendicionTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RendicionTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('trackByRendicion', () => {
    it('should return U_IdRendicion', () => {
      const result = component.trackByRendicion(0, mockRendicion);
      expect(result).toBe(1);
    });
  });

  describe('getActionMenuItems', () => {
    it('should always include detalle action', () => {
      const items = component.getActionMenuItems(mockRendicion);
      expect(items.some(i => i.id === 'view')).toBe(true);
    });

    it('should include editar when estado is 1 (abierta)', () => {
      const items = component.getActionMenuItems(mockRendicion);
      expect(items.some(i => i.id === 'edit')).toBe(true);
    });

    it('should not include editar when estado is not 1', () => {
      const rendicionCerrada = { ...mockRendicion, U_Estado: 2 };
      const items = component.getActionMenuItems(rendicionCerrada);
      expect(items.some(i => i.id === 'edit')).toBe(false);
    });

    it('should include eliminar when isAdmin is true', () => {
      component.isAdmin = true;
      const rendicionCerrada = { ...mockRendicion, U_Estado: 2 };
      const items = component.getActionMenuItems(rendicionCerrada);
      expect(items.some(i => i.id === 'delete')).toBe(true);
    });

    it('should include eliminar when estado is 1', () => {
      component.isAdmin = false;
      const items = component.getActionMenuItems(mockRendicion);
      expect(items.some(i => i.id === 'delete')).toBe(true);
    });

    it('should always include imprimir', () => {
      const items = component.getActionMenuItems(mockRendicion);
      expect(items.some(i => i.id === 'print')).toBe(true);
    });

    it('should include sincronizar for estados 1, 4, 5, 7', () => {
      component.canSyncDirecto = true;
      [1, 4, 5, 7].forEach(estado => {
        const r = { ...mockRendicion, U_Estado: estado };
        const items = component.getActionMenuItems(r);
        expect(items.some(i => i.id === 'sync')).toBe(true);
      });
    });

    it('should not include sincronizar for other estados', () => {
      component.canSyncDirecto = true;
      [2, 3, 6].forEach(estado => {
        const r = { ...mockRendicion, U_Estado: estado };
        const items = component.getActionMenuItems(r);
        expect(items.some(i => i.id === 'sync')).toBe(false);
      });
    });
  });

  describe('onAction', () => {
    it('should emit action with string id', () => {
      let emitted: RendicionAction | undefined;
      component.action.subscribe((a: RendicionAction) => emitted = a);
      component.onAction('edit', mockRendicion);
      expect(emitted).toEqual({ action: 'edit', rendicion: mockRendicion });
    });

    it('should emit action with ActionMenuItem', () => {
      let emitted: RendicionAction | undefined;
      component.action.subscribe((a: RendicionAction) => emitted = a);
      component.onAction({ id: 'delete', label: 'Eliminar' }, mockRendicion);
      expect(emitted).toEqual({ action: 'delete', rendicion: mockRendicion });
    });
  });

  describe('onPageChange', () => {
    it('should emit page number', () => {
      let emitted: number | undefined;
      component.pageChange.subscribe((p: number) => emitted = p);
      component.onPageChange(2);
      expect(emitted).toBe(2);
    });
  });

  describe('onRetry', () => {
    it('should emit retry event', () => {
      let emitted = false;
      component.retry.subscribe(() => emitted = true);
      component.onRetry();
      expect(emitted).toBe(true);
    });
  });

  describe('getEstadoClass', () => {
    it('should return class for known estado', () => {
      const result = component.getEstadoClass(1);
      expect(result).toBeTruthy();
    });

    it('should return default class for unknown estado', () => {
      const result = component.getEstadoClass(999);
      expect(result).toBe('status-badge');
    });
  });

  describe('getEstadoLabel', () => {
    it('should return label for known estado', () => {
      const result = component.getEstadoLabel(1);
      expect(result).not.toBe('DESCONOCIDO');
    });

    it('should return DESCONOCIDO for unknown estado', () => {
      const result = component.getEstadoLabel(999);
      expect(result).toBe('DESCONOCIDO');
    });
  });
});
