import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, switchMap, Subject, takeUntil, catchError, of } from 'rxjs';

import { RendDService }       from './rend-d.service';
import { RendMService }       from '../rend-m/rend-m.service';
import { PerfilesService }    from '../perfiles/perfiles.service';
import { DocumentosService }  from '../documentos/documentos.service';
import { CuentasListaService } from '../cuentas-lista/cuentas-lista.service';
import { SapService, DimensionWithRules, CuentaDto } from '@services/sap.service';
import { ToastService }       from '@core/toast/toast.service';

import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';

import type { SelectOption } from '@shared/app-select/app-select.component';

import { ProvService, ProvEventual } from '@services/prov.service';
import { AdjuntosService } from '@services/adjuntos.service';
import { AdjuntosListComponent } from '@shared/adjuntos-list/adjuntos-list.component';
import { Adjunto } from '@models/adjunto.model';

import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';
import { AuthService }        from '@auth/auth.service';
import { FacturaService, FacturaSiat, FacturaResult } from '@services/factura.service';

import { RendM }              from '@models/rend-m.model';
import { RendD, CreateRendDPayload } from '@models/rend-d.model';
import { Documento }          from '@models/documento.model';
import { Perfil }             from '@models/perfil.model';
import { PrctjModalComponent }          from './prctj-modal/prctj-modal.component';
import { RendicionPdfPreviewComponent } from '@shared/rendicion-pdf/rendicion-pdf-preview.component';
import { AiFacturaPreviewComponent } from '@shared/ai-factura-preview/ai-factura-preview.component';
import { AiService } from '@services/ai.service';

import { FormModalComponent } from '@shared/form-modal';
import type { ProjectDto } from '@shared/project-search/project-search.component';

import { RendDExcelService, RendDScanService, PdfBatchItem } from './services';
import { CalculoImpuestosService } from '@services/calculo-impuestos.service';

// Componentes refactorizados
import {
  PageHeaderComponent,
  MaestrosPanelComponent,
  SaldoPanelComponent,
  DocumentTableComponent,
  ModeSelectorModalComponent,
  UrlImportModalComponent,
  QrScannerModalComponent,
  PdfBatchResultsModalComponent,
  ProvEventualModalComponent,
  DocFormComponent,
  type DocFormConfig,
} from './components';


interface NormaActiva {
  slot:      number;
  dimension: DimensionWithRules;
  rules:     SelectOption[];
}



