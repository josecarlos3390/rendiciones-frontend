// ═══════════════════════════════════════════════════════════════════════════
//  PLANTILLA ESTÁNDAR — Componente de página con CRUD completo
//
//  INSTRUCCIONES:
//  1. Copiar esta carpeta entera y renombrar todos los archivos:
//       mi-entidad  →  nombre-real  (ej: categorias, contratos, etc.)
//       MiEntidad   →  NombreReal   (PascalCase)
//       miEntidad   →  nombreReal   (camelCase, para variables)
//
//  2. Reemplazar el modelo `MiEntidad` por tu modelo real en:
//       mi-entidad.model.ts   (definir campos)
//       mi-entidad.service.ts (ajustar endpoint)
//       este archivo          (ajustar campos del form y filtros)
//
//  3. Ajustar el HTML según los campos de tu entidad.
//
//  REGLAS DE CHANGE DETECTION — OBLIGATORIO RESPETAR:
//  ✅ Siempre usar  changeDetection: ChangeDetectionStrategy.OnPush
//  ✅ Siempre usar  this.cdr.markForCheck()  después de cambios async
//  ❌ Nunca usar    this.cdr.detectChanges()
//  ❌ Nunca usar    NgZone / zone.run()
//  ❌ Nunca usar    setTimeout() para forzar renders
// ═══════════════════════════════════════════════════════════════════════════

import {
  Component, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';

// ── Servicios core ────────────────────────────────────────────────────────
import { MiEntidadService }   from './mi-entidad.service';
import { ToastService }        from '../../core/toast/toast.service';

// ── Componentes compartidos ───────────────────────────────────────────────
import {
  ConfirmDialogComponent,
  ConfirmDialogConfig,
} from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent }  from '../../shared/paginator/paginator.component';

// ── Componentes opcionales (descomentar los que uses) ─────────────────────
// import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';
// import { PerfilSelectComponent }  from '../../shared/perfil-select/perfil-select.component';
// import { CuentaSearchComponent }  from '../../shared/cuenta-search/cuenta-search.component';
// import { EmpleadoSearchComponent } from '../../shared/empleado-search/empleado-search.component';

// ── Modelo ────────────────────────────────────────────────────────────────
import { MiEntidad } from '../../models/mi-entidad.model';

