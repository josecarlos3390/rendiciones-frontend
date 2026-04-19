/**
 * DocFormComponent - Formulario de documentos para rendiciones
 * 
 * Componente autocontenido que maneja su propio FormGroup.
 * Recibe datos iniciales via @Input() y emite el resultado via @Output().
 * 
 * Patrón: Smart/Dumb Component - Este es un Presentational Component
 * que solo se encarga de mostrar el formulario y emitir eventos.
 */

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Componentes compartidos
import { FormModalComponent, FormModalTab } from '@shared/form-modal';
import { AppSelectComponent } from '@shared/app-select/app-select.component';
import { CuentaSearchComponent } from '@shared/cuenta-search/cuenta-search.component';
import { ProveedorSearchComponent } from '@shared/proveedor-search/proveedor-search.component';
import { ProjectSearchComponent, ProjectDto } from '@shared/project-search/project-search.component';

// Modelos
import { RendD } from '@models/rend-d.model';
import { Documento } from '@models/documento.model';
import { Perfil } from '@models/perfil.model';


// Servicios IA
import { AiDocumentoService, SugerenciaPendiente } from '@services/ai-documento.service';
import { CalculoImpuestosService } from '@services/calculo-impuestos.service';

import { DocFormConfig, DocFormSubmitData } from './doc-form.model';

@Component({
  selector: 'app-doc-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormModalComponent,
    AppSelectComponent,
    CuentaSearchComponent,
    ProveedorSearchComponent,
    ProjectSearchComponent,
  ],
  templateUrl: './doc-form.component.html',
  styleUrls: ['./doc-form.component.scss'],
})
export class DocFormComponent implements OnInit, OnChanges, OnDestroy {
  // Formulario propio del componente
  form!: FormGroup;
  
  // Subject para manejar destrucción de suscripciones
  private destroy$ = new Subject<void>();
  
  // Inputs de control
  @Input() isOpen = false;
  @Input() isSaving = false;
  @Input() isEditing = false;
  @Input() subtitle: string | null = null;
  
  // Inputs de configuración y datos
  @Input() config!: DocFormConfig;
  @Input() initialData: RendD | null = null;
  @Input() tiposDocs: Documento[] = [];
  @Input() perfil: Perfil | null = null;
  
  // Inputs de estado externos
  @Input() facturaLinea = false;
  @Input() proveedorSeleccionado: { cardCode: string; cardName: string; licTradNum?: string } | null = null;
  @Input() exentoActivo = false;
  
  // Valores calculados internamente
  baseImponible = 0;
  montoIVA = 0;
  montoIT = 0;
  montoIUE = 0;
  montoRCIVA = 0;
  totalImpuestos = 0;
  totalCalculado = 0;
  
  // Delegación de estado IA al servicio
  get iaLoading(): boolean { return this.aiDocSvc.loading; }
  get iaSugerenciaMensaje(): string { return this.aiDocSvc.mensaje; }
  get iaHabilitada(): boolean { return this.aiDocSvc.habilitada; }
  get iaSugerenciaPendiente(): SugerenciaPendiente | null { return this.aiDocSvc.sugerenciaPendiente; }
  
  // Outputs
  @Output() save = new EventEmitter<DocFormSubmitData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<string>();
  @Output() cuentaChange = new EventEmitter<{ code: string; name: string } | null>();
  @Output() tipoDocChange = new EventEmitter<string>();
  @Output() toggleFacturaLinea = new EventEmitter<void>();
  @Output() proveedorChange = new EventEmitter<{ cardCode: string; cardName: string; licTradNum?: string } | null>();
  @Output() nuevoProv = new EventEmitter<void>();
  @Output() dimensionChange = new EventEmitter<{ slot: number; value: string }>();
  @Output() projectChange = new EventEmitter<ProjectDto | null>();
  
  activeTab: 'doc' | 'montos' | 'impuestos' = 'doc';
  isDirty = false;
  
  tabs: FormModalTab[] = [
    { id: 'doc', label: 'Identificación' },
    { id: 'montos', label: 'Montos y Normas' },
    { id: 'impuestos', label: 'Cálculo Impuestos' },
  ];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private aiDocSvc: AiDocumentoService,
    private calculoSvc: CalculoImpuestosService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    if (this.initialData) {
      this.patchFormValues(this.initialData);
      // Recalcular impuestos con los valores cargados
      // Nota: Si tiposDocs aún no está cargado, se recalculará en ngOnChanges
      if (this.tiposDocs.length > 0) {
        this.recalcular();
      }
    }
    this._engancharCalculos();