@Component({
  standalone: true,
  selector: 'app-rend-d',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,

    SkeletonLoaderComponent, PrctjModalComponent, RendicionPdfPreviewComponent, AiFacturaPreviewComponent,
    AdjuntosListComponent,
    FormModalComponent,


    // Componentes refactorizados
    PageHeaderComponent,
    MaestrosPanelComponent, SaldoPanelComponent, DocumentTableComponent,
    ModeSelectorModalComponent, UrlImportModalComponent, ProvEventualModalComponent,
    QrScannerModalComponent, PdfBatchResultsModalComponent,
    DocFormComponent,
  ],
  templateUrl: './rend-d.component.html',
  styleUrls:   ['./rend-d.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RendDComponent implements OnInit, OnDestroy {

  idRendicion!: number;
  cabecera:     RendM | null = null;
  perfil:       Perfil | null = null;
  documentos:   RendD[]     = [];
  paged:        RendD[]     = [];
  tiposDocs:    Documento[] = [];
  normasActivas: NormaActiva[] = [];
  
  // Totales de impuestos para tabla (evitar problemas de change detection con getters)
  totalesIVA    = 0;
  totalesIT     = 0;
  totalesIUE    = 0;
  totalesRCIVA  = 0;
  
  // Objeto de totales para pasar al componente tabla (nueva referencia cada vez)
  private _totalesImpuestosObj = { iva: 0, it: 0, iue: 0, rciva: 0 };

  private _totales = {
    importe: 0, descuento: 0, exento: 0, tasaCero: 0, tasa: 0,
    ice: 0, giftCard: 0, impRet: 0, iva: 0, it: 0, iue: 0, rciva: 0,
    baseImp: 0, general: 0,
  };

  // Config cuentas del perfil
  cueCar     = 'TODOS';
  cueTexto     = '';
  listaCuentas:  CuentaDto[] = [];

  // Config proveedores del perfil
  proCar = 'TODOS';
  proTexto = '';
  proveedorSeleccionado: { cardCode: string; cardName: string; licTradNum?: string } | null = null;

  @ViewChild('provSearch') provSearch!: any;

  // Fecha actual en formato yyyy-MM-dd para input type=date
  private get hoy(): string {
    return new Date().toISOString().substring(0, 10);
  }

  loadingCab  = false;
  loadingDocs = false;
  loadError   = false;

  page       = 1;
  limit      = 10;
  totalPages = 1;

  showForm    = false;
  editingDoc: RendD | null = null;
  tablaActiva: 'documentos' | 'impuestos' = 'documentos';
  isSaving    = false;
  activeTab: 'doc' | 'montos' | 'impuestos' = 'doc';

  // Tabs configuración para FormModalComponent
  formTabs = [
    { id: 'doc', label: 'Identificación' },
    { id: 'montos', label: 'Montos y Normas' },
    { id: 'impuestos', label: 'Cálculo Impuestos' },
  ];

  // Modal selector de modo (QR / Manual / URL / PDF)
  showModeSelector = false;

  // Modal URL
  showUrlModal      = false;
  urlInput          = '';
  urlLoadingFactura = false;
  urlError:         string | null = null;
  pdfLoadingFactura = false;
  pdfError:         string | null = null;
  importando        = false;
  importError:      string | null = null;

  // Modal PDF
  showPdfModal  = false;
  pdfFiles:     File[] = [];
  pdfFileNames  = '';

  // Modal Preview IA (single)
  showAiPreviewModal = false;
  aiPreviewResult: FacturaResult | null = null;

  // ══ Procesamiento Batch de PDFs ══
  pdfBatchProcessing = false;
  pdfBatchResults: PdfBatchItem[] = [];
  showPdfBatchModal = false;
  currentProcessingIndex = -1;

  // Modal de revisión individual del batch
  showBatchItemReviewModal = false;
  batchItemBeingReviewed: PdfBatchItem | null = null;
  batchItemReviewIndex = -1;

  // Modal escáner QR
  showQrScanner    = false;
  qrError:         string | null = null;
  qrLoadingFactura = false; // true mientras consulta el SIAT

  // Toggle Facturación en Línea
  facturaLinea = true; // activo por defecto

  // Toggle Tasa Cero
  tasaCeroActivo  = false;
  // Toggle Descuento
  descuentoActivo = false;
  // Toggle GiftCard
  giftCardActivo  = false;
  // Toggle Proyecto
  proyectoActivo  = false;
  // Toggle Exento variable
  exentoActivo    = false;
  
  // ══ Funcionalidades IA ══
  /** Estado de habilitación de IA */
  iaEnabled = false;
  // Flag: preserva el exento guardado al abrir edición con % fijo
  private _preservarExento = false;

  // Modal nuevo proveedor eventual
  showNuevoProv   = false;
  nuevoProvNit    = '';
  nuevoProvNombre = '';
  guardandoProv   = false;

  form!: FormGroup;
  private initialValues: Record<string, unknown> | null = null;

  // ── Motor de cálculo ───────────────────────────────────────────
  // Configuración del documento activo (REND_CTA row)
  protected configDocActivo: Documento | null = null;
  // Subject para destruir la suscripción de valueChanges al cambiar de doc
  private calcDestroy$ = new Subject<void>();
  private destroy$ = new Subject<void>();



  get isAdmin():    boolean { return this.auth.isAdmin; }
  get isReadonly(): boolean {
    if (this.isAdmin) return false;
    if (this.cabecera?.U_Estado === 1) return false;
    if (this.auth.esAprobador && this.cabecera?.U_Estado === 4) return false;
    return true;
  }
  get isDirty(): boolean {
    if (!this.editingDoc || !this.initialValues) return true;
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.initialValues);
  }

  get totalImporte():   number { return this._totales.importe; }
  get totalDescuento(): number { return this._totales.descuento; }
  get totalExento():    number { return this._totales.exento; }
  get totalTasaCero():  number { return this._totales.tasaCero; }
  get totalTasa():      number { return this._totales.tasa; }
  get totalIce():       number { return this._totales.ice; }
  get totalGiftCard():  number { return this._totales.giftCard; }
  get totalImpRet():    number { return this._totales.impRet; }
  get totalIVA():       number { return this._totales.iva; }
  get totalIT():        number { return this._totales.it; }
  get totalIUE():       number { return this._totales.iue; }
  get totalRCIVA():     number { return this._totales.rciva; }
  get totalBaseImp():   number { return this._totales.baseImp; }
  get totalGeneral():   number { return this._totales.general; }

  get totalesDocumentos() {
    return {
      importe: this._totales.importe,
      exento: this._totales.exento,
      ice: this._totales.ice,
      tasa: this._totales.tasa,
      tasaCero: this._totales.tasaCero,
      giftcard: this._totales.giftCard,
      descuento: this._totales.descuento,
      base: this._totales.baseImp,
      impRet: this._totales.impRet,
      total: this._totales.general
    };
  }

  get totalesImpuestos() {
    // Crear nuevo objeto para OnPush change detection
    this._totalesImpuestosObj = {
      iva: this.totalesIVA,
      it: this.totalesIT,
      iue: this.totalesIUE,
      rciva: this.totalesRCIVA
    };
    return this._totalesImpuestosObj;
  }
  
  /** Recalcula todos los totales en un solo recorrido */
  private _recalcularTotales(): void {
    let importe = 0, descuento = 0, exento = 0, tasaCero = 0, tasa = 0;
    let ice = 0, giftCard = 0, impRet = 0, iva = 0, it = 0, iue = 0, rciva = 0;
    let baseImp = 0, general = 0;
    
    for (const d of this.documentos) {
      const di = d.U_RD_Importe ?? 0;
      const de = d.U_RD_Exento ?? 0;
      const dice = d.U_ICE ?? 0;
      const dt = d.U_TASA ?? 0;
      const dtc = d.U_RD_TasaCero ?? 0;
      const dg = d.U_GIFTCARD ?? 0;
      
      importe   += di;
      descuento += d.U_RD_Descuento ?? 0;
      exento    += de;
      tasaCero  += dtc;
      tasa      += dt;
      ice       += dice;
      giftCard  += dg;
      impRet    += d.U_RD_ImpRet ?? 0;
      iva       += d.U_MontoIVA ?? 0;
      it        += d.U_MontoIT ?? 0;
      iue       += d.U_MontoIUE ?? 0;
      rciva     += d.U_MontoRCIVA ?? 0;
      baseImp   += (di - de - dice - dt - dtc - dg);
      general   += d.U_RD_Total ?? 0;
    }
    
    this._totales = {
      importe, descuento, exento, tasaCero, tasa,
      ice, giftCard, impRet, iva, it, iue, rciva,
      baseImp, general,
    };
    
    this.totalesIVA   = iva;
    this.totalesIT    = it;
    this.totalesIUE   = iue;
    this.totalesRCIVA = rciva;
  }

  // ── Control de saldo ─────────────────────────────────────────
  /** Monto inicial recibido (cabecera) */
  get montoInicial(): number { return Number(this.cabecera?.U_Monto ?? 0); }

  /** Total rendido = suma de todos los importes de documentos */
  get totalRendido(): number { return this.totalImporte; }

  /** Base imponible del documento actual en el formulario */
  get baseImponible(): number {
    if (!this.form) return 0;
    const importe = +(this.form.get('importe')?.value ?? 0);
    const exento = +(this.form.get('exento')?.value ?? 0);
    const ice = +(this.form.get('ice')?.value ?? 0);
    const tasa = +(this.form.get('tasa')?.value ?? 0);
    const tasaCero = +(this.form.get('tasaCero')?.value ?? 0);
    const giftCard = +(this.form.get('giftcard')?.value ?? 0);
    return Math.max(0, importe - exento - ice - tasa - tasaCero - giftCard);
  }

  /** Total calculado del documento actual en el formulario */
  get totalCalculado(): number {
    if (!this.form) return 0;
    const importe = +(this.form.get('importe')?.value ?? 0);
    const impRet = +(this.form.get('impRet')?.value ?? 0);
    return importe - impRet;
  }

  // Montos de impuestos calculados (actualizados por _recalcular)
  montoIVA   = 0;
  montoIT    = 0;
  montoIUE   = 0;
  montoRCIVA = 0;
  totalImpuestos = 0;

  /** Saldo restante: positivo = falta rendir, negativo = excedido */
  get saldoRestante(): number {
    return Math.round((this.montoInicial - this.totalRendido) * 100) / 100;
  }

  /** Porcentaje rendido sobre el monto inicial */
  get porcentajeRendido(): number {
    if (this.montoInicial === 0) return 0;
    return Math.min(100, Math.round(((this.totalRendido / this.montoInicial) * 100) * 100) / 100);
  }

  /** true cuando se excedió el monto inicial */
  get estaExcedido(): boolean { return this.totalRendido > this.montoInicial; }

  /** true cuando está exactamente al límite */
  get estaExacto(): boolean   { return this.saldoRestante === 0 && this.montoInicial > 0; }

  /** Número de línea del documento dentro de esta rendición (1, 2, 3...) */
  get lineaActual(): number {
    if (!this.editingDoc) return 0;
    const idx = this.documentos.findIndex(d => d.U_RD_IdRD === this.editingDoc!.U_RD_IdRD);
    return idx === -1 ? 0 : idx + 1;
  }

  get tipoDocOptions(): SelectOption[] {
    return this.tiposDocs.map(d => ({ value: String(d.U_IdDocumento), label: d.U_TipDoc }));
  }

  /**
   * Obtiene el nombre del tipo de documento basado en su ID
   */
  getTipoDocName(idDocumento: number | string): string {
    const doc = this.tiposDocs.find(d => String(d.U_IdDocumento) === String(idDocumento));
    return doc?.U_TipDoc || String(idDocumento);
  }

  /** true cuando el exento lo digita el usuario (-1); false cuando es % fijo de config */
  get exentoEsVariable(): boolean {
    return Number(this.configDocActivo?.U_EXENTOpercent) === -1;
  }

  /** true cuando el exento es % fijo de config (> 0) — se muestra calculado */
  get exentoEsFijo(): boolean {
    const pct = Number(this.configDocActivo?.U_EXENTOpercent ?? 0);
    return pct > 0;
  }

  /** true cuando Tasas es variable (-1) — el usuario digita el monto */
  get tasaEsVariable(): boolean {
    return Number(this.configDocActivo?.U_TASA) === -1;
  }

  /** true cuando Tasas tiene valor fijo (distinto de -1) — campo deshabilitado */
  get tasaEsFijo(): boolean {
    return !!this.configDocActivo && Number(this.configDocActivo.U_TASA) !== -1;
  }

  /** true cuando ICE es variable (-1) — el usuario digita el monto */
  get iceEsVariable(): boolean {
    return Number(this.configDocActivo?.U_ICE) === -1;
  }

  /** true cuando ICE es % fijo (> 0) — se calcula automático sobre el importe */
  get iceEsFijo(): boolean {
    return Number(this.configDocActivo?.U_ICE ?? 0) > 0;
  }

  // ── Modal Distribución Porcentual (PRCTJ) ────────────────────────────────
  showPrctjModal = false;
  prctjDoc:       any = null;   // RendD que se está distribuyendo

  abrirPrctjModal(d: any) {
    this.prctjDoc      = d;
    this.showPrctjModal = true;
    this.cdr.markForCheck();
  }

  cerrarPrctjModal() {
    this.showPrctjModal = false;
    this.prctjDoc       = null;
    this.cdr.markForCheck();
  }

  onPrctjSaved() {
    // Recargar el detalle para reflejar que la línea ahora tiene distribución
    this.cerrarPrctjModal();
    this.loadDocs();
  }

  // ── Vista preliminar / impresión ──────────────────────────────────────
  showPdfPreview = false;
  pdfPreviewDocs: RendD[] = [];

  abrirVistaPreliminar() {
    if (!this.cabecera) return;
    this.pdfPreviewDocs = [];
    this.showPdfPreview = true;
    this.cdr.markForCheck();

    this.rendDSvc.getAll(this.idRendicion).pipe(takeUntil(this.destroy$)).subscribe({
      next: (docs) => {
        this.pdfPreviewDocs = docs;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  cerrarVistaPreliminar() {
    this.showPdfPreview = false;
    this.pdfPreviewDocs = [];
    this.cdr.markForCheck();
  }

  // ── Adjuntos / Archivos ────────────────────────────────────────────────
  showAdjuntosModal = false;
  adjuntosDoc: RendD | null = null;
  adjuntosList: Adjunto[] = [];
  adjuntosLoading = false;
  adjuntosCountMap = new Map<number, number>(); // Mapa de contadores por idRD

  /** Configuración para el DocumentTableComponent */
  get tableConfig() {
    const adjuntosCount: Record<number, number> = {};
    this.adjuntosCountMap.forEach((count, id) => {
      adjuntosCount[id] = count;
    });
    return {
      isReadonly: this.isReadonly,
      adjuntosCount
    };
  }

  /** Configuración para el DocFormComponent */
  get docFormConfig(): DocFormConfig {
    return {
      cueCar: this.cueCar,
      cueTexto: this.cueTexto,
      listaCuentas: this.listaCuentas,
      proCar: this.proCar,
      proTexto: this.proTexto,
      tipoDocOptions: this.tipoDocOptions,
      normaSlots: this.normasActivas.map(na => ({
        slot: na.slot,
        label: na.dimension.dimensionName,
        dimensionId: na.dimension.dimensionCode,
        dimensionName: na.dimension.dimensionName,
        rules: na.rules
      }))
    };
  }

  // ── Handler de acciones del DocumentTableComponent ──────────────────
  onDocumentAction(event: { action: string; document: RendD }): void {
    const { action, document } = event;
    switch (action) {
      case 'edit':
        this.openEdit(document);
        break;
      case 'adjuntos':
        this.abrirAdjuntosModal(document);
        break;
      case 'distribuir':
        this.abrirPrctjModal(document);
        break;
      case 'delete':
        this.confirmDelete(document);
        break;
    }
  }

  /** @deprecated Reemplazado por onDocumentAction */
  onActionClick(actionId: string, d: RendD) {
    switch (actionId) {
      case 'edit':
        this.openEdit(d);
        break;
      case 'dist':
        this.abrirPrctjModal(d);
        break;
      case 'delete':
        this.confirmDelete(d);
        break;
    }
  }

  abrirAdjuntosModal(d: RendD) {
    this.adjuntosDoc = d;
    this.showAdjuntosModal = true;
    this.cargarAdjuntos();
    this.cdr.markForCheck();
  }

  cerrarAdjuntosModal() {
    this.showAdjuntosModal = false;
    this.adjuntosDoc = null;
    this.adjuntosList = [];
    this.cdr.markForCheck();
  }

  cargarAdjuntos() {
    if (!this.adjuntosDoc) return;
    this.adjuntosLoading = true;
    this.adjuntosSvc.getAdjuntos(this.idRendicion, this.adjuntosDoc.U_RD_IdRD).pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.adjuntosList = list;
        this.adjuntosLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.adjuntosLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onAdjuntoSubido(adjunto: Adjunto) {
    this.adjuntosList.push(adjunto);
    // Actualizar contador en el mapa
    if (this.adjuntosDoc) {
      const idRD = this.adjuntosDoc.U_RD_IdRD;
      const currentCount = this.adjuntosCountMap.get(idRD) || 0;
      this.adjuntosCountMap.set(idRD, currentCount + 1);
    }
    this.cdr.markForCheck();
  }

  onAdjuntoEliminado(id: number) {
    this.adjuntosList = this.adjuntosList.filter(a => a.id !== id);
    // Actualizar contador en el mapa
    if (this.adjuntosDoc) {
      const idRD = this.adjuntosDoc.U_RD_IdRD;
      const currentCount = this.adjuntosCountMap.get(idRD) || 0;
      if (currentCount > 0) {
        this.adjuntosCountMap.set(idRD, currentCount - 1);
      }
    }
    this.cdr.markForCheck();
  }

  constructor(
    private route:          ActivatedRoute,
    private router:         Router,
    private rendDSvc:       RendDService,
    private rendMSvc:       RendMService,
    private perfilesSvc:    PerfilesService,
    private docsSvc:        DocumentosService,
    private cuentasListaSvc: CuentasListaService,
    private sapSvc:         SapService,
    private provSvc:        ProvService,
    private adjuntosSvc:    AdjuntosService,
    private toast:          ToastService,
    private fb:             FormBuilder,
    public  auth:           AuthService,
    private cdr:            ChangeDetectorRef,
    private facturaSvc:     FacturaService,
    private aiService:      AiService,
    private excelSvc:       RendDExcelService,
    private scanSvc:        RendDScanService,
    private calculoSvc:     CalculoImpuestosService,
    private confirmDialogService: ConfirmDialogService,
  ) {}

  ngOnInit() {
    this.idRendicion = Number(this.route.snapshot.paramMap.get('id'));
    this.buildForm();
    this.inicializarIA();
    Promise.resolve().then(() => this.loadAll());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ══ Funcionalidades IA ═════════════════════════════════════════
  
  /**
   * Inicializa el servicio de IA y suscripciones
   */
  private inicializarIA(): void {
    // Cargar estado de IA
    this.aiService.cargarStatus().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.iaEnabled = this.aiService.estaHabilitada;
        this.cdr.markForCheck();
      },
      error: () => {
        this.iaEnabled = false;
        this.cdr.markForCheck();
      }
    });
  }
  
  // La sugerencia IA ahora se gestiona dentro de DocFormComponent

  // ── Carga ─────────────────────────────────────────────────────

  private loadAll() {
    this.loadingCab  = true;
    this.loadingDocs = true;
    this.loadError   = false;
    this.cdr.markForCheck();

    // Cargar dimensiones por separado — usa shareReplay y puede emitir
    // sincrónicamente. setTimeout 0 garantiza que siempre emita en el
    // siguiente tick, después de que Angular termine su ciclo de CD.
    setTimeout(() => {
      this.sapSvc.getDimensions().pipe(catchError(() => of([])), takeUntil(this.destroy$)).subscribe({
        next: (dimensiones: any[]) => {
          this.normasActivas = dimensiones.slice(0, 3).map((dim, idx) => ({
            slot:      idx + 1,
            dimension: dim,
            rules: [
              { value: '', label: '— Sin norma —' },
              ...dim.rules.map((r: any) => ({
                value: r.factorCode,
                label: `${r.factorCode} - ${r.factorDescription}`,
              })),
            ],
          }));
          // Si el formulario está abierto y es nuevo documento, aplicar normas preconfiguradas
          if (this.showForm && !this.editingDoc) {
            this._aplicarNormasPreconfiguradas();
          }
          this.cdr.markForCheck();
        },
      });
    }, 0);

    // Cargar el resto de datos en paralelo
    this.rendMSvc.getOne(this.idRendicion).pipe(
      switchMap((cab) => {
        this.cabecera   = cab;
        this.loadingCab = false;
        this.cdr.markForCheck();
        return forkJoin({
          perfil:    this.perfilesSvc.getOne(cab.U_IdPerfil),
          documentos: this.rendDSvc.getAll(this.idRendicion),
          tiposDocs:  this.docsSvc.getByPerfil(cab.U_IdPerfil),
        });
      }),
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ perfil, documentos, tiposDocs }) => {
        this.perfil      = perfil;
        this.documentos  = documentos;
        this.tiposDocs   = tiposDocs;

        this.loadingDocs = false;
        this.loadingCab  = false;

        this.cueCar   = perfil.U_CUE_CAR   ?? 'TODOS';
        this.cueTexto = perfil.U_CUE_Texto  ?? '';
        this.proCar   = perfil.U_PRO_CAR    ?? 'TODOS';
        this.proTexto = perfil.U_PRO_Texto   ?? '';

        if (this.cueCar === 'LISTA') {
          this.cuentasListaSvc.getByPerfil(this.cabecera!.U_IdPerfil).pipe(takeUntil(this.destroy$)).subscribe({
            next: (lista) => {
              this.listaCuentas = lista.map(c => ({ code: c.U_CuentaSys, name: c.U_NombreCuenta }));
              this.cdr.markForCheck();
            },
          });
        }

        this.updatePaging();
        this._recalcularTotales();
        setTimeout(() => this.cargarContadoresAdjuntos(), 0);

        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingCab  = false;
        this.loadingDocs = false;
        this.loadError   = true;
        this.cdr.markForCheck();
      },
    });
  }

  loadDocs(onComplete?: () => void) {
    this.loadingDocs = true;
    this.loadError   = false;
    this.cdr.markForCheck();
    this.rendDSvc.getAll(this.idRendicion).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.documentos  = data;
        this.loadingDocs = false;
        this.updatePaging();
        this._recalcularTotales();
        // Cargar contadores después de un pequeño delay para asegurar que paged está actualizado
        setTimeout(() => this.cargarContadoresAdjuntos(), 0);
        this.cdr.markForCheck();
        onComplete?.();
      },
      error: () => {
        this.loadingDocs = false;
        this.loadError   = true;
        this.cdr.markForCheck();
        onComplete?.();
      },
    });
  }

  /**
   * Carga los contadores de adjuntos para todas las líneas visibles
   */
  private cargarContadoresAdjuntos() {
    this.adjuntosCountMap.clear();
    
    // Cargar contadores para cada línea de la página actual
    this.paged.forEach(d => {
      this.adjuntosSvc.getAdjuntos(this.idRendicion, d.U_RD_IdRD).pipe(takeUntil(this.destroy$)).subscribe({
        next: (adjuntos) => {
          this.adjuntosCountMap.set(d.U_RD_IdRD, adjuntos.length);
          this.cdr.markForCheck();
        },
        error: () => {
          this.adjuntosCountMap.set(d.U_RD_IdRD, 0);
        }
      });
    });
  }

  /**
   * Obtiene el contador de adjuntos para una línea
   */
  getAdjuntosCount(idRD: number): number {
    return this.adjuntosCountMap.get(idRD) || 0;
  }

  // ── Formulario ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      // Tab 1
      cuenta:        ['', Validators.maxLength(25)],
      nombreCuenta:  ['', Validators.maxLength(250)],
      fecha:         ['', Validators.required],
      tipoDoc:       ['', Validators.required],
      tipoDocName:   [''],
      idTipoDoc:     [1],
      numDocumento:  ['', Validators.maxLength(20)],
      nroAutor:      ['', Validators.maxLength(250)],
      cuf:           ['', Validators.maxLength(250)],
      ctrl:          ['', Validators.maxLength(25)],
      prov:          ['', Validators.maxLength(200)],
      codProv:       ['', Validators.maxLength(25)],
      concepto:      ['', [Validators.required, Validators.maxLength(200)]],
      // Tab 2
      importe:       [0, [Validators.required, Validators.min(0)]],
      descuento:     [0],
      exento:        [0],
      tasa:          [1],
      giftCard:      [0],
      tasaCero:      [0],
      ice:           [0],
      proyecto:      ['', Validators.maxLength(100)],
      n1:            [''],
      n2:            [''],
      n3:            [''],
      // Tab 3
      montoIVA:      [0],
      montoIT:       [0],
      montoIUE:      [0],
      montoRCIVA:    [0],
      impRet:        [0],
      total:         [0],
      // Ocultos — requeridos por backend
      nit:           ['0'],
      ctaExento:     [''],
      cuentaIVA:     [''],
      cuentaIT:      [''],
      cuentaIUE:     [''],
      cuentaRCIVA:   [''],
    });
  }

  fieldChanged(name: string): boolean {
    if (!this.editingDoc || !this.initialValues) return false;
    return this.form.get(name)?.value !== this.initialValues[name];
  }

  onTipoDocChange(idDocumento: string) {
    const doc = this.tiposDocs.find(d => String(d.U_IdDocumento) === idDocumento);
    if (!doc) return;
    this.form.patchValue({
      tipoDoc:     String(doc.U_IdDocumento),  // ← Guardar como string para consistencia
      idTipoDoc:   doc.U_IdTipoDoc,
      tipoDocName: doc.U_TipDoc,
      ctaExento:   doc.U_CTAEXENTO,
      // Si TASA en config es -1, mantener el valor que tiene el usuario; si no, usar el de la config
      tasa:       Number(doc.U_TASA) === -1 ? this.form.get('tasa')?.value : Number(doc.U_TASA),
      // Si ICE en config es -1, mantener el valor digitado; si no, usar el de la config
      ice:        Number(doc.U_ICE)  === -1 ? this.form.get('ice')?.value  : Number(doc.U_ICE),
    }, { emitEvent: false });

    this.configDocActivo = doc;
    // Si el exento/tasa/ice son variables (-1), activar campos editables
    if (Number(doc.U_EXENTOpercent) === -1) this.exentoActivo = true;
    this._engancharCalculos();
    this._recalcular();
  }

  // ── Motor de cálculo ───────────────────────────────────────────

  /**
   * Cancela la suscripción anterior de valueChanges y crea una nueva
   * sobre los campos que afectan el cálculo de impuestos.
   */
  private _engancharCalculos() {
    // Destruir suscripción previa
    this.calcDestroy$.next();

    const cfg = this.configDocActivo;

    // Campos base que siempre se escuchan
    const campos = ['importe', 'descuento', 'tasa', 'tasaCero', 'giftCard', 'ice'];

    // exento solo se escucha si es variable (-1); si es % fijo lo calcula el motor
    if (Number(cfg?.U_EXENTOpercent) === -1) {
      campos.push('exento');
    }

    campos.forEach(campo => {
      this.form.get(campo)!.valueChanges
        .pipe(takeUntil(this.calcDestroy$))
        .subscribe(() => this._recalcular());
    });
  }

  /**
   * Motor de cálculo principal.
   * Lee la config de REND_CTA (configDocActivo) y los valores del formulario,
   * y actualiza los campos de impuestos en pestaña 3.
   *
   * Grossing Up  (U_TipoCalc = '0'): los impuestos se calculan SOBRE el importe.
   * Para tipos SAP 4 y 10 (Recibo/Alquiler) aplica U_TipoCalc:
   *   GU ('0'): Grossing Up   — empresa asume retenciones, Total = Importe + ImpRet
   *   GD ('1'): Grossing Down — retenciones se descuentan al proveedor, Total = Importe - ImpRet
   * Para tipo SAP 1 (Factura): cálculo normal sobre base imponible, Total = Importe - ImpRet
   * Para otros tipos: sin cálculo de impuestos.
   *
   * Campos con valor -1 en la config → se usa el valor digitado en el formulario.
   * Campos con valor  0 en la config → impuesto no aplica, resultado = 0.
   */
  private _recalcular() {
    const cfg = this.configDocActivo;
    if (!cfg) return;

    const idTipoDoc = Number(cfg.U_IdTipoDoc);
    if (![1, 4, 10].includes(idTipoDoc)) return;

    const r = this.form.getRawValue();
    const resultado = this.calculoSvc.calcular(cfg, {
      importe: r.importe,
      exento: r.exento,
      tasa: r.tasa,
      tasaCero: r.tasaCero,
      giftCard: r.giftCard,
      ice: r.ice,
    });

    if (!resultado) return;

    const icePct = Number(cfg.U_ICE);

    // Guardar valores calculados en propiedades para pasar al componente hijo
    this.montoIVA   = resultado.montoIVA;
    this.montoIT    = resultado.montoIT;
    this.montoIUE   = resultado.montoIUE;
    this.montoRCIVA = resultado.montoRCIVA;
    this.totalImpuestos = resultado.impRet;

    // Actualizar campos calculados sin disparar otro ciclo de valueChanges
    this.form.patchValue({
      montoIVA:   this.montoIVA,
      montoIT:    this.montoIT,
      montoIUE:   this.montoIUE,
      montoRCIVA: this.montoRCIVA,
      impRet: resultado.impRet,
      total: resultado.total,
      // Propagar exento calculado al campo del formulario si viene de %
      ...(Number(cfg.U_EXENTOpercent) > 0 ? { exento: resultado.exento } : {}),
      ...(icePct > 0 ? { ice: resultado.ice } : {}),
      // Propagar cuentas contables desde la config SOLO si el campo está vacío.
      // Si el usuario ya seleccionó una cuenta manualmente, NO se sobreescribe.
      ...(!r.cuentaIVA   && cfg.U_IVAcuenta   ? { cuentaIVA:   cfg.U_IVAcuenta   } : {}),
      ...(!r.cuentaIT    && cfg.U_ITcuenta    ? { cuentaIT:    cfg.U_ITcuenta    } : {}),
      ...(!r.cuentaIUE   && cfg.U_IUEcuenta   ? { cuentaIUE:   cfg.U_IUEcuenta   } : {}),
      ...(!r.cuentaRCIVA && cfg.U_RCIVAcuenta ? { cuentaRCIVA: cfg.U_RCIVAcuenta } : {}),
    }, { emitEvent: false });

    this.cdr.markForCheck();
  }

  onCuentaSelected(cuenta: CuentaDto | null) {
    this.form.patchValue({
      cuenta:       cuenta?.code ?? '',
      nombreCuenta: cuenta?.name ?? '',
    });
  }

  // ── Toggle Facturación en Línea ───────────────────────────────

  toggleFacturaLinea() {
    this.facturaLinea = !this.facturaLinea;
    this.aplicarEstadoCampos();
    this.cdr.markForCheck();
  }

  toggleTasaCero() {
    this.tasaCeroActivo = !this.tasaCeroActivo;
    if (!this.tasaCeroActivo) {
      this.form.patchValue({ tasaCero: 0 }, { emitEvent: true });
    }
    this.cdr.markForCheck();
  }

  toggleDescuento() {
    this.descuentoActivo = !this.descuentoActivo;
    if (!this.descuentoActivo) {
      this.form.patchValue({ descuento: 0 }, { emitEvent: true });
    }
    this.cdr.markForCheck();
  }

  toggleExento() {
    this.exentoActivo = !this.exentoActivo;
    if (!this.exentoActivo) {
      this.form.patchValue({ exento: 0 }, { emitEvent: true });
    }
    this.cdr.markForCheck();
  }

  toggleGiftCard() {
    this.giftCardActivo = !this.giftCardActivo;
    if (!this.giftCardActivo) {
      this.form.patchValue({ giftCard: 0 }, { emitEvent: true });
    }
    this.cdr.markForCheck();
  }

  toggleProyecto() {
    this.proyectoActivo = !this.proyectoActivo;
    if (!this.proyectoActivo) {
      this.form.patchValue({ proyecto: '' }, { emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  private aplicarEstadoCampos() {
    if (this.facturaLinea) {
      // En línea: CUF habilitado, NroAutor y Ctrl deshabilitados
      this.form.get('cuf')?.enable();
      this.form.get('nroAutor')?.disable();
      this.form.get('ctrl')?.disable();
      this.form.patchValue({ nroAutor: '', ctrl: '' });
    } else {
      // Manual: NroAutor y Ctrl habilitados, CUF deshabilitado
      this.form.get('cuf')?.disable();
      this.form.get('nroAutor')?.enable();
      this.form.get('ctrl')?.enable();
      this.form.patchValue({ cuf: '' });
    }
    this.cdr.markForCheck();
  }

  // ── Nuevo Proveedor Eventual ──────────────────────────────────

  abrirNuevoProv() {
    this.nuevoProvNit    = '';
    this.nuevoProvNombre = '';
    this.showNuevoProv   = true;
    this.cdr.markForCheck();
  }

  cerrarNuevoProv() {
    this.showNuevoProv = false;
    this.cdr.markForCheck();
  }

  onProvEventualConfirm(data: { nit: string; nombre: string }): void {
    this.guardarNuevoProv(data.nit, data.nombre);
  }

  guardarNuevoProv(nit?: string, nombre?: string) {
    const provNit = nit || this.nuevoProvNit;
    const provNombre = nombre || this.nuevoProvNombre;
    if (!provNit.trim() || !provNombre.trim()) return;
    this.guardandoProv = true;
    this.provSvc.create(provNit.trim(), provNombre.trim()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (prov: ProvEventual) => {
        this.guardandoProv = false;
        this.showNuevoProv = false;
        // Auto-seleccionar el proveedor recién creado
        this.form.patchValue({ codProv: 'PL999999', prov: prov.U_RAZON_SOCIAL, nit: prov.U_NIT });
        this.proveedorSeleccionado = { cardCode: 'PL999999', cardName: prov.U_RAZON_SOCIAL, licTradNum: prov.U_NIT };
        this.provSearch?.refreshProvEventuales?.();
        this.toast.exito(`Proveedor "${prov.U_RAZON_SOCIAL}" registrado`);
        this.cdr.markForCheck();
      },
      error: (_err: any) => {
        this.guardandoProv = false;
        this.cdr.markForCheck();
      },
    });
  }

  onProveedorSelected(prov: { cardCode: string; cardName: string; licTradNum?: string } | null) {
    this.form.patchValue({
      codProv: prov?.cardCode ?? '',
      prov:    prov?.cardName ?? '',
      nit:     prov?.licTradNum ?? '',
    });
    this.proveedorSeleccionado = prov ?? null;
  }

  onProjectSelected(project: ProjectDto | null) {
    this.form.patchValue({
      proyecto: project?.code ?? '',
    });
  }

  // Alias para compatibilidad con template inline
  onProjectChange(project: ProjectDto | null): void {
    this.onProjectSelected(project);
  }

  onDimensionChange(slot: number, value: string): void {
    const field = 'n' + slot;
    this.form.patchValue({ [field]: value });
  }

  // ── DocFormComponent handlers ───────────────────────────────────
  
  onDocFormSave(data: any): void {
    if (this.isSaving) return;
    this.isSaving = true;

    const payload: CreateRendDPayload = {
      cuenta:       data.cuenta       || undefined,
      nombreCuenta: data.nombreCuenta || undefined,
      concepto:     data.concepto,
      fecha:        data.fecha,
      idTipoDoc:    Number(data.idTipoDoc),
      tipoDoc:      data.tipoDoc,  // Código del tipo de documento (string)
      tipoDocName:  data.tipoDocName,
      numDocumento: data.numDocumento  || undefined,
      nroAutor:     data.nroAutor      || undefined,
      cuf:          data.cuf           || undefined,
      ctrl:         data.ctrl          || undefined,
      prov:         data.prov          || undefined,
      codProv:      data.codProv       || undefined,
      nit:          data.nit           || '0',
      importe:      Number(data.importe),
      descuento:    Number(data.descuento),
      exento:       Number(data.exento),
      tasa:         Number(data.tasa),
      giftCard:     Number(data.giftCard),
      tasaCero:     Number(data.tasaCero),
      ice:          Number(data.ice),
      proyecto:     data.proyecto      || undefined,
      n1:           data.n1            || undefined,
      n2:           data.n2            || undefined,
      n3:           data.n3            || undefined,
      montoIVA:     Number(data.montoIVA),
      montoIT:      Number(data.montoIT),
      montoIUE:     Number(data.montoIUE),
      montoRCIVA:   Number(data.montoRCIVA),
      impRet:       Number(data.impRet),
      total:        Number(data.total),
      cuentaIVA:    data.cuentaIVA    || undefined,
      cuentaIT:     data.cuentaIT     || undefined,
      cuentaIUE:    data.cuentaIUE    || undefined,
      cuentaRCIVA:  data.cuentaRCIVA  || undefined,
      ctaExento:    data.ctaExento || '',
    };

    const obs = this.editingDoc
      ? this.rendDSvc.update(this.idRendicion, this.editingDoc.U_RD_IdRD, payload)
      : this.rendDSvc.create(this.idRendicion, payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.exito(this.editingDoc ? 'Documento actualizado' : 'Documento creado');
        this.closeForm();
        this.loadDocs();
        this.isSaving = false;
      },
      error: (err) => {
        const msg = err?.error?.message || err.message || 'Error desconocido';
        this.toast.error('No se pudo guardar: ' + msg);
        this.isSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Modal ───────────────────────────────────────────────────────

  openNew() {
    this.showModeSelector = true;
    this.cdr.markForCheck();
  }

  // ── Selector de modo ─────────────────────────────────────────

  closeModeSelector() {
    this.showModeSelector = false;
    this.cdr.markForCheck();
  }

  onModeSelect(mode: string): void {
    switch (mode) {
      case 'qr':
        this.elegirQR();
        break;
      case 'manual':
        this.elegirManual();
        break;
      case 'url':
        this.elegirUrl();
        break;
      case 'pdf':
        this.elegirPdf();
        break;
    }
  }

  elegirManual() {
    this.showModeSelector = false;
    this._openNewForm();
    this.cdr.markForCheck();
  }

  elegirQR() {
    this.showModeSelector = false;
    this.abrirQrScanner();
    this.cdr.markForCheck();
  }

  elegirUrl() {
    this.showModeSelector = false;
    this.urlInput = '';
    this.showUrlModal = true;
    this.cdr.markForCheck();
  }

  closeUrlModal() {
    this.showUrlModal      = false;
    this.urlInput          = '';
    this.urlLoadingFactura = false;
    this.urlError          = null;
    this.cdr.markForCheck();
  }

  onUrlConfirm(url: string): void {
    this.urlInput = url;
    this.confirmarUrl();
  }

  confirmarUrl() {
    const url = this.urlInput.trim();
    if (!url) return;

    this.urlLoadingFactura = true;
    this.urlError = null;
    this.cdr.markForCheck();

    this.scanSvc.procesarUrlSiat(url).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.urlLoadingFactura = false;
        if (result.success && result.factura) {
          this.showUrlModal = false;
          this.urlInput = '';
          // Mostrar preview para edición antes de crear
          this._showFacturaPreview({
            success: true,
            source: 'siat',
            data: result.factura,
            confidence: 1.0,
            warnings: []
          });
        } else {
          this.urlError = result.error ?? 'Error al procesar la URL';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.urlLoadingFactura = false;
        this.urlError = 'Error de conexión. Intentá de nuevo.';
        this.cdr.markForCheck();
      }
    });
  }

  elegirPdf() {
    this.showModeSelector = false;
    this.pdfFiles = [];
    this.pdfFileNames = '';
    this.showPdfModal = true;
    this.cdr.markForCheck();
  }

  closePdfModal() {
    this.showPdfModal     = false;
    this.pdfFiles         = [];
    this.pdfFileNames     = '';
    this.pdfLoadingFactura = false;
    this.pdfError         = null;
    this.cdr.markForCheck();
  }

  onPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.pdfFiles = files;
    this.pdfFileNames = files.map(f => f.name).join(', ');
    this.cdr.markForCheck();
  }

  async confirmarPdf() {
    if (this.pdfFiles.length === 0) return;

    // Si es un solo PDF, usar flujo de preview en lugar de batch
    if (this.pdfFiles.length === 1) {
      await this._procesarPdfSingle(this.pdfFiles[0]);
      return;
    }

    // Flujo batch para múltiples PDFs
    this.pdfBatchProcessing = true;
    this.pdfError = null;
    this.cdr.markForCheck();

    // Inicializar items usando el servicio
    this.pdfBatchResults = this.scanSvc.inicializarBatch(this.pdfFiles);

    // Procesar cada PDF secuencialmente
    for (let i = 0; i < this.pdfBatchResults.length; i++) {
      this.currentProcessingIndex = i;
      const item = this.pdfBatchResults[i];
      
      await this.scanSvc.procesarPdfItem(
        item,
        (progress) => {
          item.progress = progress;
          this.cdr.markForCheck();
        }
      );
      
      this.cdr.markForCheck();
    }

    this.pdfBatchProcessing = false;
    this.currentProcessingIndex = -1;
    
    // Mostrar modal con resultados batch
    this.showPdfModal = false;
    this.showPdfBatchModal = true;
    this.cdr.markForCheck();
  }

  /** Procesa un único PDF mostrando el preview para edición */
  private async _procesarPdfSingle(file: File): Promise<void> {
    this.pdfBatchProcessing = true;
    this.pdfError = null;
    this.cdr.markForCheck();

    // Procesar el PDF con el servicio de factura
    this.facturaSvc.processFacturaPdf(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.pdfBatchProcessing = false;
        this.showPdfModal = false;
        this.pdfFiles = [];
        this.pdfFileNames = '';
        
        if (result.success && result.data) {
          // Mostrar preview para edición
          this._showFacturaPreview(result);
        } else {
          // Mostrar preview con error para entrada manual
          this._showFacturaPreview({
            success: false,
            source: 'manual',
            error: result.error ?? 'No se pudieron extraer los datos del PDF',
            requiresManualEntry: true
          });
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.pdfBatchProcessing = false;
        this.showPdfModal = false;
        this.pdfFiles = [];
        this.pdfFileNames = '';
        
        // Mostrar preview con error para entrada manual
        this._showFacturaPreview({
          success: false,
          source: 'manual',
          error: err?.error?.message ?? 'Error al procesar el PDF',
          requiresManualEntry: true
        });
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Maneja la confirmación del modal de preview IA (single)
   * Crea el documento directamente con cálculo automático de impuestos
   */
  async onAiPreviewConfirm(data: any) {
    // Mapear datos del modal al formato de factura
    const factura: FacturaSiat = {
      cuf: data.cuf || '',
      nit: data.nit || '',
      invoiceNumber: data.numeroFactura || '',
      companyName: data.razonSocial || '',
      clientName: '',
      clientDoc: '',
      status: 'VALIDA',
      datetime: data.fecha || null,
      total: data.monto || 0,
      concepto: data.concepto || ''  // ✅ INCLUIR CONCEPTO DEL USUARIO
    };

    this.showAiPreviewModal = false;
    this.aiPreviewResult = null;
    this.pdfFiles = [];
    this.pdfFileNames = '';

    // Crear documento directamente
    try {
      await this._crearDocumentoDesdeFactura(factura);
      this.toast.exito('Documento creado exitosamente');
      this.loadDocs();
    } catch {
      // Si falla, abrir el formulario manual con los datos prellenados
      this.toast.warning('No se pudo crear automáticamente. Complete los datos manualmente.');
      this._prefillFromFactura(factura);
    }
  }

  /**
   * Cancela el modal de preview IA (single)
   */
  onAiPreviewCancel() {
    this.showAiPreviewModal = false;
    this.aiPreviewResult = null;
  }

  /**
   * Elimina un archivo PDF de la lista de selección
   */
  removePdfFile(index: number): void {
    this.pdfFiles.splice(index, 1);
    this.pdfFileNames = this.pdfFiles.map(f => f.name).join(', ');
    this.cdr.markForCheck();
  }

  /**
   * Reintenta procesar un item que falló
   */
  async retryPdfItem(item: any): Promise<void> {
    // Encontrar el índice del item en los resultados
    const index = this.pdfBatchResults.findIndex(r => 
      r.file.name === item.file.name
    );
    if (index === -1) return;
    
    // Marcar como procesando
    this.pdfBatchResults[index].status = 'processing';
    this.cdr.markForCheck();
    
    try {
      // Reprocesar el archivo
      const file = item.file;
      if (!file) {
        throw new Error('Archivo no encontrado');
      }
      
      const result = await this.facturaSvc.processFacturaPdf(file).toPromise();
      
      if (result?.success && result.data) {
        // Crear el documento automáticamente
        await this._crearDocumentoBatch(result.data, index);
        this.pdfBatchResults[index].status = 'completed';
      } else {
        this.pdfBatchResults[index].status = 'error';
        this.pdfBatchResults[index].error = result?.error ?? 'No se pudieron extraer los datos';
      }
    } catch (err: any) {
      this.pdfBatchResults[index].status = 'error';
      this.pdfBatchResults[index].error = err?.message ?? 'Error al procesar';
    }
    
    this.cdr.markForCheck();
  }

  /**
   * Muestra los detalles de un item procesado exitosamente
   */
  viewPdfItem(item: any): void {
    // Buscar el documento creado y mostrarlo en modo edición
    const docEntry = item.docEntry;
    if (docEntry) {
      const doc = this.documentos.find(d => d.U_RD_IdRD === docEntry);
      if (doc) {
        this.openEdit(doc);
      }
    }
  }

  // ══ MÉTODOS BATCH DE PDFs ══

  closePdfBatchModal() {
    this.showPdfBatchModal = false;
    this.pdfBatchResults = [];
    this.pdfFiles = [];
    this.pdfFileNames = '';
    this.cdr.markForCheck();
  }

  /**
   * Abre el modal de revisión para un item específico del batch
   */
  revisarBatchItem(item: PdfBatchItem, index: number) {
    this.batchItemBeingReviewed = item;
    this.batchItemReviewIndex = index;
    this.showBatchItemReviewModal = true;
    this.cdr.markForCheck();
  }

  closeBatchItemReviewModal() {
    this.showBatchItemReviewModal = false;
    this.batchItemBeingReviewed = null;
    this.batchItemReviewIndex = -1;
    this.cdr.markForCheck();
  }

  /**
   * Maneja la confirmación de un item individual del batch
   * Crea el documento inmediatamente con los datos editados
   */
  async onBatchItemConfirm(data: any) {
    if (this.batchItemBeingReviewed && this.batchItemBeingReviewed.result?.success) {
      // Crear el documento directamente con los datos editados
      const factura: FacturaSiat = {
        cuf: data.cuf || this.batchItemBeingReviewed.cuf || '',
        nit: data.nit || '',
        invoiceNumber: data.numeroFactura || '',
        companyName: data.razonSocial || '',
        clientName: '',
        clientDoc: '',
        status: 'VALIDA',
        datetime: data.fecha || null,
        total: data.monto || 0,
        concepto: data.concepto || ''  // ✅ INCLUIR CONCEPTO DEL USUARIO
      };

      try {
        await this._crearDocumentoDesdeFactura(factura);
        this.toast.exito('Documento creado exitosamente');
        // Eliminar el item del batch
        this.eliminarBatchItem(this.batchItemReviewIndex);
        this.loadDocs();
        
        // ✅ CERRAR MODAL BATCH SI NO QUEDAN ITEMS
        const completadosRestantes = this.pdfBatchResults.filter(i => i.status === 'completed').length;
        if (completadosRestantes === 0) {
          this.closePdfBatchModal();
        }
      } catch (err: any) {
        this.toast.error('Error al crear documento: ' + (err?.error?.message || err?.message || 'Error desconocido'));
      }
    }
    this.closeBatchItemReviewModal();
  }

  /**
   * Elimina un item del batch
   */
  eliminarBatchItem(index: number) {
    this.pdfBatchResults.splice(index, 1);
    
    // ✅ CERRAR MODAL BATCH SI NO QUEDAN ITEMS
    if (this.pdfBatchResults.length === 0) {
      this.closePdfBatchModal();
    }
    
    this.cdr.markForCheck();
  }

  /**
   * Reprocesa un item del batch
   */
  async reprocesarBatchItem(index: number) {
    const item = this.pdfBatchResults[index];
    await this.scanSvc.reprocesarItem(item);
    this.cdr.markForCheck();
  }

  /**
   * Confirma todos los items completados del batch y crea los documentos
   */
  async confirmarBatch() {
    const completados = this.pdfBatchResults.filter(i => i.status === 'completed' && i.result?.success);
    
    if (completados.length === 0) {
      this.toast.warning('No hay facturas válidas para confirmar');
      return;
    }

    let creados = 0;
    let errores = 0;
    
    for (const item of completados) {
      const data = item.result!.data!;
      const factura: FacturaSiat = {
        cuf: (data as any).cuf || item.cuf || '',
        nit: (data as any).nit || '',
        invoiceNumber: (data as any).numeroFactura || (data as any).invoiceNumber || '',
        companyName: (data as any).razonSocial || (data as any).companyName || '',
        clientName: '',
        clientDoc: '',
        status: 'VALIDA',
        datetime: (data as any).fecha || (data as any).datetime || null,
        total: (data as any).monto || (data as any).total || 0
      };

      // Crear el documento
      try {
        await this._crearDocumentoDesdeFactura(factura);
        creados++;
      } catch (err) {
        console.error('Error creando documento:', err);
        errores++;
      }
    }

    if (creados > 0) {
      this.toast.exito(`${creados} documento(s) creado(s) exitosamente`);
    }
    if (errores > 0) {
      this.toast.error(`${errores} documento(s) con error`);
    }
    
    this.closePdfBatchModal();
    this.loadDocs();
  }

  /**
   * Crea un documento REND_D desde datos de factura
   */
  private async _crearDocumentoDesdeFactura(factura: FacturaSiat): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.tiposDocs || this.tiposDocs.length === 0) {
        reject(new Error('No hay tipos de documento configurados.'));
        return;
      }
      
      const config = this.tiposDocs[0];
      if (!config?.U_IdDocumento) {
        reject(new Error('El tipo de documento no tiene configuración válida.'));
        return;
      }
      
      const payload = this.scanSvc.crearPayloadDesdeFactura(factura, config, {
        fijarNr: this.auth.fijarNr,
        nr1: this.auth.nr1,
        nr2: this.auth.nr2,
        nr3: this.auth.nr3
      });
      
      if (!payload) {
        reject(new Error('Error al crear payload del documento'));
        return;
      }

      this.rendDSvc.create(this.idRendicion, payload as any).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => resolve(),
        error: (err) => reject(err)
      });
    });
  }

  /**
   * Crea un documento desde datos de factura en el contexto de batch
   * Similar a _crearDocumentoDesdeFactura pero actualiza el resultado del batch
   */
  private async _crearDocumentoBatch(data: any, _batchIndex: number): Promise<void> {
    const factura: FacturaSiat = {
      cuf: data.cuf || '',
      nit: data.nit || '',
      invoiceNumber: data.numeroFactura || '',
      companyName: data.razonSocial || '',
      clientName: '',
      clientDoc: '',
      status: 'VALIDA',
      datetime: data.fecha || null,
      total: data.monto || 0,
      concepto: data.concepto || ''
    };

    await this._crearDocumentoDesdeFactura(factura);
  }

  /**
   * Obtiene el conteo de items por estado
   */
  get batchStats() {
    return this.scanSvc.calcularBatchStats(this.pdfBatchResults);
  }

  /**
   * Calcula el progreso porcentual del procesamiento batch
   */
  get batchProgress(): number {
    if (this.pdfFiles.length === 0) return 0;
    if (this.currentProcessingIndex < 0) return 0;
    return Math.round(((this.currentProcessingIndex + 1) / this.pdfFiles.length) * 100);
  }

  // ══ Helpers para templates (delegados al servicio) ══

  getItemNit(item: PdfBatchItem): string { return this.scanSvc.getItemNit(item); }
  getItemRazonSocial(item: PdfBatchItem): string { return this.scanSvc.getItemRazonSocial(item); }
  getItemNumeroFactura(item: PdfBatchItem): string { return this.scanSvc.getItemNumeroFactura(item); }
  getItemFecha(item: PdfBatchItem): string { return this.scanSvc.getItemFecha(item); }
  getItemMonto(item: PdfBatchItem): number { return this.scanSvc.getItemMonto(item); }
  getItemCuf(item: PdfBatchItem): string { return this.scanSvc.getItemCuf(item); }

  private _openNewForm() {
    this.editingDoc    = null;
    this.initialValues = null;
    this.activeTab     = 'doc';
    this.facturaLinea   = true;
    this.tasaCeroActivo  = false;
    this.descuentoActivo = false;
    this.giftCardActivo  = false;
    this.proyectoActivo  = false;
    this.exentoActivo    = false;
    this.proveedorSeleccionado = null;
    const primer = this.tiposDocs[0];
    this.form.reset({
      cuenta: '', fecha: this.hoy, tipoDoc: String(primer?.U_IdDocumento || ''),
      tipoDocName: primer?.U_TipDoc ?? '',
      idTipoDoc: primer?.U_IdTipoDoc ?? 1,
      numDocumento: '', nroAutor: '', cuf: '', ctrl: '',
      prov: '', codProv: '', concepto: '',
      importe: 0, descuento: 0, exento: 0,
      tasa: Number(primer?.U_TASA) === -1 ? 0 : Number(primer?.U_TASA),
      giftCard: 0, tasaCero: 0,
      ice: Number(primer?.U_ICE) === -1 ? 0 : 0, // valor real lo calcula _recalcular
      proyecto: '', n1: '', n2: '', n3: '',
      nit: '0', montoIVA: 0, montoIT: 0, montoIUE: 0, montoRCIVA: 0,
      impRet: 0, total: 0,
      ctaExento: primer?.U_CTAEXENTO ?? '',
    });
    // Enganchar motor de cálculo con el primer tipo de doc disponible
    this.configDocActivo = primer ?? null;
    if (primer) {
      this._engancharCalculos();
      this._recalcular();
    }
    // Pre-cargar normas de reparto desde la configuración del usuario
    this._aplicarNormasPreconfiguradas();
    this.showForm = true;
    this.aplicarEstadoCampos();
    this.cdr.markForCheck();
  }

  /**
   * Aplica las normas de reparto preconfiguradas del usuario al formulario.
   * Se llama al crear un nuevo documento y después de cargar las dimensiones.
   */
  private _aplicarNormasPreconfiguradas(): void {
    if (!this.auth.fijarNr) return;

    const nr1 = this.auth.nr1?.trim() ?? '';
    const nr2 = this.auth.nr2?.trim() ?? '';
    const nr3 = this.auth.nr3?.trim() ?? '';

    // Solo aplicar si hay valores configurados
    const patch: any = {};
    if (nr1) patch.n1 = nr1;
    if (nr2) patch.n2 = nr2;
    if (nr3) patch.n3 = nr3;

    if (Object.keys(patch).length > 0) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  // ── Escáner QR ────────────────────────────────────────────────

  abrirQrScanner() {
    this.qrError          = null;
    this.qrLoadingFactura = false;
    this.showQrScanner    = true;
    this.cdr.markForCheck();
  }

  /** Handler cuando el modal escanea un QR exitosamente */
  onQrScanned(url: string) {
    this.onQrCaptured(url);
  }

  // ── Exportar / Importar ──────────────────────────────────────

  async exportarExcel() {
    const idRendicion = this.cabecera?.U_IdRendicion ?? 0;
    const { blob, filename } = await this.excelSvc.exportarDocumentos(
      this.documentos,
      (id) => this.getTipoDocName(id),
      idRendicion
    );
    this.excelSvc.descargarArchivo(blob, filename);
    this.toast.exito(`Exportado: ${filename}`);
  }

  async descargarFormato() {
    const { blob, filename } = await this.excelSvc.descargarFormato();
    this.excelSvc.descargarArchivo(blob, filename);
    this.toast.exito('Formato descargado');
  }

  async onImportarFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.procesarImportarFile(file);
    input.value = '';
  }

  async onImportarFileDirecto(file: File) {
    await this.procesarImportarFile(file);
  }

  private async procesarImportarFile(file: File) {
    this.importando = true;
    this.importError = null;
    this.cdr.markForCheck();

    const result = await this.excelSvc.parsearArchivo(file);

    if (!result.success) {
      this.importError = result.error ?? 'Error al procesar archivo';
      this.importando = false;
      this.cdr.markForCheck();
      return;
    }

    // Importar secuencialmente
    const primerTipo = this.tiposDocs[0];
    this._importarFilas(result.rows, 0, 0, primerTipo);
  }

  private _importarFilas(rows: CreateRendDPayload[], idx: number, ok: number, tipoDoc: any) {
    if (idx >= rows.length) {
      this.importando = false;
      this.toast.exito(`${ok} documento${ok !== 1 ? 's' : ''} importado${ok !== 1 ? 's' : ''} correctamente`);
      this.loadDocs();
      return;
    }

    const payload = {
      ...rows[idx],
      idRendicion: this.idRendicion,
      tipoDoc: tipoDoc?.U_IdDocumento ?? rows[idx].tipoDoc ?? '',
      tipoDocName: tipoDoc?.U_TipDoc ?? rows[idx].tipoDocName ?? '',
      idTipoDoc: tipoDoc?.U_IdTipoDoc ?? 1,
    };

    this.rendDSvc.create(this.idRendicion, payload as any).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this._importarFilas(rows, idx + 1, ok + 1, tipoDoc),
      error: (err: any) => {
        this.importError = `Error en fila ${idx + 1}: ${err?.error?.message ?? 'error desconocido'}`;
        this.importando = false;
        this.loadDocs();
        this.cdr.markForCheck();
      },
    });
  }

  cerrarQrScanner() {
    this.qrError          = null;
    this.qrLoadingFactura = false;
    this.showQrScanner    = false;
    this.cdr.markForCheck();
  }

  /** Reinicia el escáner QR después de un error */
  reiniciarQrScanner(): void {
    this.qrError = null;
    this.cdr.markForCheck();
  }

  private buscarProveedorEnLista(nit: string): { cardCode: string; cardName: string; licTradNum?: string } | null {
    if (!nit || !this.provSearch) return null;
    const q = nit.toLowerCase().trim();
    const found = this.provSearch.allItems.find(
      (p: any) => p.licTradNum && p.licTradNum.toLowerCase().trim() === q,
    );
    return found ?? null;
  }

  onQrCaptured(url: string) {
    // El modal ya pausó el scanner, solo mostramos el loader
    this.qrLoadingFactura = true;
    this.qrError          = null;
    this.cdr.markForCheck();

    this.facturaSvc.getFromSiat(url).pipe(takeUntil(this.destroy$)).subscribe({
      next: (factura) => {
        this.cerrarQrScanner();
        // Mostrar preview para edición antes de crear
        this._showFacturaPreview({
          success: true,
          source: 'siat',
          data: factura,
          confidence: 1.0,
          warnings: []
        });
      },
      error: (err) => {
        this.qrLoadingFactura = false;
        this.qrError = err?.error?.message
          ?? 'No se pudo obtener la factura del SIAT. Verificá la conexión o intentá con URL manual.';
        this.cdr.markForCheck();
      },
    });
  }

  /** Muestra el modal de preview para editar datos de la factura */
  private _showFacturaPreview(result: import('@services/factura.service').FacturaResult): void {
    this.aiPreviewResult = result;
    this.showAiPreviewModal = true;
    this.cdr.markForCheck();
  }

  /** Pre-llena el formulario con los datos obtenidos del SIAT */
  private _prefillFromFactura(factura: FacturaSiat) {
    this._openNewForm();

    // Parsear fecha del SIAT
    let fecha = this.hoy;
    if (factura.datetime) {
      try { fecha = factura.datetime.substring(0, 10); } catch { /* mantener hoy */ }
    }

    // ✅ USAR CONCEPTO DEL USUARIO si existe, sino generar uno genérico
    const conceptoUsuario = (factura as any).concepto?.trim();
    const concepto = conceptoUsuario 
      ? conceptoUsuario 
      : `Compra según factura N° ${factura.invoiceNumber}`;

    // Patchear campos básicos
    this.form.patchValue({
      nit:          factura.nit,
      prov:         factura.companyName,
      numDocumento: factura.invoiceNumber,
      cuf:          factura.cuf,
      fecha,
      importe:      factura.total,
      concepto:     concepto.substring(0, 250),
    });
    
    // La sugerencia IA ahora se gestiona dentro de DocFormComponent

    // Buscar o crear proveedor: primero en la lista maestra, luego en REND_PROV
    if (factura.nit && factura.companyName) {
      const existente = this.buscarProveedorEnLista(factura.nit);
      if (existente) {
        this.proveedorSeleccionado = existente;
        this.form.patchValue({
          prov:    existente.cardName,
          codProv: existente.cardCode,
          nit:     factura.nit,
        });
        this.cdr.markForCheck();
      } else {
        this.provSvc.findOrCreate(factura.nit, factura.companyName).pipe(takeUntil(this.destroy$)).subscribe({
          next: (prov) => {
            const cardName = (prov as any).U_RAZON_SOCIAL ?? factura.companyName;
            this.proveedorSeleccionado = { cardCode: 'PL999999', cardName, licTradNum: factura.nit };
            this.form.patchValue({
              prov:    cardName,
              codProv: 'PL999999',
              nit:     factura.nit,
            });
            this.provSearch?.refreshProvEventuales?.();
            this.cdr.markForCheck();
          },
          error: () => {
            // Si falla, al menos mostrar los datos del QR
            this.proveedorSeleccionado = {
              cardCode: 'PL999999',
              cardName: factura.companyName,
              licTradNum: factura.nit,
            };
            this.form.patchValue({ nit: factura.nit });
            this.cdr.markForCheck();
          },
        });
      }
    }

    this.cdr.markForCheck();
    this.toast.exito(`Factura N° ${factura.invoiceNumber} cargada — completá cuenta y otros datos`);
  }

  openEdit(d: RendD) {
    this.editingDoc = d;
    this.activeTab  = 'doc';
    // Si tiene CUF → factura en línea, si tiene NroAutor/Ctrl → manual
    this.facturaLinea    = !!d.U_CUF && !d.U_RD_NroAutor;
    // Activar toggles según los valores guardados del registro
    this.tasaCeroActivo  = Number(d.U_RD_TasaCero  ?? 0) !== 0;
    this.descuentoActivo = Number(d.U_RD_Descuento ?? 0) !== 0;
    this.giftCardActivo  = Number(d.U_GIFTCARD     ?? 0) !== 0;
    this.proyectoActivo  = !!(d.U_RD_Proyecto ?? '').trim();
    this.exentoActivo    = Number(d.U_RD_Exento ?? 0) !== 0;
    this.proveedorSeleccionado = d.U_RD_CodProv
      ? { cardCode: d.U_RD_CodProv, cardName: d.U_RD_Prov ?? '', licTradNum: d.U_RD_NIT }
      : (d.U_RD_Prov ? { cardCode: d.U_RD_NIT || '', cardName: d.U_RD_Prov, licTradNum: d.U_RD_NIT } : null);
    
    // Buscar el nombre del tipo de documento correctamente
    const tipoDocConfig = this.tiposDocs.find(td => String(td.U_IdDocumento) === String(d.U_RD_TipoDoc));
    const tipoDocName = tipoDocConfig?.U_TipDoc || d.U_RD_TipoDoc || '';
    
    const values = {
      cuenta:       d.U_RD_Cuenta        ?? '',
      nombreCuenta: d.U_RD_NombreCuenta  ?? '',
      fecha:        d.U_RD_Fecha?.substring(0, 10) ?? '',
      tipoDoc:      String(d.U_RD_TipoDoc),
      tipoDocName:  tipoDocName,
      idTipoDoc:    d.U_RD_IdTipoDoc,
      numDocumento: d.U_RD_NumDocumento  ?? '',
      nroAutor:     d.U_RD_NroAutor      ?? '',
      cuf:          d.U_CUF              ?? '',
      ctrl:         d.U_RD_Ctrl          ?? '',
      prov:         d.U_RD_Prov          ?? '',
      codProv:      d.U_RD_CodProv       ?? '',
      concepto:     d.U_RD_Concepto,
      importe:      d.U_RD_Importe,
      descuento:    d.U_RD_Descuento,
      exento:       d.U_RD_Exento        ?? 0,
      tasa:         d.U_TASA             ?? 1,
      giftCard:     d.U_GIFTCARD         ?? 0,
      tasaCero:     d.U_RD_TasaCero      ?? 0,
      ice:          d.U_ICE,
      proyecto:     d.U_RD_Proyecto      ?? '',
      n1:           d.U_RD_N1 || (this.auth.fijarNr ? this.auth.nr1 : '') ,
      n2:           d.U_RD_N2 || (this.auth.fijarNr ? this.auth.nr2 : ''),
      n3:           d.U_RD_N3 || (this.auth.fijarNr ? this.auth.nr3 : ''),
      nit:          d.U_RD_NIT,
      montoIVA:     d.U_MontoIVA,
      montoIT:      d.U_MontoIT,
      montoIUE:     d.U_MontoIUE,
      montoRCIVA:   d.U_MontoRCIVA,
      impRet:       d.U_RD_ImpRet   ?? 0,
      total:        d.U_RD_Total    ?? 0,
      ctaExento:    d.U_CTAEXENTO,
      // Cuentas contables de impuestos — se preservan del registro guardado
      cuentaIVA:   d.U_CuentaIVA   ?? '',
      cuentaIT:    d.U_CuentaIT    ?? '',
      cuentaIUE:   d.U_CuentaIUE   ?? '',
      cuentaRCIVA: d.U_CuentaRCIVA ?? '',
    };
    this.initialValues = { ...values };
    // Enganchar motor con la config del tipo de doc del registro que se edita
    this.configDocActivo = this.tiposDocs.find(td => String(td.U_IdDocumento) === values.tipoDoc) ?? null;
    // Si exento es variable (-1), siempre mostrar el campo editable
    if (Number(this.configDocActivo?.U_EXENTOpercent) === -1) {
      this.exentoActivo = true;
    }
    if (this.configDocActivo) {
      this._engancharCalculos();
      // Si el exento es % fijo, preservar el valor guardado en la primera carga
      this._preservarExento = Number(this.configDocActivo.U_EXENTOpercent) > 0;
    }
    // Asignar valores ANTES de mostrar el formulario (síncrono)
    this.form.patchValue(values, { emitEvent: false });
    if (this.configDocActivo) {
      this._recalcular();
      this._preservarExento = false;
    }
    this.aplicarEstadoCampos();
    this.showForm = true;
    // Con Default change detection, los valores se reflejan automáticamente
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showQrScanner)   { this.cerrarQrScanner();  return; }
    if (this.showModeSelector){ this.closeModeSelector(); return; }
    if (this.showNuevoProv)   { this.cerrarNuevoProv();  return; }
    if (this.showForm)        { this.closeForm();         return; }
  }

  closeForm() {
    this.calcDestroy$.next();          // desuscribir valueChanges del motor
    this.configDocActivo = null;
    this.showForm      = false;
    this.editingDoc    = null;
    this.initialValues = null;
    this.activeTab     = 'doc';
    this.form.reset();
    this.cdr.markForCheck();
  }

  setTab(tab: string) {
    this.activeTab = tab as 'doc' | 'montos' | 'impuestos';
    this.cdr.markForCheck();
  }

  prevTab() {
    if (this.activeTab === 'impuestos') this.activeTab = 'montos';
    else if (this.activeTab === 'montos') this.activeTab = 'doc';
    this.cdr.markForCheck();
  }

  nextTab() {
    if (this.activeTab === 'doc') this.activeTab = 'montos';
    else if (this.activeTab === 'montos') this.activeTab = 'impuestos';
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const r = this.form.getRawValue();

    const payload: CreateRendDPayload = {
      cuenta:       r.cuenta       || undefined,
      nombreCuenta: r.nombreCuenta || undefined,
      concepto:     r.concepto,
      fecha:        r.fecha,
      idTipoDoc:    Number(r.idTipoDoc),
      tipoDoc:      Number(r.tipoDoc),
      tipoDocName:  r.tipoDocName,
      numDocumento: r.numDocumento  || undefined,
      nroAutor:     r.nroAutor      || undefined,
      cuf:          r.cuf           || undefined,
      ctrl:         r.ctrl          || undefined,
      prov:         r.prov          || undefined,
      codProv:      r.codProv       || undefined,
      nit:          r.nit           || '0',
      importe:      Number(r.importe),
      descuento:    Number(r.descuento),
      exento:       Number(r.exento),
      tasa:         Number(r.tasa),
      giftCard:     Number(r.giftCard),
      tasaCero:     Number(r.tasaCero),
      ice:          Number(r.ice),
      proyecto:     r.proyecto      || undefined,
      n1:           r.n1            || undefined,
      n2:           r.n2            || undefined,
      n3:           r.n3            || undefined,
      montoIVA:     Number(r.montoIVA),
      montoIT:      Number(r.montoIT),
      montoIUE:     Number(r.montoIUE),
      montoRCIVA:   Number(r.montoRCIVA),
      impRet:       Number(r.impRet),
      total:        Number(r.total),
      cuentaIVA:    r.cuentaIVA    || undefined,
      cuentaIT:     r.cuentaIT     || undefined,
      cuentaIUE:    r.cuentaIUE    || undefined,
      cuentaRCIVA:  r.cuentaRCIVA  || undefined,
      ctaExento:    r.ctaExento || '',
    };

    const obs = this.editingDoc
      ? this.rendDSvc.update(this.idRendicion, this.editingDoc.U_RD_IdRD, payload)
      : this.rendDSvc.create(this.idRendicion, payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        const msg = this.editingDoc ? 'Documento actualizado' : 'Documento agregado';
        // Primero recargar los datos, luego cerrar el formulario
        this.loadDocs(() => {
          this.toast.exito(msg);
          this.closeForm();
        });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        // Manejar errores de validación de datos maestros (422)
        if (err?.status === 422 && err?.error?.errors) {
          const errores = err.error.errors;
          const mensaje = Array.isArray(errores) 
            ? 'Datos maestros inválidos:\n' + errores.join('\n')
            : 'Datos maestros inválidos: ' + errores;
          this.toast.error(mensaje);
        } else if (err?.error?.message) {
          this.toast.error(err.error.message);
        } else {
          this.toast.error('Error al guardar el documento');
        }
        this.cdr.markForCheck();
      },
    });
  }

  // ── Eliminar ────────────────────────────────────────────────────

  confirmDelete(d: RendD) {
    this.confirmDialogService.ask({
      title: '¿Eliminar documento?',
      message: `Se eliminará el documento N° ${d.U_RD_IdRD} — "${d.U_RD_Concepto}".`,
      confirmLabel: 'Sí, eliminar', type: 'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.rendDSvc.remove(this.idRendicion, d.U_RD_IdRD).pipe(takeUntil(this.destroy$)).subscribe({
        next:  () => {
          this.toast.exito('Documento eliminado');
          this.loadDocs();
          this.cdr.markForCheck();
        },
        error: (err: any) => { 
          this.toast.error(err?.error?.message || 'Error al eliminar el documento'); 
          this.cdr.markForCheck(); 
        },
      });
    });
  }

  // ── Paginación ──────────────────────────────────────────────────

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.documentos.length / this.limit));
    const start = (this.page - 1) * this.limit;
    // Crear nueva referencia explícita para OnPush (spread + slice)
    this.paged  = [...this.documentos.slice(start, start + this.limit)];
    // Recargar contadores de adjuntos para la nueva página
    setTimeout(() => this.cargarContadoresAdjuntos(), 0);
    this.cdr.markForCheck();
  }
  onPageChange(p: number)  { this.page = p;  this.updatePaging(); this.cdr.markForCheck(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); this.cdr.markForCheck(); }

  // ── Dialog ──────────────────────────────────────────────────────

  goBack() {
    // Guardar el perfil activo en sessionStorage para que rend-m
    // lo recupere sin depender de inyección de servicios ni query params
    const idPerfil = this.cabecera?.U_IdPerfil;
    if (idPerfil) {
      sessionStorage.setItem('rendiciones_perfil_activo', String(idPerfil));
    }
    this.router.navigate(['/rend-m']);
  }
}
