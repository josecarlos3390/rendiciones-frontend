import { RouterModule } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';

import { RendMService } from './rend-m.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { AuthService } from '../../auth/auth.service';
import {
  RendM, CreateRendMPayload,
  ESTADO_LABEL, ESTADO_CLASS,
} from '../../models/rend-m.model';

@Component({
  standalone: true,
  selector: 'app-rend-m',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ConfirmDialogComponent, PaginatorComponent],
  templateUrl: './rend-m.component.html',
  styleUrls: ['./rend-m.component.scss'],
})
export class RendMComponent implements OnInit {

  rendiciones:  RendM[] = [];
  filtered:     RendM[] = [];
  paged:        RendM[] = [];
  search        = '';
  loading       = false;
  loadError     = false;

  // Paginación
  page       = 1;
  limit      = 10;
  totalPages = 1;

  showForm       = false;
  editingRend:   RendM | null = null;
  isSaving       = false;
  form!:         FormGroup;

  private initialValues: any = null;

  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  readonly estadoLabel = ESTADO_LABEL;
  readonly estadoClass = ESTADO_CLASS;

  get isAdmin(): boolean { return this.auth.isAdmin; }

  get isDirty(): boolean {
    if (!this.editingRend || !this.initialValues) return true;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
  }

  constructor(
    private rendMService: RendMService,
    private toast:        ToastService,
    private fb:           FormBuilder,
    private auth:         AuthService,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      idPerfil:       [null, [Validators.required]],
      cuenta:         ['',   [Validators.required, Validators.maxLength(25)]],
      nombreCuenta:   ['',   [Validators.required, Validators.maxLength(250)]],
      empleado:       ['',   [Validators.required, Validators.maxLength(25)]],
      nombreEmpleado: ['',   [Validators.required, Validators.maxLength(250)]],
      objetivo:       ['',   [Validators.required, Validators.maxLength(250)]],
      fechaIni:       ['',   [Validators.required]],
      fechaFinal:     ['',   [Validators.required]],
      monto:          [0,    [Validators.required, Validators.min(0)]],
      preliminar:     ['',   Validators.maxLength(25)],
    });
  }

  fieldChanged(name: string): boolean {
    if (!this.editingRend || !this.initialValues) return false;
    return this.form.get(name)?.value !== this.initialValues[name];
  }

  // ── CRUD ─────────────────────────────────────────────────

  load() {
    this.loading   = true;
    this.loadError = false;
    this.rendMService.getAll().subscribe({
      next: (data) => {
        this.rendiciones = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
      },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.rendiciones.filter(r =>
      (r.U_Objetivo      ?? '').toLowerCase().includes(q) ||
      (r.U_NombreEmpleado ?? '').toLowerCase().includes(q) ||
      (r.U_NombreCuenta  ?? '').toLowerCase().includes(q) ||
      (r.U_NombrePerfil  ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
  }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start  = (this.page - 1) * this.limit;
    this.paged   = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  // ── Modal ────────────────────────────────────────────────

  openNew() {
    this.editingRend   = null;
    this.initialValues = null;
    this.form.reset({
      idPerfil: null, cuenta: '', nombreCuenta: '',
      empleado: '', nombreEmpleado: '',
      objetivo: '', fechaIni: '', fechaFinal: '',
      monto: 0, preliminar: '',
    });
    this.showForm = true;
  }

  openEdit(r: RendM) {
    this.editingRend = r;
    const values = {
      idPerfil:       r.U_IdPerfil,
      cuenta:         r.U_Cuenta,
      nombreCuenta:   r.U_NombreCuenta,
      empleado:       r.U_Empleado,
      nombreEmpleado: r.U_NombreEmpleado,
      objetivo:       r.U_Objetivo,
      fechaIni:       r.U_FechaIni?.substring(0, 10) ?? '',
      fechaFinal:     r.U_FechaFinal?.substring(0, 10) ?? '',
      monto:          r.U_Monto,
      preliminar:     r.U_Preliminar ?? '',
    };
    this.form.reset(values);
    this.initialValues = { ...values };
    this.showForm = true;
  }

  closeForm() {
    this.showForm      = false;
    this.editingRend   = null;
    this.initialValues = null;
    this.form.reset();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: CreateRendMPayload = {
      idPerfil:       Number(raw.idPerfil),
      cuenta:         raw.cuenta,
      nombreCuenta:   raw.nombreCuenta,
      empleado:       raw.empleado,
      nombreEmpleado: raw.nombreEmpleado,
      objetivo:       raw.objetivo,
      fechaIni:       raw.fechaIni,
      fechaFinal:     raw.fechaFinal,
      monto:          Number(raw.monto),
      preliminar:     raw.preliminar ?? '',
    };

    if (this.editingRend) {
      this.rendMService.update(this.editingRend.U_IdRendicion, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Rendición actualizada');
          this.closeForm();
          this.load();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 403) {
            this.toast.error(err?.error?.message || 'No tienes permiso para editar esta rendición');
          }
        },
      });
    } else {
      this.rendMService.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Rendición creada');
          this.closeForm();
          this.load();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al crear rendición');
          }
        },
      });
    }
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(r: RendM) {
    this.openDialog({
      title:        '¿Eliminar rendición?',
      message:      `Se eliminará la rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.rendMService.remove(r.U_IdRendicion).subscribe({
        next:  () => { this.toast.success('Rendición eliminada'); this.load(); },
        error: (err: any) => {
          if (err?.status === 403) {
            this.toast.error(err?.error?.message || 'No tienes permiso para eliminar esta rendición');
          }
        },
      });
    });
  }

  // ── Dialog ───────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

  // ── Helpers ──────────────────────────────────────────────

  estadoTexto(estado: number): string {
    return this.estadoLabel[estado] ?? `Estado ${estado}`;
  }

  estadoCss(estado: number): string {
    return this.estadoClass[estado] ?? 'badge-secondary';
  }

  canEdit(r: RendM): boolean {
    if (this.isAdmin) return true;
    return r.U_IdUsuario === String(this.auth.user?.sub) && r.U_Estado === 0;
  }

  canDelete(r: RendM): boolean {
    return this.canEdit(r);
  }

  formatDate(ts: string): string {
    if (!ts) return '';
    return ts.substring(0, 10);
  }
}