    // Inicializar estado de IA
    this.aiDocSvc.init(() => this.cdr.detectChanges());
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.aiDocSvc.dispose();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Cuando se abre el modal con nuevos datos
    if (changes['isOpen'] && this.isOpen && this.form) {
      if (this.initialData) {
        this.patchFormValues(this.initialData);
        // Recalcular impuestos cuando se abre con datos
        if (this.tiposDocs.length > 0) {
          setTimeout(() => this.recalcular(), 0);
        }
      }
    }
    
    // Si cambian los tipos de documentos, actualizar opciones
    // Y recalcular si hay datos cargados (para modo editar)
    if (changes['tiposDocs'] && this.tiposDocs.length > 0 && this.config) {
      this.updateTipoDocOptions();
      // Si hay datos cargados, actualizar tipoDocName y recalcular
      if (this.initialData && this.form) {
        // Actualizar tipoDocName si no está correctamente establecido
        const tipoDocId = this.form.get('tipoDoc')?.value;
        const tipoDoc = this.tiposDocs.find(d => String(d.U_IdDocumento) === String(tipoDocId));
        if (tipoDoc) {
          this.form.patchValue({
            tipoDocName: tipoDoc.U_TipDoc,
            idTipoDoc: tipoDoc.U_IdTipoDoc,
          }, { emitEvent: false });
        }
        setTimeout(() => this.recalcular(), 0);
      }
    }
    
