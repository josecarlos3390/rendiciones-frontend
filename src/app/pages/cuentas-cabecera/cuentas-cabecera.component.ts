import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CuentasCabeceraService } from './cuentas-cabecera.service';
import { ToastService }           from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent }     from '../../shared/paginator/paginator.component';
import { CuentaCabecera }         from '../../models/cuenta-cabecera.model';
import { Perfil }                 from '../../models/perfil.model';

@Component({
  standalone: true,
  selector: 'app-cuentas-cabecera',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, PaginatorComponent],
  templateUrl: './cuentas-cabecera.component.html',
  styleUrls: ['./cuentas-cabecera.component.scss'],
})
export class CuentasCabeceraComponent implements OnInit {

  // ── Datos ────────────────────────────────────────────────
  perfiles:  Perfil[]          = [];
  cuentas:   CuentaCabecera[]  = [];
  filtered:  CuentaCabecera[]  = [];
  paged:     CuentaCabecera[]  = [];

  // ── Filtros ──────────────────────────────────────────────
  selectedPerfilId: number | null = null;
  search  = '';
  loading = false;

  // ── Paginación ───────────────────────────────────────────
  page       = 1;
  limit      = 5;
  totalPages = 1;

  // ── Formulario ───────────────────────────────────────────
  showForm = false;
  isSaving = false;
  form!: FormGroup;

  // ── Confirm dialog ───────────────────────────────────────
  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    private service: CuentasCabeceraService,
    private toast:   ToastService,
    private fb:      FormBuilder,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadPerfiles();
  }

  get selectedPerfil(): Perfil | null {
    return this.perfiles.find(p => p.U_CodPerfil === this.selectedPerfilId) ?? null;
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      cuentaSys:        ['', [Validators.required, Validators.maxLength(50)]],
      cuentaFormatCode: ['', [Validators.required, Validators.maxLength(50)]],
      cuentaNombre:     ['', [Validators.required, Validators.maxLength(150)]],
      cuentaAsociada:   ['N', Validators.required],
    });
  }

  // ── Carga de datos ────────────────────────────────────────

  loadPerfiles() {
    this.service.getPerfiles().subscribe({
      next: (data) => {
        this.perfiles = [...data];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.status === 409 || err?.status === 422) {
          this.toast.error(err?.error?.message || 'Error al cargar perfiles');
        }
      },
    });
  }

  onPerfilChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedPerfilId = val ? Number(val) : null;
    this.loadCuentas();
  }

  loadCuentas() {
    if (!this.selectedPerfilId) {
      this.cuentas = []; this.filtered = []; this.paged = [];
      return;
    }
    this.loading = true;
    this.service.getByPerfil(this.selectedPerfilId).subscribe({
      next: (data) => {
        this.cuentas = data;
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Filtro y paginación ───────────────────────────────────

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

  // ── Agregar ───────────────────────────────────────────────

  openForm() {
    if (!this.selectedPerfilId) { this.toast.error('Seleccione un perfil primero'); return; }
    this.form.reset({ cuentaSys: '', cuentaFormatCode: '', cuentaNombre: '', cuentaAsociada: 'N' });
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.form.reset(); }

  save() {
    if (this.form.invalid || this.isSaving || !this.selectedPerfilId) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    this.service.create({
      idPerfil:         this.selectedPerfilId,
      cuentaSys:        raw.cuentaSys.trim(),
      cuentaFormatCode: raw.cuentaFormatCode.trim(),
      cuentaNombre:     raw.cuentaNombre.trim(),
      cuentaAsociada:   raw.cuentaAsociada,
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