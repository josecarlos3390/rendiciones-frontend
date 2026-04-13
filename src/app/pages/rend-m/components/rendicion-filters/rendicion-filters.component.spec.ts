/**
 * RendicionFiltersComponent Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RendicionFiltersComponent, VerFiltro, EstadoFiltro } from './rendicion-filters.component';

describe('RendicionFiltersComponent', () => {
  let component: RendicionFiltersComponent;
  let fixture: ComponentFixture<RendicionFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RendicionFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RendicionFiltersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('showVerFiltro getter', () => {
    it('should return false when user is not aprobador, sinAprobador, or admin', () => {
      component.esAprobador = false;
      component.sinAprobador = false;
      component.isAdmin = false;
      expect(component.showVerFiltro).toBe(false);
    });

    it('should return true when user is aprobador', () => {
      component.esAprobador = true;
      expect(component.showVerFiltro).toBe(true);
    });

    it('should return true when user is sinAprobador', () => {
      component.sinAprobador = true;
      expect(component.showVerFiltro).toBe(true);
    });

    it('should return true when user is admin', () => {
      component.isAdmin = true;
      expect(component.showVerFiltro).toBe(true);
    });
  });

  describe('totalCount getter', () => {
    it('should return totalPropias when verFiltro is propias', () => {
      component.verFiltro = 'propias';
      component.totalPropias = 5;
      component.totalSubordinados = 3;
      expect(component.totalCount).toBe(5);
    });

    it('should return totalSubordinados when verFiltro is subordinados', () => {
      component.verFiltro = 'subordinados';
      component.totalPropias = 5;
      component.totalSubordinados = 3;
      expect(component.totalCount).toBe(3);
    });

    it('should return sum when verFiltro is todas', () => {
      component.verFiltro = 'todas';
      component.totalPropias = 5;
      component.totalSubordinados = 3;
      expect(component.totalCount).toBe(8);
    });
  });

  describe('countLabel getter', () => {
    it('should return singular when count is 1', () => {
      component.verFiltro = 'propias';
      component.totalPropias = 1;
      expect(component.countLabel).toBe('1 rendición');
    });

    it('should return plural when count is not 1', () => {
      component.verFiltro = 'propias';
      component.totalPropias = 5;
      expect(component.countLabel).toBe('5 rendiciones');
    });
  });

  describe('Event emitters', () => {
    it('should emit verFiltroChange', () => {
      let emitted: VerFiltro | undefined;
      component.verFiltroChange.subscribe((v: VerFiltro) => emitted = v);
      component.onVerFiltroChange('subordinados');
      expect(emitted).toBe('subordinados');
    });

    it('should emit estadoFiltroChange', () => {
      let emitted: EstadoFiltro | undefined;
      component.estadoFiltroChange.subscribe((v: EstadoFiltro) => emitted = v);
      component.onEstadoFiltroChange('abiertas');
      expect(emitted).toBe('abiertas');
    });

    it('should emit searchChange', () => {
      let emitted: string | undefined;
      component.searchChange.subscribe((v: string) => emitted = v);
      component.onSearchChange('test query');
      expect(emitted).toBe('test query');
    });

    it('should emit searchCleared', () => {
      let emitted = false;
      component.searchCleared.subscribe(() => emitted = true);
      component.onSearchCleared();
      expect(emitted).toBe(true);
    });
  });
});