    // Detectar cambios en valores calculados (impuestos)
    if (changes['baseImponible'] || changes['montoIVA'] || changes['montoIT'] || 
        changes['montoIUE'] || changes['montoRCIVA'] || changes['totalImpuestos'] || 
        changes['totalCalculado']) {
      this.cdr.detectChanges();
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      // Tab 1: Identificación
      cuenta: ['', Validators.maxLength(25)],
      nombreCuenta: ['', Validators.maxLength(250)],
      fecha: ['', Validators.required],
      tipoDoc: ['', Validators.required],
      tipoDocName: [''],
      idTipoDoc: [1],
      numDocumento: ['', Validators.maxLength(20)],
      nroAutor: ['', Validators.maxLength(250)],
      cuf: ['', Validators.maxLength(250)],
      ctrl: ['', Validators.maxLength(25)],
      prov: ['', Validators.maxLength(200)],
      codProv: ['', Validators.maxLength(25)],
      concepto: ['', [Validators.required, Validators.maxLength(200)]],
      
      // Tab 2: Montos y Normas
      importe: [0, [Validators.required, Validators.min(0)]],
      descuento: [0],
      exento: [0],
      tasa: [1],
      giftCard: [0],
      tasaCero: [0],
      ice: [0],
      proyecto: ['', Validators.maxLength(100)],
      n1: [''],
      n2: [''],
      n3: [''],
      n4: [''],
      n5: [''],
      
      // Tab 3: Cálculo Impuestos (calculados)
      iva: [0],
      it: [0],
      iue: [0],
      rciva: [0],
      montoIVA: [0],
      montoIT: [0],
      montoIUE: [0],
      montoRCIVA: [0],
      impRet: [0],
      total: [0],
      
      // Ocultos - requeridos por backend
      nit: ['0'],
      ctaExento: [''],
      cuentaIVA: [''],
      cuentaIT: [''],
      cuentaIUE: [''],
      cuentaRCIVA: [''],
    });
    
    // Detectar cambios para marcar como dirty
    this.form.valueChanges.subscribe(() => {
      this.isDirty = true;
    });
  }

  private patchFormValues(data: RendD): void {
    // Buscar el tipo de documento para obtener el nombre correcto
    const tipoDocId = String(data.U_RD_TipoDoc ?? '');
    const tipoDoc = this.tiposDocs.find(d => String(d.U_IdDocumento) === tipoDocId);
    
    this.form.patchValue({
      cuenta: data.U_RD_Cuenta ?? '',
      nombreCuenta: data.U_RD_NombreCuenta ?? '',
      fecha: data.U_RD_Fecha?.substring(0, 10) ?? '',
      tipoDoc: tipoDocId,
      tipoDocName: tipoDoc?.U_TipDoc ?? data.U_RD_TipoDoc ?? '',
      idTipoDoc: data.U_RD_IdTipoDoc ?? 1,
      numDocumento: data.U_RD_NumDocumento ?? '',
      nroAutor: data.U_RD_NroAutor ?? '',
      cuf: data.U_CUF ?? '',
      ctrl: data.U_RD_Ctrl ?? '',
      prov: data.U_RD_Prov ?? '',
      codProv: data.U_RD_CodProv ?? '',
      concepto: data.U_RD_Concepto ?? '',
      importe: data.U_RD_Importe ?? 0,
      descuento: data.U_RD_Descuento ?? 0,
      exento: data.U_RD_Exento ?? 0,
      tasa: data.U_TASA ?? 1,
      giftCard: data.U_GIFTCARD ?? 0,
      tasaCero: data.U_RD_TasaCero ?? 0,
      ice: data.U_ICE ?? 0,
      proyecto: data.U_RD_Proyecto ?? '',
      n1: data.U_RD_N1 ?? '',
      n2: data.U_RD_N2 ?? '',
      n3: data.U_RD_N3 ?? '',
      n4: data.U_RD_N4 ?? '',
      n5: data.U_RD_N5 ?? '',
      nit: data.U_RD_NIT ?? '0',
      ctaExento: data.U_CTAEXENTO ?? '',
      cuentaIVA: data.U_CuentaIVA ?? '',
      cuentaIT: data.U_CuentaIT ?? '',
      cuentaIUE: data.U_CuentaIUE ?? '',
      cuentaRCIVA: data.U_CuentaRCIVA ?? '',
      // Impuestos calculados - usar valores guardados en BD
      montoIVA: data.U_MontoIVA ?? 0,
      montoIT: data.U_MontoIT ?? 0,
      montoIUE: data.U_MontoIUE ?? 0,
      montoRCIVA: data.U_MontoRCIVA ?? 0,
      impRet: data.U_RD_ImpRet ?? 0,
      total: data.U_RD_Total ?? 0,
    }, { emitEvent: false });
    
    this.isDirty = false;
    this.aiDocSvc.limpiarMensajeYSugerencia();
    this.cdr.detectChanges();
  }

  private updateTipoDocOptions(): void {
    // Actualizar opciones de tipo de documento basado en tiposDocs
    // Esto se maneja en el componente padre que pasa la config
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId as 'doc' | 'montos' | 'impuestos';
    this.tabChange.emit(tabId);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const raw = this.form.getRawValue();
    const data: DocFormSubmitData = {
      cuenta: raw.cuenta,
      nombreCuenta: raw.nombreCuenta,
      fecha: raw.fecha,
      tipoDoc: raw.tipoDoc,
      idTipoDoc: raw.idTipoDoc,
      tipoDocName: raw.tipoDocName,
      numDocumento: raw.numDocumento,
      nroAutor: raw.nroAutor,
      cuf: raw.cuf,
      ctrl: raw.ctrl,
      prov: raw.prov,
      codProv: raw.codProv,
      nit: raw.nit,
      concepto: raw.concepto,
      importe: Number(raw.importe),
      exento: Number(raw.exento),
      ice: Number(raw.ice),
      tasa: Number(raw.tasa),
      tasaCero: Number(raw.tasaCero),
      giftCard: Number(raw.giftCard),
      descuento: Number(raw.descuento),
      iva: Number(raw.iva),
      it: Number(raw.it),
      iue: Number(raw.iue),
      rciva: Number(raw.rciva),
      montoIVA: Number(raw.montoIVA),
      montoIT: Number(raw.montoIT),
      montoIUE: Number(raw.montoIUE),
      montoRCIVA: Number(raw.montoRCIVA),
      impRet: Number(raw.impRet),
      total: Number(raw.total),
      proyecto: raw.proyecto,
      n1: raw.n1,
      n2: raw.n2,
      n3: raw.n3,
      ctaExento: raw.ctaExento,
      cuentaIVA: raw.cuentaIVA,
      cuentaIT: raw.cuentaIT,
      cuentaIUE: raw.cuentaIUE,
      cuentaRCIVA: raw.cuentaRCIVA,
    };
    
    this.save.emit(data);
  }

  onCancel(): void {
    this.cancel.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.form.reset();
    this.activeTab = 'doc';
    this.isDirty = false;
    this.aiDocSvc.limpiarMensajeYSugerencia();
  }

  // Event handlers
  onCuentaChange(cuenta: { code: string; name: string } | null): void {
    this.form.patchValue({
      cuenta: cuenta?.code ?? '',
      nombreCuenta: cuenta?.name ?? '',
    });
    this.cuentaChange.emit(cuenta);
  }

  onTipoDocChange(tipoDoc: string): void {
    const doc = this.tiposDocs.find(d => String(d.U_IdDocumento) === tipoDoc);
    if (doc) {
      this.form.patchValue({
        tipoDoc: String(doc.U_IdDocumento),
        idTipoDoc: doc.U_IdTipoDoc,
        tipoDocName: doc.U_TipDoc,
      });
    }
    this.tipoDocChange.emit(tipoDoc);
  }

  onToggleFacturaLinea(): void {
    this.toggleFacturaLinea.emit();
  }

  onProveedorChange(prov: { cardCode: string; cardName: string; licTradNum?: string } | null): void {
    this.form.patchValue({
      codProv: prov?.cardCode ?? '',
      prov: prov?.cardName ?? '',
      nit: prov?.licTradNum ?? '',
    });
    this.proveedorChange.emit(prov);
  }

  onNuevoProv(): void {
    this.nuevoProv.emit();
  }

  onDimensionChange(slot: number, value: string): void {
    const field = 'n' + slot;
    this.form.patchValue({ [field]: value });
    this.dimensionChange.emit({ slot, value });
  }

  onProjectChange(project: ProjectDto | null): void {
    this.form.patchValue({ proyecto: project?.code ?? '' });
    this.projectChange.emit(project);
  }
  
  // Métodos públicos para actualizar valores desde el padre
  patchValue(values: Partial<DocFormSubmitData>): void {
    this.form.patchValue(values, { emitEvent: false });
  }
  
  getFormValue(): DocFormSubmitData {
    return this.form.getRawValue() as DocFormSubmitData;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // MOTOR DE CÁLCULO DE IMPUESTOS
  // ═══════════════════════════════════════════════════════════════
  
  /** Engancha el cálculo automático a los campos del formulario */
  private _engancharCalculos(): void {
    const campos = ['importe', 'descuento', 'tasa', 'tasaCero', 'giftCard', 'ice', 'exento', 'tipoDoc'];
    
    campos.forEach(campo => {
      const control = this.form.get(campo);
      if (control) {
        control.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.recalcular());
      }
    });
  }
  
  /** Recalcula todos los valores de impuestos y totales */
  recalcular(): void {
    const tipoDoc = this.form.get('tipoDoc')?.value;
    const doc = this.tiposDocs.find(d => String(d.U_IdDocumento) === String(tipoDoc));
    
    if (!doc) {
      return;
    }
    
    const r = this.form.getRawValue();
    const resultado = this.calculoSvc.calcular(doc, {
      importe: r.importe,
      exento: r.exento,
      tasa: r.tasa,
      tasaCero: r.tasaCero,
      giftCard: r.giftCard,
      ice: r.ice,
    });
    
    if (!resultado) {
      return;
    }
    
    this.baseImponible = resultado.baseImponible;
    this.montoIVA = resultado.montoIVA;
    this.montoIT = resultado.montoIT;
    this.montoIUE = resultado.montoIUE;
    this.montoRCIVA = resultado.montoRCIVA;
    this.totalImpuestos = resultado.impRet;
    this.totalCalculado = resultado.total;
    
    // Actualizar formulario sin disparar valueChanges
    this.form.patchValue({
      exento: resultado.exento,
      ice: resultado.ice,
      montoIVA: resultado.montoIVA,
      montoIT: resultado.montoIT,
      montoIUE: resultado.montoIUE,
      montoRCIVA: resultado.montoRCIVA,
      impRet: resultado.impRet,
      total: resultado.total,
      iva: doc.U_IVApercent || 0,
      it: doc.U_ITpercent || 0,
      iue: doc.U_IUEpercent || 0,
      rciva: doc.U_RCIVApercent || 0,
    }, { emitEvent: false });
    
    this.cdr.detectChanges();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // FUNCIONALIDAD IA - Sugerencia de cuenta y dimensiones
  // ═══════════════════════════════════════════════════════════════
  
  // ═══════════════════════════════════════════════════════════════
  // FUNCIONALIDAD IA - delegada a AiDocumentoService
  // ═══════════════════════════════════════════════════════════════

  solicitarSugerenciaIA(): void {
    const concepto = this.form.get('concepto')?.value || '';
    const importe = this.form.get('importe')?.value || 0;
    const proveedor = this.form.get('prov')?.value || '';

    this.aiDocSvc.solicitarSugerencia(
      concepto,
      importe,
      proveedor,
      this.tiposDocs,
      () => this.cdr.detectChanges(),
    );
  }

  aceptarSugerenciaIA(): void {
    const patch = this.aiDocSvc.aceptarSugerencia(this.config?.normaSlots ?? []);
    if (!patch) return;
    this.form.patchValue(patch, { emitEvent: false });
    this.cdr.detectChanges();
  }

  rechazarSugerenciaIA(): void {
    this.aiDocSvc.rechazarSugerencia();
  }

  get tieneSugerenciaPendiente(): boolean {
    return this.aiDocSvc.sugerenciaPendiente !== null;
  }

  puedeSolicitarIA(): boolean {
    const concepto = this.form.get('concepto')?.value || '';
    return this.aiDocSvc.puedeSolicitar(concepto);
  }
}
