/**
 * PerfilSelectorComponent Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilSelectorComponent } from './perfil-selector.component';
import { Permiso } from '@models/permiso.model';

describe('PerfilSelectorComponent', () => {
  let component: PerfilSelectorComponent;
  let fixture: ComponentFixture<PerfilSelectorComponent>;

  const mockPermisos: Permiso[] = [
    { U_IDUSUARIO: 1, U_IDPERFIL: 1, U_NOMBREPERFIL: 'Admin' },
    { U_IDUSUARIO: 2, U_IDPERFIL: 2, U_NOMBREPERFIL: 'Usuario' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Inputs', () => {
    it('should accept loading input', () => {
      component.loading = true;
      expect(component.loading).toBe(true);
    });

    it('should accept permisos input', () => {
      component.permisos = mockPermisos;
      expect(component.permisos).toEqual(mockPermisos);
    });
  });

  describe('hasPerfiles getter', () => {
    it('should return false when permisos is empty', () => {
      component.permisos = [];
      expect(component.hasPerfiles).toBe(false);
    });

    it('should return true when permisos has items', () => {
      component.permisos = mockPermisos;
      expect(component.hasPerfiles).toBe(true);
    });
  });

  describe('onSelect', () => {
    it('should emit select event with permiso', () => {
      let emittedPermiso: Permiso | undefined;
      component.select.subscribe((p: Permiso) => emittedPermiso = p);
      
      const permiso = mockPermisos[0];
      component.onSelect(permiso);

      expect(emittedPermiso).toEqual(permiso);
    });
  });

  describe('getInitial', () => {
    it('should return first letter uppercase', () => {
      expect(component.getInitial('admin')).toBe('A');
      expect(component.getInitial('Usuario')).toBe('U');
    });

    it('should handle empty string', () => {
      expect(component.getInitial('')).toBe('');
    });
  });
});
