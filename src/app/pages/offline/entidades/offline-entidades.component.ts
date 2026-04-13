import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { OfflineEntidadesService, Entidad } from './offline-entidades.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';
import { FormModalComponent } from '@shared/form-modal';
import { FormFieldComponent } from '@shared/form-field';

@Component({
  standalone: true,
  selector: 'app-offline-entidades',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
            ConfirmDialogComponent, PaginatorComponent, ActionMenuComponent,
            FormModalComponent, FormFieldComponent],
  templateUrl: './offline-entidades.component.html',
  styleUrls:   ['./offline-entidades.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineEntidadesComponent implements OnInit {

  // Configurados desde route.data
  tipo           = 'PL';
  titulo         = 'Proveedores';
  tituloSingular = 'Proveedor';
  codigoEjemplo  = 'PL00001';

  entidades: Entidad[] = [];
  filtered:  Entidad[] = [];
  paged:     Entidad[] = [];

  search    = '';
  loading   = false;
  loadError = false;
  page = 1; limit = 10; totalPages = 1;

  showForm     = false;
  editingItem: Entidad | null = null;
  isSaving     = false;
  form!: FormGroup;
  initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    private svc:   OfflineEntidadesService,
    private toast: ToastService,
    private fb:    FormBuilder,
    private cdr:   ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    // Leer tipo y titulo desde los datos de la ruta
    const data = this.route.snapshot.data;
    this.tipo  = data['tipo']   ?? 'PL';
    this.titulo = data['titulo'] ?? 'Proveedores';

    // Singular: quitar la 's' final si aplica
    this.tituloSingular = this.titulo.endsWith('es')
      ? this.titulo.slice(0, -2)   // Proveedores → Proveedor
      : this.titulo.endsWith('s')
        ? this.titulo.slice(0, -1) // Clientes → Cliente
        : this.titulo;

    this.codigoEjemplo = `${this.tipo}00001`;

    this.buildForm();
    this.load();

    // Re-cargar cuando cambia la ruta (mismo componente, distinto tipo)
    this.route.data.subscribe(d => {
      if (d['tipo'] !== this.tipo) {
        this.tipo           = d['tipo']   ?? 'PL';
        this.titulo         = d['titulo'] ?? 'Proveedores';
        this.tituloSingular = this.titulo.endsWith('es') ? this.titulo.slice(0, -2)
                            : this.titulo.endsWith('s')  ? this.titulo.slice(0, -1)
                            : this.titulo;
        this.codigoEjemplo  = `${this.tipo}00001`;
        this.search         = '';
        this.load();
      }
    });
  }

  // ── Carga ─────────────────────────────────────────────────────

  load() {
    this.loading = true; this.loadError = false; this.cdr.markForCheck();
    this.svc.getAll(this.tipo).subscribe({
      next: data => { this.entidades = data; this.loading = false; this.applyFilter(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
    });
  }

  // ── Filtro y paginación ───────────────────────────────────────

  applyFilter() {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.entidades.filter(e =>
      !q ||
      e.U_CODIGO.toLowerCase().includes(q) ||
      e.U_RAZON_SOCIAL.toLowerCase().includes(q) ||
      (e.U_NIT ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    this.updatePaged();
  }

  updatePaged() {
    const s = (this.page - 1) * this.limit;
    this.paged = this.filtered.slice(s, s + this.limit);
    this.cdr.markForCheck();
  }

  onPageChange(p: number)  { this.page = p; this.updatePaged(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit)); this.updatePaged(); }

  // ── Formulario ────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      razonSocial: ['', Validators.required],
      nit:         [''],
    });
  }

  get isDirty(): boolean {
    return JSON.stringify(this.form.value) !== JSON.stringify(this.initialValues);
  }

  openNew() {
    this.editingItem   = null;
    this.form.reset({ razonSocial: '', nit: '' });
    this.initialValues = { ...this.form.value };
    this.showForm      = true;
    this.cdr.markForCheck();
  }

  openEdit(e: Entidad) {
    this.editingItem = e;
    this.form.reset({ razonSocial: e.U_RAZON_SOCIAL, nit: e.U_NIT ?? '' });
    this.initialValues = { ...this.form.value };
    this.showForm      = true;
    this.cdr.markForCheck();
  }

  closeForm() { this.showForm = false; this.editingItem = null; this.cdr.markForCheck(); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving = true; this.cdr.markForCheck();
    const v = this.form.value;

    if (this.editingItem) {
      this.svc.update(this.editingItem.U_CODIGO, {
        razonSocial: v.razonSocial,
        nit:         v.nit,
      }).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.exito(`${this.tituloSingular} actualizado/a`);
          this.closeForm(); this.load();
        },
        error: err => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Error al actualizar');
          this.cdr.markForCheck();
        },
      });
    } else {
      this.svc.create({ tipo: this.tipo, nit: v.nit ?? '', razonSocial: v.razonSocial }).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.exito(`${this.tituloSingular} creado/a`);
          this.closeForm(); this.load();
        },
        error: err => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Error al crear');
          this.cdr.markForCheck();
        },
      });
    }
  }

  // ── Action Menu ───────────────────────────────────────────────

  getActionMenuItems(e: Entidad): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      },
      {
        id: 'delete',
        label: 'Eliminar',
        cssClass: 'action-danger',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
      },
    ];
  }

  onActionClick(action: string, e: Entidad) {
    if (action === 'edit') {
      this.openEdit(e);
    } else if (action === 'delete') {
      this.confirmDelete(e);
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────

  confirmDelete(e: Entidad) {
    this.openDialog({
      title:        `¿Eliminar ${this.tituloSingular.toLowerCase()}?`,
      message:      `Se eliminará "${e.U_CODIGO} — ${e.U_RAZON_SOCIAL}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.svc.remove(e.U_CODIGO).subscribe({
        next: () => { this.toast.exito(`${this.tituloSingular} eliminado/a`); this.load(); },
        error: err => this.toast.error(err?.error?.message || 'Error al eliminar'),
      });
    });
  }

  private openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig = config; this._pendingAction = onConfirm;
    this.showDialog   = true; this.cdr.markForCheck();
  }

  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }
}
