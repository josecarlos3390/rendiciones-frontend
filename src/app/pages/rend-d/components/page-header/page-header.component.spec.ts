/**
 * PageHeaderComponent Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';
import { RendM } from '@models/rend-m.model';

describe('PageHeaderComponent', () => {
  let component: PageHeaderComponent;
  let fixture: ComponentFixture<PageHeaderComponent>;

  const mockCabecera: RendM = {
    U_IdRendicion: 123,
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
      imports: [PageHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Inputs', () => {
    it('should accept cabecera input', () => {
      component.cabecera = mockCabecera;
      expect(component.cabecera).toEqual(mockCabecera);
    });

    it('should accept isReadonly input', () => {
      component.isReadonly = true;
      expect(component.isReadonly).toBe(true);
    });

    it('should accept documentosCount input', () => {
      component.documentosCount = 5;
      expect(component.documentosCount).toBe(5);
    });

    it('should accept importando input', () => {
      component.importando = true;
      expect(component.importando).toBe(true);
    });
  });

  describe('Event emitters', () => {
    it('should emit back event', () => {
      let emitted = false;
      component.back.subscribe(() => emitted = true);
      component.back.emit();
      expect(emitted).toBe(true);
    });

    it('should emit exportar event', () => {
      let emitted = false;
      component.exportar.subscribe(() => emitted = true);
      component.exportar.emit();
      expect(emitted).toBe(true);
    });

    it('should emit formato event', () => {
      let emitted = false;
      component.formato.subscribe(() => emitted = true);
      component.formato.emit();
      expect(emitted).toBe(true);
    });

    it('should emit imprimir event', () => {
      let emitted = false;
      component.imprimir.subscribe(() => emitted = true);
      component.imprimir.emit();
      expect(emitted).toBe(true);
    });

    it('should emit adicionar event', () => {
      let emitted = false;
      component.adicionar.subscribe(() => emitted = true);
      component.adicionar.emit();
      expect(emitted).toBe(true);
    });

    it('should emit importar event with file', () => {
      const mockFile = new File([''], 'test.xlsx');
      let emittedFile: File | undefined;
      component.importar.subscribe((f: File) => emittedFile = f);
      component.onImportarFile({ target: { files: [mockFile] } } as any);
      expect(emittedFile).toBe(mockFile);
    });
  });
});
