import { Injectable, signal, computed } from '@angular/core';
import { RendM } from '../models/rend-m.model';

export type EstadoFiltro = 'todas' | 'abiertas' | 'cerradas' | 'enviadas' | 'aprobadas' | 'sincronizadas' | 'error';
export type VerFiltro = 'propias' | 'subordinados' | 'todas';

@Injectable({ providedIn: 'root' })
export class RendicionFilterService {
  
  private _rendiciones = signal<RendM[]>([]);
  private _rendicionesSubordinados = signal<RendM[]>([]);
  private _search = signal('');
  private _estadoFiltro = signal<EstadoFiltro>('todas');
  private _verFiltro = signal<VerFiltro>('propias');

  readonly rendiciones = this._rendiciones.asReadonly();
  readonly rendicionesSubordinados = this._rendicionesSubordinados.asReadonly();
  readonly search = this._search.asReadonly();
  readonly estadoFiltro = this._estadoFiltro.asReadonly();
  readonly verFiltro = this._verFiltro.asReadonly();

  readonly filtered = computed(() => {
    const rendiciones = this._rendiciones();
    const search = this._search().toLowerCase();
    const estadoFiltro = this._estadoFiltro();

    let base = rendiciones;
    
    if (estadoFiltro === 'abiertas') base = base.filter(r => r.U_Estado === 1);
    else if (estadoFiltro === 'cerradas') base = base.filter(r => r.U_Estado === 2);
    else if (estadoFiltro === 'enviadas') base = base.filter(r => r.U_Estado === 4);
    else if (estadoFiltro === 'aprobadas') base = base.filter(r => r.U_Estado === 7);
    else if (estadoFiltro === 'sincronizadas') base = base.filter(r => r.U_Estado === 5);
    else if (estadoFiltro === 'error') base = base.filter(r => r.U_Estado === 6);

    if (!search) return base;

    return base.filter(r =>
      (r.U_Objetivo ?? '').toLowerCase().includes(search) ||
      (r.U_NombreEmpleado ?? '').toLowerCase().includes(search) ||
      (r.U_NombreCuenta ?? '').toLowerCase().includes(search) ||
      (r.U_NombrePerfil ?? '').toLowerCase().includes(search)
    );
  });

  readonly filteredSubordinados = computed(() => {
    const subordinados = this._rendicionesSubordinados();
    const search = this._search().toLowerCase();
    const estadoFiltro = this._estadoFiltro();

    let base = subordinados;
    
    if (estadoFiltro === 'abiertas') base = base.filter(r => r.U_Estado === 1);
    else if (estadoFiltro === 'cerradas') base = base.filter(r => r.U_Estado === 2);
    else if (estadoFiltro === 'enviadas') base = base.filter(r => r.U_Estado === 4);
    else if (estadoFiltro === 'aprobadas') base = base.filter(r => r.U_Estado === 7);
    else if (estadoFiltro === 'sincronizadas') base = base.filter(r => r.U_Estado === 5);
    else if (estadoFiltro === 'error') base = base.filter(r => r.U_Estado === 6);

    if (!search) return base;

    return base.filter(r =>
      (r.U_Objetivo ?? '').toLowerCase().includes(search) ||
      (r.U_NombreEmpleado ?? '').toLowerCase().includes(search) ||
      (r.U_NombreCuenta ?? '').toLowerCase().includes(search) ||
      (r.U_NombrePerfil ?? '').toLowerCase().includes(search)
    );
  });

  setRendiciones(data: RendM[]) {
    this._rendiciones.set(data);
  }

  setRendicionesSubordinados(data: RendM[]) {
    this._rendicionesSubordinados.set(data);
  }

  setSearch(value: string) {
    this._search.set(value);
  }

  setEstadoFiltro(value: EstadoFiltro) {
    this._estadoFiltro.set(value);
  }

  setVerFiltro(value: VerFiltro) {
    this._verFiltro.set(value);
  }

  estadosNumericos(): number[] {
    const estado = this._estadoFiltro();
    switch (estado) {
      case 'abiertas': return [1];
      case 'cerradas': return [2];
      case 'enviadas': return [4];
      case 'aprobadas': return [3];
      case 'sincronizadas': return [5];
      case 'error': return [6];
      default: return [];
    }
  }

  reset() {
    this._rendiciones.set([]);
    this._rendicionesSubordinados.set([]);
    this._search.set('');
    this._estadoFiltro.set('todas');
    this._verFiltro.set('propias');
  }
}
