import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { DocumentosService } from './documentos.service';
import { ToastService }      from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { Documento, TIPO_CALC_OPTIONS, TIPO_DOC_SAP_OPTIONS } from '../../models/documento.model';
import { TipoDocSapSelectComponent, TipoDocSapItem } from '../../shared/tipo-doc-sap-select/tipo-doc-sap-select.component';
import { Perfil } from '../../models/perfil.model';
import { AppSelectComponent } from '../../shared/app-select/app-select.component';
import { PerfilSelectComponent } from '../../shared/perfil-select/perfil-select.component';
import { CuentaSearchComponent }  from '../../shared/cuenta-search/cuenta-search.component';
import { SearchInputComponent } from '../../shared/debounce';
import { AuthService }            from '../../auth/auth.service';
import { ChartOfAccount }         from '../../services/sap.service';

@Component({
  standalone: true,
  selector: 'app-documentos',
  imports: [CommonModule, TipoDocSapSelectComponent, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, PaginatorComponent, AppSelectComponent, PerfilSelectComponent, CuentaSearchComponent, SearchInputComponent],
  templateUrl: './documentos.component.html',
  styleUrls: ['./documentos.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class DocumentosComponent implements OnInit {

  // ── Datos ────────────────────────────────────────────────
  documentos: Documento[]  = [];
  filtered:   Documento[]  = [];
  paged:      Documento[]  = [];

  readonly tipoCalcOptions    = TIPO_CALC_OPTIONS;
  readonly tipoDocSapOptions  = TIPO_DOC_SAP_OPTIONS;

  // ── Filtros ──────────────────────────────────────────────
  selectedPerfilId: number | null = null;
  selectedPerfil:   Perfil | null = null;
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
    public  auth:    AuthService,
    private service: DocumentosService,
    private toast:   ToastService,
    private fb:      FormBuilder,
    private cdr:     ChangeDetectorRef,
    private appRef:   ApplicationRef,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
  }

  get isEditing() { return this.editingId !== null; }
  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      tipDoc:        ['', [Validators.required, Validators.maxLength(25)]],
      idTipoDoc:     [0,  Validators.required],
      tipoCalc:      ['0', Validators.required],
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

  onPerfilSelect(value: number | null) {
    this.selectedPerfilId = value;
    setTimeout(() => this.loadDocumentos(), 0);
  }

  loadDocumentos(onComplete?: () => void) {
    if (!this.selectedPerfilId) {
      this.documentos = []; this.filtered = []; this.paged = [];
      return;
    }
    this.loading = true;
    this.service.getByPerfil(this.selectedPerfilId).subscribe({
      next: (data) => {
        this.documentos = data;
        this.loading = false;
        this.applyFilter();
        this.cdr.markForCheck();
        this.appRef.tick();
        onComplete?.();
      },
      error: () => { this.loading = false; this.cdr.markForCheck();
      onComplete?.(); },
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
    this.form.reset({ tipDoc: '', idTipoDoc: 0, tipoCalc: '0',
      ivaPercent: 0, ivaCuenta: '', itPercent: 0, itCuenta: '',
      iuePercent: 0, iueCuenta: '', rcivaPercent: 0, rcivaCuenta: '',
      exentoPercent: 0, ctaExento: '', tasa: 0, ice: 0 });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(doc: Documento) {
    this.editingId = doc.U_IdDocumento;
    this.form.patchValue({
      tipDoc:        doc.U_TipDoc,
      idTipoDoc:     doc.U_IdTipoDoc,
      tipoCalc:      (doc.U_TipoCalc == 1 || doc.U_TipoCalc === '1' || doc.U_TipoCalc === 'G') ? '1' : '0',
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
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.closeForm(); }

  closeForm() { this.showForm = false; this.editingId = null; this.form.reset(); this.cdr.markForCheck(); }

  save() {
    if (this.form.invalid || this.isSaving || !this.selectedPerfilId) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload = {
      codPerfil:     this.selectedPerfilId,
      tipDoc:        raw.tipDoc.trim(),
      idTipoDoc:     Number(raw.idTipoDoc),
      tipoCalc:      String(raw.tipoCalc === '1' || raw.tipoCalc === 1 ? '1' : '0'),
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
        const msg = this.isEditing ? 'Documento actualizado' : 'Documento creado';
        this.loadDocumentos(() => {
          this.toast.exito(msg);
          this.closeForm();
        });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err?.status === 409 || err?.status === 422) {
          this.toast.error(err?.error?.message || 'Error al guardar');
        }
        this.cdr.markForCheck();
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
        next:  () => { this.toast.exito('Documento eliminado'); this.loadDocumentos(); this.cdr.markForCheck(); },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al eliminar');
          }
          this.cdr.markForCheck();
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

  /**
   * Handler genérico para los selectores de cuenta.
   * Asigna el formatCode al campo correspondiente del formulario.
   */
  onCuentaChange(field: string, account: any | null) {
    // CuentaSearchComponent emite { code, name } — usar code (no formatCode)
    const value = account?.code ?? account?.formatCode ?? '';
    this.form.get(field)?.setValue(value);
    this.cdr.markForCheck();
  }

  onTipoDocSapSelected(item: TipoDocSapItem | null) {
    this.form.get('idTipoDoc')?.setValue(item?.U_IdTipo ?? null);
    this.cdr.markForCheck();
  }

  tipoDocSapLabel(val: number) {
    return this.tipoDocSapOptions.find(o => o.value === Number(val))?.label ?? String(val);
  }

  tipoCalcLabel(val: string | number) {
    return (val == 1 || val === '1' || val === 'G') ? 'GD' : 'GU';
  }

  isGrossingUp(val: string | number)   { return val == 1 || val === '1' || val === 'G'; }
  isGrossingDown(val: string | number) { return val == 0 || val === '0' || val === 'N' || val === 'D'; }

  /**
   * Formatea un porcentaje para la tabla:
   *  - 0      → '—'
   *  - entero → '13%'
   *  - decimal → '3.50%'
   */
  fmtPct(val: number | string | null | undefined): string {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    if (isNaN(n) || n === 0) return '—';
    const decimals = n % 1 === 0 ? 0 : 2;
    return n.toFixed(decimals) + '%';
  }
}