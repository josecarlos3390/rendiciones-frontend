import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CuentasCabeceraService } from './cuentas-cabecera.service';
import { ToastService }           from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent }     from '../../shared/paginator/paginator.component';
import { PerfilSelectComponent }  from '../../shared/perfil-select/perfil-select.component';
import { CuentaSearchComponent }  from '../../shared/cuenta-search/cuenta-search.component';
import { CuentaCabecera }         from '../../models/cuenta-cabecera.model';
import { Perfil }                 from '../../models/perfil.model';
import { ChartOfAccount }         from '../../services/sap.service';

@Component({
  standalone: true,
  selector: 'app-cuentas-cabecera',
  imports: [
    CommonModule,
    FormsModule,
    ConfirmDialogComponent,
    PaginatorComponent,
    PerfilSelectComponent,
    CuentaSearchComponent,
  ],
  templateUrl: './cuentas-cabecera.component.html',
  styleUrls: ['./cuentas-cabecera.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasCabeceraComponent implements OnInit {

  // ── Datos ────────────────────────────────────────────────
  cuentas:  CuentaCabecera[] = [];
  filtered: CuentaCabecera[] = [];
  paged:    CuentaCabecera[] = [];

  // ── Cuenta seleccionada en el modal ──────────────────────
  selectedAccount: ChartOfAccount | null = null;

  // ── Perfil seleccionado ───────────────────────────────────
  selectedPerfilId: number | null = null;
  selectedPerfil:   Perfil | null = null;   // asignable desde el template via (perfilObjChange)

  // ── Filtros ──────────────────────────────────────────────
  search  = '';
  loading = false;

  // ── Paginación ───────────────────────────────────────────
  page       = 1;
  limit      = 5;
  totalPages = 1;

  // ── Modal ────────────────────────────────────────────────
  showForm = false;
  isSaving = false;

  // ── Confirm dialog ───────────────────────────────────────
  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    private service: CuentasCabeceraService,
    private toast:   ToastService,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit() {}

  // ── Callbacks de los componentes shared ──────────────────

  /** Recibe el id del perfil desde <app-perfil-select> */
  onPerfilChange(id: number | null) {
    this.selectedPerfilId = id;
    this.loadCuentas();
  }

  /** Recibe la cuenta seleccionada desde <app-cuenta-search> */
  onAccountChange(account: ChartOfAccount | null) {
    this.selectedAccount = account;
    this.cdr.markForCheck();
  }

  // ── Carga de cuentas ─────────────────────────────────────

  loadCuentas() {
    if (!this.selectedPerfilId) {
      this.cuentas = []; this.filtered = []; this.paged = [];
      return;
    }
    this.loading = true;
    this.service.getByPerfil(this.selectedPerfilId).subscribe({
      next: (data) => {
        this.cuentas = data;
        this.loading = false;
        this.applyFilter();
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  // ── Filtro tabla ─────────────────────────────────────────

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.cuentas.filter(c =>
      (c.U_CuentaFormatCode ?? '').toLowerCase().includes(q) ||
      (c.U_CuentaNombre     ?? '').toLowerCase().includes(q) ||
      (c.U_CuentaSys        ?? '').toLowerCase().includes(q),
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

  // ── Modal ────────────────────────────────────────────────

  openForm() {
    if (!this.selectedPerfilId) { this.toast.error('Seleccione un perfil primero'); return; }
    this.selectedAccount = null;
    this.showForm        = true;
  }

  closeForm() {
    this.showForm        = false;
    this.selectedAccount = null;
  }

  save() {
    if (!this.selectedAccount || this.isSaving || !this.selectedPerfilId) return;
    this.isSaving = true;
    const a = this.selectedAccount;

    this.service.create({
      idPerfil:         this.selectedPerfilId,
      cuentaSys:        a.code,
      cuentaFormatCode: a.formatCode,
      cuentaNombre:     a.name,
      cuentaAsociada:   a.lockManual === 'tYES' ? 'Y' : 'N',
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Cuenta agregada');
        this.closeForm();
        this.loadCuentas();
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err?.status === 409 || err?.status === 422) {
          this.toast.error(err?.error?.message || 'Error al agregar cuenta');
        }
      },
    });
  }

  // ── Eliminar ──────────────────────────────────────────────

  confirmRemove(c: CuentaCabecera) {
    this.openDialog({
      title:        '¿Eliminar cuenta?',
      message:      `Se eliminará "${c.U_CuentaNombre}" (${c.U_CuentaFormatCode}) del perfil.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.service.remove(c.U_IdPerfil, c.U_CuentaSys).subscribe({
        next:  () => { this.toast.success('Cuenta eliminada'); this.loadCuentas(); },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al eliminar');
          }
        },
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
