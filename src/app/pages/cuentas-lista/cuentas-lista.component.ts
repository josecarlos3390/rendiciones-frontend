import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CuentasListaService } from './cuentas-lista.service';
import { ToastService }        from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent }  from '../../shared/paginator/paginator.component';
import { CuentaLista }         from '../../models/cuenta-lista.model';
import { Perfil }              from '../../models/perfil.model';

@Component({
  standalone: true,
  selector: 'app-cuentas-lista',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, PaginatorComponent],
  templateUrl: './cuentas-lista.component.html',
  styleUrls: ['./cuentas-lista.component.scss'],
})
export class CuentasListaComponent implements OnInit {

  // ── Datos ───────────────────────────────────────────────
  perfiles:  Perfil[]      = [];
  cuentas:   CuentaLista[] = [];
  filtered:  CuentaLista[] = [];
  paged:     CuentaLista[] = [];

  // ── Filtros ─────────────────────────────────────────────
  selectedPerfilId: number | null = null;
  search = '';
  loading = false;

  // ── Paginación ──────────────────────────────────────────
  page       = 1;
  limit      = 5;
  totalPages = 1;

  // ── Formulario agregar ──────────────────────────────────
  showForm = false;
  isSaving = false;
  form!: FormGroup;

  // ── Confirm dialog ──────────────────────────────────────
  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    private cuentasService: CuentasListaService,
    private toast: ToastService,
    private fb:    FormBuilder,
    private cdr:   ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadPerfiles();
  }

  // ── Helpers ─────────────────────────────────────────────

  get selectedPerfil(): Perfil | null {
    return this.perfiles.find(p => p.U_CodPerfil === this.selectedPerfilId) ?? null;
  }

  // ── Form ────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      cuentaSys:    ['', [Validators.required, Validators.maxLength(50)]],
      cuenta:       ['', [Validators.required, Validators.maxLength(50)]],
      nombreCuenta: ['', [Validators.required, Validators.maxLength(150)]],
    });
  }

  // ── Carga de datos ───────────────────────────────────────

  loadPerfiles() {
    this.cuentasService.getPerfiles().subscribe({
      next: (data) => {
        this.perfiles = [...data];
        this.cdr.detectChanges();
      },
      error: (err: any) => { console.error('loadPerfiles error', err); this.toast.error(err?.error?.message || 'Error al cargar perfiles'); },
    });
  }

  onPerfilChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedPerfilId = val ? Number(val) : null;
    this.loadCuentas();
  }

  loadCuentas() {
    if (!this.selectedPerfilId) {
      this.cuentas  = [];
      this.filtered = [];
      this.paged    = [];
      return;
    }
    this.loading = true;
    this.cuentasService.getByPerfil(this.selectedPerfilId).subscribe({
      next: (data) => {
        this.cuentas = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; },
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
    if (!this.selectedPerfilId) {
      this.toast.error('Seleccione un perfil primero');
      return;
    }
    this.form.reset({ cuentaSys: '', cuenta: '', nombreCuenta: '' });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.form.reset();
  }

  save() {
    if (this.form.invalid || this.isSaving || !this.selectedPerfilId) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    this.cuentasService.create({
      idPerfil:     this.selectedPerfilId,
      cuentaSys:    raw.cuentaSys.trim(),
      cuenta:       raw.cuenta.trim(),
      nombreCuenta: raw.nombreCuenta.trim(),
      relevante:    'N',
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Cuenta agregada');
        this.closeForm();
        this.loadCuentas();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Error al agregar cuenta');
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
        next:  () => { this.toast.success('Cuenta eliminada'); this.loadCuentas(); },
        error: (err: any) => this.toast.error(err?.error?.message || 'Error al eliminar'),
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