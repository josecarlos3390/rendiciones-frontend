import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CuentasListaService }   from './cuentas-lista.service';
import { ToastService }          from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent }    from '../../shared/paginator/paginator.component';
import { PerfilSelectComponent } from '../../shared/perfil-select/perfil-select.component';
import { CuentaSearchComponent } from '../../shared/cuenta-search/cuenta-search.component';
import { SearchInputComponent } from '../../shared/debounce';
import { CuentaLista }           from '../../models/cuenta-lista.model';
import { Perfil }                from '../../models/perfil.model';
import { ChartOfAccount }        from '../../services/sap.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-cuentas-lista',
  imports: [
    CommonModule,
    FormsModule,
    ConfirmDialogComponent,
    PaginatorComponent,
    PerfilSelectComponent,
    CuentaSearchComponent,
    SearchInputComponent,
  ],
  templateUrl: './cuentas-lista.component.html',
  styleUrls: ['./cuentas-lista.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CuentasListaComponent implements OnInit {

  // ── Datos ───────────────────────────────────────────────
  cuentas:  CuentaLista[] = [];
  filtered: CuentaLista[] = [];
  paged:    CuentaLista[] = [];

  // ── Perfil seleccionado ──────────────────────────────────
  selectedPerfilId: number | null = null;
  selectedPerfil:   Perfil | null = null;

  // ── Filtros ─────────────────────────────────────────────
  search  = '';
  loading = false;

  // ── Paginación ──────────────────────────────────────────
  page       = 1;
  limit      = 5;
  totalPages = 1;

  // ── Formulario agregar ──────────────────────────────────
  showForm      = false;
  isSaving      = false;
  selectedCuenta: ChartOfAccount | null = null;
  cuentaTouched = false;

  // ── Confirm dialog ──────────────────────────────────────
  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    public  auth: AuthService,
    private cuentasService: CuentasListaService,
    private toast: ToastService,
    private cdr:   ChangeDetectorRef,
  ) {}

  ngOnInit() {}

  // ── Callback de PerfilSelectComponent ───────────────────

  onPerfilChange(id: number | null) {
    this.selectedPerfilId = id;
    this.loadCuentas();
  }

  // ── Carga de datos ───────────────────────────────────────

  loadCuentas(onComplete?: () => void) {
    if (!this.selectedPerfilId) {
      this.cuentas = []; this.filtered = []; this.paged = [];
      return;
    }
    this.loading = true;
    this.cuentasService.getByPerfil(this.selectedPerfilId).subscribe({
      next: (data) => {
        this.cuentas = data;
        this.loading = false;
        this.applyFilter();
        this.cdr.markForCheck();
        onComplete?.();
      },
      error: () => { this.loading = false; this.cdr.markForCheck();
      onComplete?.(); },
    });
  }

  // ── Filtro y paginación ──────────────────────────────────

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.cuentas.filter(c =>
      (c.U_Cuenta       ?? '').toLowerCase().includes(q) ||
      (c.U_NombreCuenta ?? '').toLowerCase().includes(q) ||
      (c.U_CuentaSys    ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
  }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  // ── Agregar cuenta ────────────────────────────────────────

  openForm() {
    if (!this.selectedPerfilId) { this.toast.error('Seleccione un perfil primero'); return; }
    this.selectedCuenta = null;
    this.cuentaTouched  = false;
    this.showForm       = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm       = false;
    this.selectedCuenta = null;
    this.cuentaTouched  = false;
    this.cdr.markForCheck();
  }

  onCuentaSelected(account: ChartOfAccount | null) {
    this.selectedCuenta = account;
    this.cuentaTouched  = true;
  }

  save() {
    this.cuentaTouched = true;
    if (!this.selectedCuenta || this.isSaving || !this.selectedPerfilId) return;

    this.isSaving = true;
    this.cuentasService.create({
      idPerfil:     this.selectedPerfilId,
      cuentaSys:    this.selectedCuenta.code,
      cuenta:       this.selectedCuenta.formatCode,
      nombreCuenta: this.selectedCuenta.name,
      relevante:    'N',
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.loadCuentas(() => {
          this.toast.exito('Cuenta agregada');
          this.closeForm();
        });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Error al agregar cuenta');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmRemove(c: CuentaLista) {
    this.openDialog({
      title:        '¿Eliminar cuenta?',
      message:      `Se eliminará "${c.U_NombreCuenta}" (${c.U_Cuenta}) del perfil.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.cuentasService.remove(c.U_IdPerfil, c.U_CuentaSys).subscribe({
        next:  () => { this.toast.exito('Cuenta eliminada'); this.loadCuentas(); this.cdr.markForCheck(); },
        error: (err: any) => { this.toast.error(err?.error?.message || 'Error al eliminar'); this.cdr.markForCheck(); },
      });
    });
  }

  // ── Dialog ────────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }
}