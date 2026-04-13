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
import { FormModalComponent, FormModalTab } from '../../../../shared/form-modal/form-modal.component';
import { AppSelectComponent, SelectOption } from '../../../../shared/app-select/app-select.component';
import { CuentaSearchComponent } from '../../../../shared/cuenta-search/cuenta-search.component';
import { ProveedorSearchComponent } from '../../../../shared/proveedor-search/proveedor-search.component';
import { ProjectSearchComponent, ProjectDto } from '../../../../shared/project-search/project-search.component';

// Modelos
import { RendD } from '../../../../models/rend-d.model';
import { Documento } from '../../../../models/documento.model';
import { Perfil } from '../../../../models/perfil.model';
import { CuentaDto } from '../../../../services/sap.service';

// Servicios IA
import { AiService, ClasificacionSugeridaResponse } from '../../../../services/ai.service';

export interface DocFormConfig {
  cueCar: string;
  cueTexto: string;
  listaCuentas: CuentaDto[];
  proCar: string;
  proTexto: string;
  tipoDocOptions: SelectOption[];
  normaSlots: NormaSlotConfig[];
}

export interface NormaSlotConfig {
  slot: number;
  label: string;
  dimensionId?: number;
  dimensionName?: string;
  rules: SelectOption[];
}

export interface DocFormSubmitData {
  // Datos del formulario - mapear según necesidad del backend
  cuenta: string;
  nombreCuenta: string;
  fecha: string;
  tipoDoc: string;
  idTipoDoc: number;
  tipoDocName: string;
  numDocumento: string;
  nroAutor: string;
  cuf: string;
  ctrl: string;
  prov: string;
  codProv: string;
  nit: string;
  concepto: string;
  // Montos
  importe: number;
  exento: number;
  ice: number;
  tasa: number;
  tasaCero: number;
  giftCard: number;
  descuento: number;
  // Impuestos calculados
  iva: number;
  it: number;
  iue: number;
  rciva: number;
  montoIVA: number;
  montoIT: number;
  montoIUE: number;
  montoRCIVA: number;
  impRet: number;
  total: number;
  // Dimensiones/Normas
  proyecto: string;
  n1: string;
  n2: string;
  n3: string;
  // Extras
  ctaExento: string;
  cuentaIVA: string;
  cuentaIT: string;
  cuentaIUE: string;
  cuentaRCIVA: string;
}

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
  
  // Estado de IA
  iaLoading = false;
  iaSugerencia: ClasificacionSugeridaResponse | null = null;
  iaSugerenciaMensaje = '';
  iaHabilitada = false;
  
  // Sugerencia pendiente de aprobación
  iaSugerenciaPendiente: {
    cuenta?: { codigo: string; nombre: string };
    tipoDoc?: { id: string; nombre: string };
    dimensiones: string[];
    confianza: number;
  } | null = null;
  
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
    private aiService: AiService,
  ) {
    // Verificar estado inicial de IA
    this.iaHabilitada = this.aiService.estaHabilitada;
  }

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
    
    // Suscribirse a cambios en el estado de IA
    this.aiService.aiStatus$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(status => {
      const nuevaHabilitacion = status?.ia?.enabled === true && status?.ia?.configured === true;
      if (this.iaHabilitada !== nuevaHabilitacion) {
        this.iaHabilitada = nuevaHabilitacion;
        this.cdr.detectChanges();
      }
    });
    
    // Cargar estado de IA si no está cargado
    if (!this.aiService.status) {
      this.aiService.cargarStatus().subscribe();
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.iaSugerencia = null;
    this.iaSugerenciaMensaje = '';
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
    this.iaSugerencia = null;
    this.iaSugerenciaMensaje = '';
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
      console.log('[recalcular] No se encontró tipo de documento:', tipoDoc);
      return;
    }
    
    const idTipoDoc = Number(doc.U_IdTipoDoc);
    // Solo calcular para tipos 1 (Factura), 4 (Recibo), 10 (Alquiler)
    if (![1, 4, 10].includes(idTipoDoc)) return;
    
    const r = this.form.getRawValue();
    const importe = this._n(r.importe);
    
    // Debug: mostrar valores de configuración
    console.log('[recalcular] Config:', {
      exentoPct: doc.U_EXENTOpercent,
      icePct: doc.U_ICE,
      tasaPct: doc.U_TASA,
    });
    console.log('[recalcular] Form values:', {
      exento: r.exento,
      ice: r.ice,
      tasa: r.tasa,
      importe: r.importe,
    });
    
    // Calcular valores base
    const exento = this._calcularExento(importe, doc);
    const ice = this._calcularICE(importe, doc);
    
    console.log('[recalcular] Calculados:', { exento, ice, importe });
    const tasa = Number(doc.U_TASA) === -1 ? this._n(r.tasa) : (Number(doc.U_TASA) ?? 0);
    const tasaCero = this._n(r.tasaCero);
    const giftCard = this._n(r.giftCard);
    
    // Base imponible
    this.baseImponible = Math.max(0, importe - exento - ice - tasa - tasaCero - giftCard);
    
    console.log('[recalcular] Base imponible:', {
      baseImponible: this.baseImponible,
      importe,
      exento,
      ice,
      tasa,
      tasaCero,
      giftCard,
    });
    
    // Calcular impuestos según tipo de documento
    const tipoCalc = String(doc.U_TipoCalc);
    const esRecibo = idTipoDoc === 4 || idTipoDoc === 10;
    
    if (idTipoDoc === 1) {
      // Factura: cálculo normal sobre base imponible
      this.montoIVA = this._calcImpuesto(this.baseImponible, doc.U_IVApercent);
      this.montoIT = this._calcImpuesto(this.baseImponible, doc.U_ITpercent);
      this.montoIUE = this._calcImpuesto(this.baseImponible, doc.U_IUEpercent);
      this.montoRCIVA = this._calcImpuesto(this.baseImponible, doc.U_RCIVApercent);
    } else if (esRecibo && tipoCalc === '1') {
      // Grossing Down: impuestos sobre importe
      this.montoIT = this._calcImpuesto(importe, doc.U_ITpercent);
      this.montoRCIVA = this._calcImpuesto(importe, doc.U_RCIVApercent);
      this.montoIVA = this._calcImpuesto(importe, doc.U_IVApercent);
      this.montoIUE = this._calcImpuesto(importe, doc.U_IUEpercent);
    } else if (esRecibo && tipoCalc === '0') {
      // Grossing Up: calcular bruto
      const tasaIUE = (Number(doc.U_IUEpercent) || 0) / 100;
      const tasaIT = (Number(doc.U_ITpercent) || 0) / 100;
      const tasaRCIVA = (Number(doc.U_RCIVApercent) || 0) / 100;
      const tasaIVA = (Number(doc.U_IVApercent) || 0) / 100;
      const sumaTasas = tasaIUE + tasaIT + tasaRCIVA + tasaIVA;
      
      const bruto = sumaTasas > 0 && sumaTasas < 1
        ? this._round(importe / (1 - sumaTasas))
        : importe;
      
      this.montoIUE = this._round(bruto * tasaIUE);
      this.montoIT = this._round(bruto * tasaIT);
      this.montoRCIVA = this._round(bruto * tasaRCIVA);
      this.montoIVA = this._round(bruto * tasaIVA);
    }
    
    // Totales
    this.totalImpuestos = this._round(this.montoIVA + this.montoIT + this.montoIUE + this.montoRCIVA);
    
    if (esRecibo && tipoCalc === '0') {
      // Grossing Up: Total = Importe + ImpRet
      this.totalCalculado = this._round(importe + this.totalImpuestos);
    } else {
      // Grossing Down / Factura: Total = Importe - ImpRet
      this.totalCalculado = this._round(importe - this.totalImpuestos);
    }
    
    // Actualizar formulario sin disparar valueChanges
    this.form.patchValue({
      exento: exento,
      ice: ice,
      montoIVA: this.montoIVA,
      montoIT: this.montoIT,
      montoIUE: this.montoIUE,
      montoRCIVA: this.montoRCIVA,
      impRet: this.totalImpuestos,
      total: this.totalCalculado,
      iva: doc.U_IVApercent || 0,
      it: doc.U_ITpercent || 0,
      iue: doc.U_IUEpercent || 0,
      rciva: doc.U_RCIVApercent || 0,
    }, { emitEvent: false });
    
    this.cdr.detectChanges();
  }
  
  private _calcularExento(importe: number, doc: Documento): number {
    const exentoPct = Number(doc.U_EXENTOpercent);
    const formExento = this._n(this.form.get('exento')?.value);
    
    console.log('[_calcularExento]', { exentoPct, formExento, importe });
    
    if (exentoPct === -1) {
      console.log('  -> Usando valor del formulario:', formExento);
      return formExento;
    }
    const calculado = exentoPct > 0 ? this._round(importe * (exentoPct / 100)) : 0;
    console.log('  -> Calculado automático:', calculado);
    return calculado;
  }
  
  private _calcularICE(importe: number, doc: Documento): number {
    const icePct = Number(doc.U_ICE);
    if (icePct === -1) {
      return this._n(this.form.get('ice')?.value);
    }
    return icePct > 0 ? this._round(importe * (icePct / 100)) : 0;
  }
  
  private _calcImpuesto(base: number, percent: number | string | null): number {
    const pct = Number(percent) || 0;
    return pct > 0 ? this._round(base * (pct / 100)) : 0;
  }
  
  private _n(val: any): number {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  
  private _round(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // FUNCIONALIDAD IA - Sugerencia de cuenta y dimensiones
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Solicita sugerencia de clasificación contable a la IA
   * basándose en el concepto/glosa del gasto
   */
  solicitarSugerenciaIA(): void {
    const concepto = this.form.get('concepto')?.value || '';
    const importe = this.form.get('importe')?.value || 0;
    const proveedor = this.form.get('prov')?.value || '';
    
    if (!concepto || concepto.trim().length < 5) {
      return; // No mostrar error, solo no hacer nada si el concepto es muy corto
    }
    
    this.iaLoading = true;
    this.cdr.detectChanges();
    
    this.aiService.sugerirClasificacion({
      concepto: concepto.trim(),
      monto: importe,
      proveedor,
    }).subscribe({
      next: (sugerencia) => {
        this.iaLoading = false;
        this.iaSugerencia = sugerencia;
        this.cdr.detectChanges();
        
        if (sugerencia) {
          // Auto-aplicar la sugerencia
          this.aplicarSugerenciaIA(sugerencia);
        }
      },
      error: () => {
        this.iaLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  /**
   * Sugiere tipo de documento basado en el concepto/glosa
   * Analiza palabras clave en el concepto para determinar el tipo de documento más apropiado
   */
  private sugerirTipoDocumentoPorConcepto(concepto: string): { id: string; nombre: string } | null {
    if (!concepto || this.tiposDocs.length === 0) return null;
    
    const conceptoLower = concepto.toLowerCase();
    
    // Mapeo de palabras clave a tipos de documento comunes
    const keywordMap: { [key: string]: string[] } = {
      'factura': ['factura', 'fact'],
      'recibo': ['recibo', 'rec'],
      'boleta': ['boleta', 'boleta de venta'],
      'ticket': ['ticket', 'tiket', 'tkt'],
      'nota': ['nota de credito', 'nota de debito', 'nota de crédito', 'nota de débito', 'nc', 'nd'],
      'comprobante': ['comprobante', 'comp'],
      'declaracion': ['declaracion', 'declaración', 'dj'],
      'formulario': ['formulario', 'form'],
      'invoice': ['invoice', 'invoce'],
      'orden': ['orden de compra', 'oc', 'orden'],
      'contrato': ['contrato'],
      'memorandum': ['memorandum', 'memo'],
      'acta': ['acta'],
      'resolucion': ['resolucion', 'resolución'],
    };
    
    // Buscar coincidencias
    for (const [tipoBase, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (conceptoLower.includes(keyword)) {
          // Buscar tipo de documento que coincida
          const tipoDoc = this.tiposDocs.find(d => 
            d.U_TipDoc?.toLowerCase().includes(tipoBase)
          );
          if (tipoDoc) {
            return { 
              id: String(tipoDoc.U_IdDocumento), 
              nombre: tipoDoc.U_TipDoc || 'Documento' 
            };
          }
        }
      }
    }
    
    // Si no hay coincidencia, sugerir el primer tipo de documento (por defecto)
    const defaultDoc = this.tiposDocs[0];
    if (defaultDoc) {
      return { 
        id: String(defaultDoc.U_IdDocumento), 
        nombre: defaultDoc.U_TipDoc || 'Documento' 
      };
    }
    
    return null;
  }

  /**
   * Procesa la sugerencia de IA y la guarda como pendiente de aprobación
   */
  private aplicarSugerenciaIA(sugerencia: ClasificacionSugeridaResponse): void {
    const dimensionesAplicadas: string[] = [];
    
    // Recopilar dimensiones sugeridas
    if (sugerencia.proyecto) {
      dimensionesAplicadas.push('Proyecto');
    }
    if (sugerencia.dimension1) {
      dimensionesAplicadas.push('N1');
    }
    if (sugerencia.norma) {
      const normaSlot = this.config?.normaSlots?.find(s => 
        s.dimensionName?.toLowerCase().includes('norma') || 
        s.label.toLowerCase().includes('norma')
      );
      if (normaSlot) {
        dimensionesAplicadas.push(normaSlot.label);
      }
    }
    
    // Sugerir tipo de documento basado en el concepto
    const concepto = this.form.get('concepto')?.value || '';
    const tipoDocSugerido = this.sugerirTipoDocumentoPorConcepto(concepto);
    
    // Guardar sugerencia pendiente (NO aplicar al formulario todavía)
    this.iaSugerenciaPendiente = {
      cuenta: sugerencia.cuentaContable ? {
        codigo: sugerencia.cuentaContable.codigo,
        nombre: sugerencia.cuentaContable.nombre
      } : undefined,
      tipoDoc: tipoDocSugerido ? {
        id: tipoDocSugerido.id,
        nombre: tipoDocSugerido.nombre
      } : undefined,
      dimensiones: dimensionesAplicadas,
      confianza: Math.round(sugerencia.cuentaContable.confianza * 100)
    };
    
    // Actualizar mensaje informativo
    this.iaSugerenciaMensaje = '';
    
    this.cdr.detectChanges();
  }
  
  /**
   * Aplica la sugerencia pendiente al formulario cuando el usuario acepta
   */
  aceptarSugerenciaIA(): void {
    if (!this.iaSugerenciaPendiente) return;
    
    const patchValue: any = {};
    
    // Aplicar cuenta contable
    if (this.iaSugerenciaPendiente.cuenta) {
      patchValue.cuenta = this.iaSugerenciaPendiente.cuenta.codigo;
      patchValue.nombreCuenta = this.iaSugerenciaPendiente.cuenta.nombre;
    }
    
    // Aplicar tipo de documento
    if (this.iaSugerenciaPendiente.tipoDoc) {
      patchValue.tipoDoc = this.iaSugerenciaPendiente.tipoDoc.id;
      patchValue.tipoDocName = this.iaSugerenciaPendiente.tipoDoc.nombre;
    }
    
    // Aplicar dimensiones si existen (usando la sugerencia original guardada)
    if (this.iaSugerencia?.dimension1) {
      patchValue.n1 = this.iaSugerencia.dimension1.codigo;
    }
    if (this.iaSugerencia?.norma) {
      const normaSlot = this.config?.normaSlots?.find(s => 
        s.dimensionName?.toLowerCase().includes('norma') || 
        s.label.toLowerCase().includes('norma')
      );
      if (normaSlot) {
        patchValue['n' + normaSlot.slot] = String(this.iaSugerencia.norma.idNorma);
      }
    }
    if (this.iaSugerencia?.proyecto) {
      patchValue.proyecto = this.iaSugerencia.proyecto.codigo;
    }
    
    this.form.patchValue(patchValue, { emitEvent: false });
    
    // Mostrar mensaje de confirmación
    const cuenta = this.iaSugerenciaPendiente.cuenta;
    const tipoDoc = this.iaSugerenciaPendiente.tipoDoc;
    let mensajeConfirmacion = '✓ Aplicado:';
    if (cuenta) {
      mensajeConfirmacion += ` ${cuenta.nombre} (${cuenta.codigo})`;
    }
    if (tipoDoc) {
      mensajeConfirmacion += ` • ${tipoDoc.nombre}`;
    }
    this.iaSugerenciaMensaje = mensajeConfirmacion;
    
    // Limpiar sugerencia pendiente
    this.iaSugerenciaPendiente = null;
    this.cdr.detectChanges();
  }
  
  /**
   * Rechaza la sugerencia pendiente
   */
  rechazarSugerenciaIA(): void {
    this.iaSugerenciaPendiente = null;
    this.iaSugerencia = null;
    this.iaSugerenciaMensaje = '';
    this.cdr.detectChanges();
  }
  
  /**
   * Verifica si hay una sugerencia pendiente de aprobación
   */
  get tieneSugerenciaPendiente(): boolean {
    return this.iaSugerenciaPendiente !== null;
  }
  
  /**
   * Verifica si se puede solicitar sugerencia IA
   * (hay suficiente texto en el concepto)
   */
  puedeSolicitarIA(): boolean {
    const concepto = this.form.get('concepto')?.value || '';
    return this.iaHabilitada && concepto.trim().length >= 5 && !this.iaSugerenciaPendiente;
  }
}
