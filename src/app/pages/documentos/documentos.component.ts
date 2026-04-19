import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ApplicationRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { DocumentosService } from './documentos.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { Documento, TIPO_CALC_OPTIONS, TIPO_DOC_SAP_OPTIONS } from '@models/documento.model';
import { TipoDocSapSelectComponent, TipoDocSapItem } from '@shared/tipo-doc-sap-select/tipo-doc-sap-select.component';
import { Perfil } from '@models/perfil.model';
import { AppSelectComponent } from '@shared/app-select/app-select.component';
import { CuentaSearchComponent } from '@shared/cuenta-search/cuenta-search.component';
import { AuthService } from '@auth/auth.service';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field/form-field.component';
import { FormDirtyService } from '@shared/form-dirty';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { StatusBadgeComponent } from '@shared/status-badge';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

// Dumb Components
import { DocumentosFiltersComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-documentos',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // Dumb Components
    DocumentosFiltersComponent,
    DataTableComponent,
    StatusBadgeComponent,
    // Shared Components (para el formulario modal)
    TipoDocSapSelectComponent,
    AppSelectComponent,
    CuentaSearchComponent,
    FormModalComponent,
    FormFieldComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
  ],
  templateUrl: './documentos.component.html',
  styleUrls: ['./documentos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosComponent extends AbstractCrudListComponent<Documento> implements OnInit {
  @ViewChild('tipoDocCol', { static: true }) tipoDocCol!: TemplateRef<any>;
  @ViewChild('sapCol', { static: true }) sapCol!: TemplateRef<any>;
  @ViewChild('calculoCol', { static: true }) calculoCol!: TemplateRef<any>;
  @ViewChild('ivaCol', { static: true }) ivaCol!: TemplateRef<any>;
  @ViewChild('itCol', { static: true }) itCol!: TemplateRef<any>;
  @ViewChild('iueCol', { static: true }) iueCol!: TemplateRef<any>;
  @ViewChild('rcivaCol', { static: true }) rcivaCol!: TemplateRef<any>;
  @ViewChild('exentoCol', { static: true }) exentoCol!: TemplateRef<any>;
  @ViewChild('tasaIceCol', { static: true }) tasaIceCol!: TemplateRef<any>;

  store = new CrudListStore<Documento>({ limit: 5, searchFields: ['U_TipDoc'] });
  tableConfig!: DataTableConfig;

  readonly tipoCalcOptions = TIPO_CALC_OPTIONS;
  readonly tipoDocSapOptions = TIPO_DOC_SAP_OPTIONS;

  // ── Filtros ──────────────────────────────────────────────
  selectedPerfilId: number | null = null;
  selectedPerfil: Perfil | null = null;

  // ── Formulario ───────────────────────────────────────────
  showForm = false;
  isSaving = false;
  editingId: number | null = null;
  form!: FormGroup;
  initialValues: Record<string, unknown> | null = null;

  constructor(
    public auth: AuthService,
    private service: DocumentosService,
    private toast: ToastService,
    private fb: FormBuilder,
    protected override cdr: ChangeDetectorRef,
    private appRef: ApplicationRef,
    private dirtyService: FormDirtyService,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {
    this.buildForm();
    this.buildTableConfig();
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
  }

  get isEditing() { return this.editingId !== null; }

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      tipDoc: ['', [Validators.required, Validators.maxLength(25)]],
      idTipoDoc: [0, Validators.required],
      tipoCalc: ['0', Validators.required],
      ivaPercent: [0],
      ivaCuenta: [''],
      itPercent: [0],
      itCuenta: [''],
      iuePercent: [0],
      iueCuenta: [''],
      rcivaPercent: [0],
      rcivaCuenta: [''],
      exentoPercent: [0],
      ctaExento: [''],
      tasa: [0],
      ice: [0],
    });
  }

  // ── Carga ─────────────────────────────────────────────────

  onPerfilSelect(value: number | null) {
    this.selectedPerfilId = value;
    setTimeout(() => this.loadDocumentos(), 0);
  }

  onPerfilObjChange(perfil: Perfil | null) {
    this.selectedPerfil = perfil;
  }

  loadDocumentos(onComplete?: () => void) {
    if (!this.selectedPerfilId) {
      this.store.setItems([]);
      return;
    }
    this.store.load(this.service.getByPerfil(this.selectedPerfilId), () => {
      this.cdr.markForCheck();
      this.appRef.tick();
      onComplete?.();
    });
  }

  // ── Filtro y paginación ───────────────────────────────────

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'U_TipDoc', header: 'Tipo Documento', cellTemplate: this.tipoDocCol, mobile: { primary: true } },
        { key: 'U_CodPerfil', header: 'Cod.', align: 'center' },
        { key: 'U_IdTipoDoc', header: 'SAP', cellTemplate: this.sapCol, mobile: { hide: true } },
        { key: 'U_TipoCalc', header: 'Calculo', align: 'center', cellTemplate: this.calculoCol, mobile: { hide: true } },
        { key: 'iva', header: 'IVA', align: 'center', cellTemplate: this.ivaCol, mobile: { hide: true } },
        { key: 'it', header: 'IT', align: 'center', cellTemplate: this.itCol, mobile: { hide: true } },
        { key: 'iue', header: 'IUE', align: 'center', cellTemplate: this.iueCol, mobile: { hide: true } },
        { key: 'rciva', header: 'RC-IVA', align: 'center', cellTemplate: this.rcivaCol, mobile: { hide: true } },
        { key: 'exento', header: 'Exento', align: 'center', cellTemplate: this.exentoCol, mobile: { hide: true } },
        { key: 'tasaIce', header: 'Tasa/ICE', align: 'center', cellTemplate: this.tasaIceCol, mobile: { hide: true } },
      ],
      showActions: true,
      actions: [
        { id: 'edit', label: 'Editar', icon: ICON_EDIT },
        { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'danger', condition: () => this.auth.puedeEditarConf },
      ],
      striped: true,
      hoverable: true,
    };
  }

  onTableAction(event: { action: string; item: Documento }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'delete':
        this.confirmRemove(event.item);
        break;
    }
  }

  // ── Crear / Editar ────────────────────────────────────────

  openCreate() {
    if (!this.selectedPerfilId) { this.toast.error('Seleccione un perfil primero'); return; }
    this.editingId = null;
    this.form.reset({
      tipDoc: '', idTipoDoc: 0, tipoCalc: '0',
      ivaPercent: 0, ivaCuenta: '', itPercent: 0, itCuenta: '',
      iuePercent: 0, iueCuenta: '', rcivaPercent: 0, rcivaCuenta: '',
      exentoPercent: 0, ctaExento: '', tasa: 0, ice: 0
    });
    this.initialValues = null;
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(doc: Documento) {
    this.editingId = doc.U_IdDocumento;
    this.form.patchValue({
      tipDoc: doc.U_TipDoc,
      idTipoDoc: doc.U_IdTipoDoc,
      tipoCalc: (doc.U_TipoCalc == 1 || doc.U_TipoCalc === '1' || doc.U_TipoCalc === 'G') ? '1' : '0',
      ivaPercent: doc.U_IVApercent ?? 0,
      ivaCuenta: doc.U_IVAcuenta ?? '',
      itPercent: doc.U_ITpercent ?? 0,
      itCuenta: doc.U_ITcuenta ?? '',
      iuePercent: doc.U_IUEpercent ?? 0,
      iueCuenta: doc.U_IUEcuenta ?? '',
      rcivaPercent: doc.U_RCIVApercent ?? 0,
      rcivaCuenta: doc.U_RCIVAcuenta ?? '',
      exentoPercent: doc.U_EXENTOpercent ?? 0,
      ctaExento: doc.U_CTAEXENTO ?? '',
      tasa: doc.U_TASA ?? 0,
      ice: doc.U_ICE ?? 0,
    });
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.closeForm(); }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving || !this.selectedPerfilId) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload = {
      codPerfil: this.selectedPerfilId,
      tipDoc: raw.tipDoc.trim(),
      idTipoDoc: Number(raw.idTipoDoc),
      tipoCalc: String(raw.tipoCalc === '1' || raw.tipoCalc === 1 ? '1' : '0'),
      ivaPercent: Number(raw.ivaPercent) || 0,
      ivaCuenta: raw.ivaCuenta?.trim() || '',
      itPercent: Number(raw.itPercent) || 0,
      itCuenta: raw.itCuenta?.trim() || '',
      iuePercent: Number(raw.iuePercent) || 0,
      iueCuenta: raw.iueCuenta?.trim() || '',
      rcivaPercent: Number(raw.rcivaPercent) || 0,
      rcivaCuenta: raw.rcivaCuenta?.trim() || '',
      exentoPercent: Number(raw.exentoPercent) || 0,
      ctaExento: raw.ctaExento?.trim() || '',
      tasa: Number(raw.tasa) || 0,
      ice: Number(raw.ice) || 0,
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
        this.errorHandler.handle(err, 'Error al guardar', this.cdr);
      },
    });
  }

  // ── Eliminar ──────────────────────────────────────────────

  confirmRemove(doc: Documento) {
    this.confirmDialog.ask({
      title: '¿Eliminar documento?',
      message: `Se eliminará la configuración de "${doc.U_TipDoc}" del perfil.`,
      confirmLabel: 'Sí, eliminar',
      type: 'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.service.remove(doc.U_IdDocumento).subscribe({
        next: () => { this.toast.exito('Documento eliminado'); this.loadDocumentos(); this.cdr.markForCheck(); },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar', this.cdr),
      });
    });
  }

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

  isGrossingUp(val: string | number) { return val == 1 || val === '1' || val === 'G'; }
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