@Component({
  standalone: true,
  selector: 'app-mi-entidad',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    PaginatorComponent,
    // AppSelectComponent,
    // PerfilSelectComponent,
    // CuentaSearchComponent,
  ],
  templateUrl: './mi-entidad.component.html',
  styleUrls:  ['./mi-entidad.component.scss'],

  // ─────────────────────────────────────────────────────────────────────────
  //  ⚠️  OBLIGATORIO: siempre OnPush en todos los componentes de página.
  //  Razón: los componentes shared (PerfilSelect, CuentaSearch, etc.) usan
  //  OnPush. Si el padre usa Default, Angular no propaga los cambios
  //  correctamente y la vista no refresca hasta el próximo evento del usuario.
  // ─────────────────────────────────────────────────────────────────────────
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiEntidadComponent implements OnInit {

  // ── Datos ─────────────────────────────────────────────────────────────────
  entidades: MiEntidad[] = [];
  filtered:  MiEntidad[] = [];
  paged:     MiEntidad[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────────
  search    = '';
  loading   = false;
  loadError = false;

  // ── Paginación ────────────────────────────────────────────────────────────
  page       = 1;
  limit      = 10;
  totalPages = 1;

  // ── Formulario ────────────────────────────────────────────────────────────
  showForm     = false;
  isSaving     = false;
  editingItem: MiEntidad | null = null;
  form!: FormGroup;

  /** Snapshot de valores al abrir edición — permite detectar cambios sin guardar */
  private initialValues: any = null;

  // ── Confirm dialog ────────────────────────────────────────────────────────
  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  // ── Si necesitás filtrar por perfil, descomentar: ──────────────────────────
  // selectedPerfilId: number | null = null;

  constructor(
    private service: MiEntidadService,
    private toast:   ToastService,
    private fb:      FormBuilder,
    private cdr:     ChangeDetectorRef,
    //
    // ⚠️  NO inyectar NgZone. Si lo necesitás, revisá el diseño:
    // la solución siempre es markForCheck(), no zone.run().
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get isEditing(): boolean { return this.editingItem !== null; }

  /** Devuelve true si el formulario tiene cambios respecto al snapshot inicial */
  get isDirty(): boolean {
    if (!this.editingItem) return true;
    if (!this.initialValues) return false;
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.initialValues);
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      // TODO: reemplazar por los campos reales de tu entidad
      nombre:      ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', Validators.maxLength(300)],
      activo:      ['1'],
    });
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  load() {
    this.loading   = true;
    this.loadError = false;

    this.service.getAll().subscribe({
      next: (data) => {
        this.entidades = data;
        this.loading   = false;
        this.applyFilter();
        // ✅ markForCheck(): notifica a Angular que este componente
        //    necesita re-renderizarse en el próximo ciclo de CD.
        //    Es el único método correcto con OnPush + datos async.
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Filtro y paginación ───────────────────────────────────────────────────

  applyFilter() {
    const q = this.search.toLowerCase();
    // TODO: ajustar los campos de filtrado a tu modelo
    this.filtered = this.entidades.filter(e =>
      (e.nombre ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
    // markForCheck() al filtrar manualmente (búsqueda en tiempo real)
    this.cdr.markForCheck();
  }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  // ── Abrir / Cerrar formulario ─────────────────────────────────────────────

  openNew() {
    this.editingItem   = null;
    this.initialValues = null;
    this.form.reset({
      // TODO: valores por defecto para nuevo registro
      nombre:      '',
      descripcion: '',
      activo:      '1',
    });
    this.showForm = true;
  }

  openEdit(item: MiEntidad) {
    this.editingItem = item;
    this.form.reset({
      // TODO: mapear campos del modelo al formulario
      nombre:      item.nombre      ?? '',
      descripcion: item.descripcion ?? '',
      activo:      item.activo      ?? '1',
    });
    // Guardar snapshot para isDirty
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
  }

  /** Cierra el modal con Escape */
  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.closeForm(); }

  closeForm() {
    this.showForm      = false;
    this.editingItem   = null;
    this.initialValues = null;
    this.form.reset();
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;

    const raw = this.form.getRawValue();

    // TODO: construir el payload con los campos de tu entidad
    const payload = {
      nombre:      raw.nombre.trim(),
      descripcion: raw.descripcion?.trim() ?? '',
      activo:      raw.activo,
    };

    const req$ = this.isEditing
      ? this.service.update(this.editingItem!.id, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.exito(this.isEditing ? 'Registro actualizado' : 'Registro creado');
        this.closeForm();
        this.load();
        // No hace falta markForCheck() aquí porque load() ya lo llama.
      },
      error: (err: any) => {
        this.isSaving = false;
        // 409 = conflicto (duplicado), 422 = validación de negocio
        if (err?.status === 409 || err?.status === 422) {
          this.toast.error(err?.error?.message || 'Error al guardar');
        }
        // No hace falta markForCheck() aquí: isSaving ya cambió y
        // Angular lo detecta en el próximo tick porque estamos en la
        // misma zona de ejecución del observable.
      },
    });
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  confirmDelete(item: MiEntidad) {
    this.openDialog({
      title:        '¿Eliminar registro?',
      // TODO: ajustar el mensaje al nombre de tu entidad
      message:      `Se eliminará "${item.nombre}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.service.remove(item.id).subscribe({
        next:  () => { this.toast.exito('Registro eliminado'); this.load(); },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al eliminar');
          }
        },
      });
    });
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }
}
