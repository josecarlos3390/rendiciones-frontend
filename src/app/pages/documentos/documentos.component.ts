import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { DocumentosService } from './documentos.service';
import { ToastService }      from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { Documento, TIPO_CALC_OPTIONS } from '../../models/documento.model';
import { Perfil } from '../../models/perfil.model';

@Component({
  standalone: true,
  selector: 'app-documentos',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, PaginatorComponent],
  templateUrl: './documentos.component.html',
  styleUrls: ['./documentos.component.scss'],
})
export class DocumentosComponent implements OnInit {

  // ── Datos ────────────────────────────────────────────────
  perfiles:   Perfil[]     = [];
  documentos: Documento[]  = [];
  filtered:   Documento[]  = [];
  paged:      Documento[]  = [];

  readonly tipoCalcOptions = TIPO_CALC_OPTIONS;

  // ── Filtros ──────────────────────────────────────────────
  selectedPerfilId: number | null = null;
  search  = '';
  loading = false;

  // ── Paginación ───────────────────────────────────────────
  page       = 1;
  limit      = 5;
  totalPages = 1;

  // ── Formulario ───────────────────────────────────────────
  showForm   = false;
  isSaving   = false;
  editingId: number | null = null;
  form!: FormGroup;

  // ── Confirm dialog ────────────────────────────────────────
  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    private service: DocumentosService,
    private toast:   ToastService,
    private fb:      FormBuilder,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadPerfiles();
  }

  get isEditing() { return this.editingId !== null; }
  get selectedPerfil(): Perfil | null {
    return this.perfiles.find(p => p.U_CodPerfil === this.selectedPerfilId) ?? null;
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      tipDoc:        ['', [Validators.required, Validators.maxLength(25)]],
      idTipoDoc:     [0,  Validators.required],
      tipoCalc:      ['G', Validators.required],
      ivaPercent:    [0],
      ivaCuenta:     [''],
      itPercent:     [0],
      itCuenta:      [''],
      iuePercent:    [0],
      iueCuenta:     [''],
      rcivaPercent:  [0],
      rcivaCuenta:   [''],
      exentoPercent: [0],
      ctaExento:     [''],
      tasa:          [0],
      ice:           [0],
    });
  }

  // ── Carga ─────────────────────────────────────────────────

  loadPerfiles() {
    this.service.getPerfiles().subscribe({
      next: (data) => { this.perfiles = [...data]; this.cdr.detectChanges(); },
      error: (err: any) => this.toast.error(err?.error?.message || 'Error al cargar perfiles'),
    });
  }

  onPerfilChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedPerfilId = val ? Number(val) : null;
    this.loadDocumentos();
  }

  loadDocumentos() {
    if (!this.selectedPerfilId) {
      this.documentos = []; this.filtered = []; this.paged = [];
      return;
    }
    this.loading = true;
    this.service.getByPerfil(this.selectedPerfilId).subscribe({
      next: (data) => {
        this.documentos = data;
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
    this.filtered = this.documentos.filter(d =>
      (d.U_TipDoc ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.filtered.slice(start, start + this.limit);
  }

  // ── Crear / Editar ────────────────────────────────────────

  openCreate() {
    if (!this.selectedPerfilId) { this.toast.error('Seleccione un perfil primero'); return; }
    this.editingId = null;
    this.form.reset({ tipDoc: '', idTipoDoc: 0, tipoCalc: 'G',
      ivaPercent: 0, ivaCuenta: '', itPercent: 0, itCuenta: '',
      iuePercent: 0, iueCuenta: '', rcivaPercent: 0, rcivaCuenta: '',
      exentoPercent: 0, ctaExento: '', tasa: 0, ice: 0 });
    this.showForm = true;
  }

  openEdit(doc: Documento) {
    this.editingId = doc.U_IdDocumento;
    this.form.patchValue({
      tipDoc:        doc.U_TipDoc,
      idTipoDoc:     doc.U_IdTipoDoc,
      tipoCalc:      doc.U_TipoCalc,
      ivaPercent:    doc.U_IVApercent   ?? 0,
      ivaCuenta:     doc.U_IVAcuenta    ?? '',
      itPercent:     doc.U_ITpercent    ?? 0,
      itCuenta:      doc.U_ITcuenta     ?? '',
      iuePercent:    doc.U_IUEpercent   ?? 0,
      iueCuenta:     doc.U_IUEcuenta    ?? '',
      rcivaPercent:  doc.U_RCIVApercent ?? 0,
      rcivaCuenta:   doc.U_RCIVAcuenta  ?? '',
      exentoPercent: doc.U_EXENTOpercent ?? 0,
      ctaExento:     doc.U_CTAEXENTO    ?? '',
      tasa:          doc.U_TASA         ?? 0,
      ice:           doc.U_ICE          ?? 0,
    });
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.editingId = null; this.form.reset(); }

  save() {
    if (this.form.invalid || this.isSaving || !this.selectedPerfilId) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload = {
      codPerfil:     this.selectedPerfilId,
      tipDoc:        raw.tipDoc.trim(),
      idTipoDoc:     Number(raw.idTipoDoc),
      tipoCalc:      raw.tipoCalc,
      ivaPercent:    Number(raw.ivaPercent)   || 0,
      ivaCuenta:     raw.ivaCuenta?.trim()    || '',
      itPercent:     Number(raw.itPercent)    || 0,
      itCuenta:      raw.itCuenta?.trim()     || '',
      iuePercent:    Number(raw.iuePercent)   || 0,
      iueCuenta:     raw.iueCuenta?.trim()    || '',
      rcivaPercent:  Number(raw.rcivaPercent) || 0,
      rcivaCuenta:   raw.rcivaCuenta?.trim()  || '',
      exentoPercent: Number(raw.exentoPercent)|| 0,
      ctaExento:     raw.ctaExento?.trim()    || '',
      tasa:          Number(raw.tasa)         || 0,
      ice:           Number(raw.ice)          || 0,
    };

    const req$ = this.isEditing
      ? this.service.update(this.editingId!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success(this.isEditing ? 'Documento actualizado' : 'Documento creado');
        this.closeForm();
        this.loadDocumentos();
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err?.status === 409 || err?.status === 422) {
          this.toast.error(err?.error?.message || 'Error al guardar');
        }
      },
    });
  }

  // ── Eliminar ──────────────────────────────────────────────

  confirmRemove(doc: Documento) {
    this.openDialog({
      title:        '¿Eliminar documento?',
      message:      `Se eliminará la configuración de "${doc.U_TipDoc}" del perfil.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.service.remove(doc.U_IdDocumento).subscribe({
        next:  () => { this.toast.success('Documento eliminado'); this.loadDocumentos(); },
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

  tipoCalcLabel(val: string) {
    return this.tipoCalcOptions.find(o => o.value === val)?.label ?? val;
  }
}