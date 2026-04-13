/**
 * RendicionFormComponent Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RendicionFormComponent, RendicionFormData } from './rendicion-form.component';
import { RendM } from '@models/rend-m.model';
import { Permiso } from '@models/permiso.model';
import { CuentaCabecera } from '@models/cuenta-cabecera.model';
import { Empleado } from '@shared/empleado-search/empleado-search.component';
import { FormDirtyService } from '@shared/form-dirty';

// Mock FormDirtyService
class MockFormDirtyService {
  isDirty(form: any, initialValues: any): boolean {
    if (!initialValues) return false;
    return Object.keys(form.value).some(key => form.value[key] !== initialValues[key]);
  }
}

describe('RendicionFormComponent', () => {
  let component: RendicionFormComponent;
  let fixture: ComponentFixture<RendicionFormComponent>;

  const mockPermiso: Permiso = {
    U_IDUSUARIO: 1,
    U_IDPERFIL: 1,
    U_NOMBREPERFIL: 'Test Perfil',
  };

  const mockCuenta: CuentaCabecera = {
    U_IdPerfil: 1,
    U_CuentaSys: 'SYS001',
    U_CuentaFormatCode: '1.1.01.001',
    U_CuentaNombre: 'Cuenta Test',
    U_CuentaAsociada: 'Y',
  };

  const mockEmpleado: Empleado = {
    cardCode: 'E001',
    cardName: 'Juan Perez',
  };

  const mockRendicion: RendM = {
    U_IdRendicion: 1,
    U_IdUsuario: 'U001',
    U_IdPerfil: 1,
    U_NomUsuario: 'Test User',
    U_NombrePerfil: 'Test Perfil',
    U_Preliminar: 'PRE001',
    U_Estado: 1,
    U_Cuenta: '1.1.01.001',
    U_NombreCuenta: 'Cuenta Test',
    U_Empleado: 'E001',
    U_NombreEmpleado: 'Juan Perez',
    U_FechaIni: '2024-01-01T00:00:00',
    U_FechaFinal: '2024-01-31T00:00:00',
    U_Monto: 1500,
    U_Objetivo: 'Test objetivo',
    U_FechaCreacion: '2024-01-01',
    U_FechaMod: '2024-01-01',
    U_AUXILIAR1: '',
    U_AUXILIAR2: '',
    U_AUXILIAR3: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RendicionFormComponent, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: FormDirtyService, useClass: MockFormDirtyService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RendicionFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should build form on init', () => {
      component.ngOnInit();
      expect(component.form).toBeTruthy();
      expect(component.form.get('objetivo')).toBeTruthy();
    });
  });

  describe('ngOnChanges', () => {
    it('should patch edit values when opening with editingRend', () => {
      component.editingRend = mockRendicion;
      component.isOpen = true;
      component.ngOnInit();
      
      component.ngOnChanges({ isOpen: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } } as any);
      
      expect(component.form.get('objetivo')?.value).toBe('Test objetivo');
      expect(component.form.get('monto')?.value).toBe(1500);
    });

    it('should reset form when opening without editingRend', () => {
      component.permisoActivo = mockPermiso;
      component.isOpen = true;
      component.ngOnInit();
      
      component.ngOnChanges({ isOpen: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } } as any);
      
      expect(component.form.get('idPerfil')?.value).toBe(1);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('tieneMultiplesCuentas should return true when more than 1 cuenta', () => {
      component.cuentasCabecera = [mockCuenta, { ...mockCuenta, U_CuentaSys: 'SYS002' }];
      expect(component.tieneMultiplesCuentas).toBe(true);
    });

    it('tieneMultiplesCuentas should return false with 1 or 0 cuentas', () => {
      component.cuentasCabecera = [mockCuenta];
      expect(component.tieneMultiplesCuentas).toBe(false);
      
      component.cuentasCabecera = [];
      expect(component.tieneMultiplesCuentas).toBe(false);
    });

    it('empleadoRequired should return true when cuentaEsAsociada is Y', () => {
      component.cuentaEsAsociada = 'Y';
      expect(component.empleadoRequired).toBe(true);
    });

    it('empleadoRequired should return false when cuentaEsAsociada is N', () => {
      component.cuentaEsAsociada = 'N';
      expect(component.empleadoRequired).toBe(false);
    });
  });

  describe('onEmpleadoSelected', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should patch form with empleado data', () => {
      component.onEmpleadoSelected(mockEmpleado);
      
      expect(component.form.get('empleado')?.value).toBe('E001');
      expect(component.form.get('nombreEmpleado')?.value).toBe('Juan Perez');
    });

    it('should emit empleadoChange event', () => {
      let emitted: Empleado | null | undefined;
      component.empleadoChange.subscribe((e: Empleado | null) => emitted = e);
      component.onEmpleadoSelected(mockEmpleado);
      expect(emitted).toEqual(mockEmpleado);
    });

    it('should handle null empleado', () => {
      component.onEmpleadoSelected(null);
      
      expect(component.form.get('empleado')?.value).toBe('');
      expect(component.form.get('nombreEmpleado')?.value).toBe('');
    });
  });

  describe('onCuentaChange', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should patch form with cuenta data', () => {
      component.onCuentaChange(mockCuenta);
      
      expect(component.form.get('cuenta')?.value).toBe('1.1.01.001');
      expect(component.form.get('nombreCuenta')?.value).toBe('Cuenta Test');
    });

    it('should emit cuentaChange event', () => {
      let emitted: CuentaCabecera | null | undefined;
      component.cuentaChange.subscribe((c: CuentaCabecera | null) => emitted = c);
      component.onCuentaChange(mockCuenta);
      expect(emitted).toEqual(mockCuenta);
    });
  });

  describe('onSave', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.permisoActivo = mockPermiso;
      component.form.patchValue({
        idPerfil: 1,
        cuenta: '1.1.01.001',
        nombreCuenta: 'Cuenta Test',
        empleado: 'E001',
        nombreEmpleado: 'Juan Perez',
        objetivo: 'Test',
        fechaIni: '2024-01-01',
        fechaFinal: '2024-01-31',
        monto: 1000,
      });
    });

    it('should emit save with form data when valid', () => {
      let emitted: RendicionFormData | undefined;
      component.save.subscribe((d: RendicionFormData) => emitted = d);
      component.onSave();
      
      expect(emitted).toBeTruthy();
      expect(emitted!.objetivo).toBe('Test');
      expect(emitted!.monto).toBe(1000);
    });

    it('should mark all touched when form is invalid', () => {
      component.form.patchValue({ objetivo: '' });
      let markAllCalled = false;
      const originalMarkAll = component.form.markAllAsTouched.bind(component.form);
      component.form.markAllAsTouched = () => { markAllCalled = true; originalMarkAll(); };
      
      let emitted: RendicionFormData | undefined;
      component.save.subscribe((d: RendicionFormData) => emitted = d);
      
      component.onSave();
      
      expect(markAllCalled).toBe(true);
      expect(emitted).toBeUndefined();
    });
  });

  describe('onCancel', () => {
    it('should emit cancel event', () => {
      let emitted = false;
      component.cancel.subscribe(() => emitted = true);
      component.onCancel();
      expect(emitted).toBe(true);
    });
  });

  describe('fieldChanged', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.editingRend = mockRendicion;
      component['patchEditValues']();
    });

    it('should return false when not editing', () => {
      component.editingRend = null;
      expect(component.fieldChanged('objetivo')).toBe(false);
    });

    it('should return true when field value changed', () => {
      component.form.patchValue({ objetivo: 'Cambiado' });
      expect(component.fieldChanged('objetivo')).toBe(true);
    });

    it('should return false when field value unchanged', () => {
      expect(component.fieldChanged('objetivo')).toBe(false);
    });
  });
});
