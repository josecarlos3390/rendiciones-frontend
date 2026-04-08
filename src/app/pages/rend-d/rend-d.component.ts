import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, switchMap, Subject, takeUntil, catchError, of } from 'rxjs';

import { RendDService }       from './rend-d.service';
import { RendMService }       from '../rend-m/rend-m.service';
import { PerfilesService }    from '../perfiles/perfiles.service';
import { DocumentosService }  from '../documentos/documentos.service';
import { CuentasListaService } from '../cuentas-lista/cuentas-lista.service';
import { SapService, DimensionWithRules, CuentaDto } from '../../services/sap.service';
import { ToastService }       from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent }   from '../../shared/paginator/paginator.component';
import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';
import { CuentaSearchComponent } from '../../shared/cuenta-search/cuenta-search.component';
import { ProveedorSearchComponent } from '../../shared/proveedor-search/proveedor-search.component';
import { ProjectSearchComponent, ProjectDto } from '../../shared/project-search/project-search.component';
import { ProvService, ProvEventual } from '../../services/prov.service';
import { AdjuntosService } from '../../services/adjuntos.service';
import { AdjuntosListComponent } from '../../shared/adjuntos-list/adjuntos-list.component';
import { Adjunto } from '../../models/adjunto.model';
import { DdmmyyyyPipe }       from '../../shared/ddmmyyyy.pipe';
import { DatePipe, SlicePipe, DecimalPipe } from '@angular/common';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';
import { AuthService }        from '../../auth/auth.service';
import { FacturaService, FacturaSiat, FacturaResult } from '../../services/factura.service';
import QrScanner from 'qr-scanner';
import * as XLSX from 'xlsx';
import { RendM }              from '../../models/rend-m.model';
import { RendD, CreateRendDPayload } from '../../models/rend-d.model';
import { Documento }          from '../../models/documento.model';
import { Perfil }             from '../../models/perfil.model';
import { PrctjModalComponent }          from './prctj-modal/prctj-modal.component';
import { RendicionPdfPreviewComponent } from '../../shared/rendicion-pdf/rendicion-pdf-preview.component';
import { AiFacturaPreviewComponent } from '../../shared/ai-factura-preview/ai-factura-preview.component';
import { AiService, ClasificacionSugeridaResponse } from '../../services/ai.service';
import { AiSuggestionComponent, AiDisabledNoticeComponent } from '../../shared/ai-suggestion';
import { DropdownPositionDirective }    from '../../shared/dropdown-position.directive';


interface NormaActiva {
  slot:      number;
  dimension: DimensionWithRules;
  rules:     SelectOption[];
}

/** Estado de un PDF en procesamiento batch */
interface PdfBatchItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  result?: FacturaResult;
  error?: string;
  qrUrl?: string;
  cuf?: string; // CUF extraído del QR
}


@Component({
  standalone: true,
  selector: 'app-rend-d',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    ConfirmDialogComponent, PaginatorComponent, AppSelectComponent,
    CuentaSearchComponent, ProveedorSearchComponent, ProjectSearchComponent, DdmmyyyyPipe,
    SkeletonLoaderComponent, PrctjModalComponent, RendicionPdfPreviewComponent, AiFacturaPreviewComponent,
    AdjuntosListComponent, DropdownPositionDirective,
    AiSuggestionComponent, AiDisabledNoticeComponent,
    DatePipe, SlicePipe, DecimalPipe,
  ],
  templateUrl: './rend-d.component.html',
  styleUrls:   ['./rend-d.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RendDComponent implements OnInit {

  idRendicion!: number;
  cabecera:     RendM | null = null;
  perfil:       Perfil | null = null;
  documentos:   RendD[]     = [];
  paged:        RendD[]     = [];
  tiposDocs:    Documento[] = [];
  normasActivas: NormaActiva[] = [];

  // Config cuentas del perfil
  cueCar:        string     = 'TODOS';
  cueTexto:      string     = '';
  listaCuentas:  CuentaDto[] = [];

  // Config proveedores del perfil
  proCar:    string = 'TODOS';
  proTexto:  string = '';
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

  // Modal Preview IA (single - legacy)
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
  showQrScanner   = false;
  qrStream:       MediaStream | null = null;
  qrError:        string | null = null;
  qrScanning      = false;
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
  /** Indicador de carga de sugerencia IA */
  iaSugerenciaLoading = false;
  /** Sugerencia actual de IA */
  iaSugerencia: ClasificacionSugeridaResponse | null = null;
  /** Mensaje de carga de IA */
  iaLoadingMessage = 'Analizando...';
  /** Timer para debounce de sugerencias IA */
  private iaDebounceTimer: any = null;
  // Flag: preserva el exento guardado al abrir edición con % fijo
  private _preservarExento = false;

  // Modal nuevo proveedor eventual
  showNuevoProv   = false;
  nuevoProvNit    = '';
  nuevoProvNombre = '';
  guardandoProv   = false;

  form!: FormGroup;
  private initialValues: any = null;

  // ── Motor de cálculo ───────────────────────────────────────────
  // Configuración del documento activo (REND_CTA row)
  protected configDocActivo: Documento | null = null;
  // Subject para destruir la suscripción de valueChanges al cambiar de doc
  private calcDestroy$ = new Subject<void>();

  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

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

  get totalImporte():   number { return this.documentos.reduce((s, d) => s + (d.U_RD_Importe   ?? 0), 0); }
  get totalDescuento(): number { return this.documentos.reduce((s, d) => s + (d.U_RD_Descuento ?? 0), 0); }
  get totalExento():    number { return this.documentos.reduce((s, d) => s + (d.U_RD_Exento    ?? 0), 0); }
  get totalTasaCero():  number { return this.documentos.reduce((s, d) => s + (d.U_RD_TasaCero  ?? 0), 0); }
  get totalTasa():      number { return this.documentos.reduce((s, d) => s + (d.U_TASA          ?? 0), 0); }
  get totalIce():       number { return this.documentos.reduce((s, d) => s + (d.U_ICE           ?? 0), 0); }
  get totalGiftCard():  number { return this.documentos.reduce((s, d) => s + (d.U_GIFTCARD      ?? 0), 0); }
  get totalImpRet():    number { return this.documentos.reduce((s, d) => s + (d.U_RD_ImpRet    ?? 0), 0); }
  get totalIVA():       number { return this.documentos.reduce((s, d) => s + (d.U_MontoIVA     ?? 0), 0); }
  get totalIT():        number { return this.documentos.reduce((s, d) => s + (d.U_MontoIT      ?? 0), 0); }
  get totalIUE():       number { return this.documentos.reduce((s, d) => s + (d.U_MontoIUE     ?? 0), 0); }
  get totalRCIVA():     number { return this.documentos.reduce((s, d) => s + (d.U_MontoRCIVA   ?? 0), 0); }
  get totalBaseImp():   number { return this.documentos.reduce((s, d) => s + ((d.U_RD_Importe ?? 0) - (d.U_RD_Exento ?? 0) - (d.U_ICE ?? 0) - (d.U_TASA ?? 0) - (d.U_RD_TasaCero ?? 0) - (d.U_GIFTCARD ?? 0)), 0); }
  get totalGeneral():   number { return this.documentos.reduce((s, d) => s + (d.U_RD_Total     ?? 0), 0); }

  // ── Control de saldo ─────────────────────────────────────────
  /** Monto inicial recibido (cabecera) */
  get montoInicial(): number { return Number(this.cabecera?.U_Monto ?? 0); }

  /** Total rendido = suma de todos los importes de documentos */
  get totalRendido(): number { return this.totalImporte; }

  /** Saldo restante: positivo = falta rendir, negativo = excedido */
  get saldoRestante(): number {
    return this._round(this.montoInicial - this.totalRendido);
  }

  /** Porcentaje rendido sobre el monto inicial */
  get porcentajeRendido(): number {
    if (this.montoInicial === 0) return 0;
    return Math.min(100, this._round((this.totalRendido / this.montoInicial) * 100));
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

    this.rendDSvc.getAll(this.idRendicion).subscribe({
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
  adjuntosCountMap: Map<number, number> = new Map(); // Mapa de contadores por idRD

  // ── Menú de acciones por fila ──────────────────────────────────────────
  openMenuId: number | null = null;  // ID del documento con menú abierto

  toggleMenu(d: RendD, event: Event) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === d.U_RD_IdRD ? null : d.U_RD_IdRD;
    this.cdr.markForCheck();
  }

  closeMenu() {
    this.openMenuId = null;
    this.cdr.markForCheck();
  }

  onMenuAction(d: RendD, action: 'edit' | 'dist' | 'delete') {
    this.openMenuId = null;
    this.cdr.markForCheck();
    
    switch (action) {
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
    this.adjuntosSvc.getAdjuntos(this.idRendicion, this.adjuntosDoc.U_RD_IdRD).subscribe({
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
    this.cdr.markForCheck();
  }

  onAdjuntoEliminado(id: number) {
    this.adjuntosList = this.adjuntosList.filter(a => a.id !== id);
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
  ) {}

  ngOnInit() {
    this.idRendicion = Number(this.route.snapshot.paramMap.get('id'));
    this.buildForm();
    this.inicializarIA();
    Promise.resolve().then(() => this.loadAll());
  }
  
  // ══ Funcionalidades IA ═════════════════════════════════════════
  
  /** Muestra el botón flotante de ayuda IA cuando hay texto suficiente */
  mostrarBotonAyudaIA = false;
  
  /**
   * Inicializa el servicio de IA y suscripciones
   */
  private inicializarIA(): void {
    // Cargar estado de IA
    this.aiService.cargarStatus().subscribe({
      next: (status: import('../../services/ai.service').AiStatus) => {
        this.iaEnabled = this.aiService.estaHabilitada;
        console.log('🤖 IA inicializada:', this.iaEnabled ? 'HABILITADA' : 'DESHABILITADA');
        this.cdr.markForCheck();
      },
      error: () => {
        this.iaEnabled = false;
        this.cdr.markForCheck();
      }
    });
    
    // Escuchar cambios en el concepto para mostrar/ocultar botón de ayuda
    this.form.get('concepto')?.valueChanges.subscribe((valor) => {
      this.onConceptoChange(valor);
    });
  }
  
  /**
   * Maneja cambios en el campo concepto
   * Muestra/oculta el botón de ayuda IA según el contenido
   */
  onConceptoChange(concepto: string): void {
    // Limpiar sugerencia si el concepto cambió significativamente
    if (this.iaSugerencia && concepto !== this.iaSugerenciaTextoPrevio) {
      this.iaSugerencia = null;
    }
    
    // Mostrar botón de ayuda si hay texto suficiente (mínimo 10 caracteres) y IA está habilitada
    this.mostrarBotonAyudaIA = this.iaEnabled && !!concepto && concepto.trim().length >= 10;
    this.cdr.markForCheck();
  }
  
  /** Guarda el texto del concepto previo para comparar cambios */
  private iaSugerenciaTextoPrevio = '';
  
  /**
   * Solicita sugerencia de clasificación a la IA (llamado manualmente por el usuario)
   */
  solicitarSugerenciaIA(): void {
    const concepto = this.form.get('concepto')?.value || '';
    const importe = this.form.get('importe')?.value || 0;
    const proveedor = this.form.get('prov')?.value || '';
    
    if (!concepto || concepto.trim().length < 10) {
      this.toast.warning('Escribe una descripción más detallada del gasto para obtener mejores sugerencias');
      return;
    }
    
    // Guardar texto previo para evitar re-solicitar si no cambió
    this.iaSugerenciaTextoPrevio = concepto;
    
    this.iaSugerenciaLoading = true;
    this.iaLoadingMessage = 'Analizando gasto con IA...';
    this.mostrarBotonAyudaIA = false; // Ocultar botón mientras carga
    this.cdr.markForCheck();
    
    this.aiService.sugerirClasificacion({
      concepto: concepto.trim(),
      monto: importe,
      proveedor,
      usuarioId: String(this.auth.user?.sub || ''),
      idRendicion: this.idRendicion,
    }).subscribe({
      next: (sugerencia: ClasificacionSugeridaResponse | null) => {
        this.iaSugerencia = sugerencia;
        this.iaSugerenciaLoading = false;
        this.cdr.markForCheck();
        
        if (sugerencia) {
          this.toast.info(
            `💡 IA sugiere: ${sugerencia.cuentaContable.codigo} (${Math.round(sugerencia.cuentaContable.confianza * 100)}% confianza)`,
            3000
          );
        }
      },
      error: (error: any) => {
        console.error('Error obteniendo sugerencia IA:', error);
        this.iaSugerenciaLoading = false;
        this.iaSugerencia = null;
        this.mostrarBotonAyudaIA = true; // Mostrar botón nuevamente para reintentar
        this.cdr.markForCheck();
        this.toast.error('No se pudo obtener la sugerencia. Intenta de nuevo.');
      }
    });
  }
  
  /**
   * Aplica la sugerencia de IA al formulario
   */
  aplicarSugerenciaIA(sugerencia: ClasificacionSugeridaResponse): void {
    if (!sugerencia) return;
    
    const patchValue: any = {};
    
    // Aplicar cuenta contable
    if (sugerencia.cuentaContable) {
      patchValue.cuenta = sugerencia.cuentaContable.codigo;
      patchValue.nombreCuenta = sugerencia.cuentaContable.nombre;
    }
    
    // Aplicar proyecto si existe
    if (sugerencia.proyecto) {
      patchValue.proyecto = sugerencia.proyecto.codigo;
      this.proyectoActivo = true;
    }
    
    // En modo ONLINE: aplicar dimensión
    // En modo OFFLINE: aplicar norma (si hay campos para ello)
    
    this.form.patchValue(patchValue);
    
    // Limpiar sugerencia aplicada
    this.iaSugerencia = null;
    
    this.toast.exito('Sugerencia aplicada correctamente');
    this.cdr.markForCheck();
  }
  
  /**
   * Ignora la sugerencia actual de IA
   */
  ignorarSugerenciaIA(): void {
    this.iaSugerencia = null;
    this.cdr.markForCheck();
  }

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
      this.sapSvc.getDimensions().pipe(catchError(() => of([]))).subscribe({
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
    ).subscribe({
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
          this.cuentasListaSvc.getByPerfil(this.cabecera!.U_IdPerfil).subscribe({
            next: (lista) => {
              this.listaCuentas = lista.map(c => ({ code: c.U_CuentaSys, name: c.U_NombreCuenta }));
              this.cdr.markForCheck();
            },
          });
        }

        this.updatePaging();
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
    this.rendDSvc.getAll(this.idRendicion).subscribe({
      next: (data) => {
        this.documentos  = data;
        this.loadingDocs = false;
        this.updatePaging();
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
      this.adjuntosSvc.getAdjuntos(this.idRendicion, d.U_RD_IdRD).subscribe({
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
      idTipoDoc:  doc.U_IdTipoDoc,
      tipoDocName: doc.U_TipDoc,
      ctaExento:  doc.U_CTAEXENTO,
      // Si TASA en config es -1, mantener el valor que tiene el usuario; si no, usar el de la config
      tasa:       Number(doc.U_TASA) === -1 ? this.form.get('tasa')?.value : (Number(doc.U_TASA) ?? 0),
      // Si ICE en config es -1, mantener el valor digitado; si no, usar el de la config
      ice:        Number(doc.U_ICE)  === -1 ? this.form.get('ice')?.value  : (Number(doc.U_ICE)  ?? 0),
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
    const importe   = this._n(r.importe);

    // ── Exento ────────────────────────────────────────────────────
    const exentoPct = Number(cfg.U_EXENTOpercent);
    const exento = exentoPct === -1
      ? this._n(r.exento)
      : exentoPct > 0
        ? this._round(importe * (exentoPct / 100))
        : 0;

    // ── Tasa y ICE ────────────────────────────────────────────────
    const tasa     = Number(cfg.U_TASA) === -1 ? this._n(r.tasa) : (Number(cfg.U_TASA) ?? 0);
    const icePct   = Number(cfg.U_ICE);
    const ice      = icePct === -1
      ? this._n(r.ice)
      : icePct > 0
        ? this._round(importe * (icePct / 100))
        : 0;
    const tasaCero = this._n(r.tasaCero);
    const giftCard = this._n(r.giftCard);

    // ── Base imponible ────────────────────────────────────────────
    const baseImponible = importe - exento - ice - tasa - tasaCero - giftCard;

    let montoIVA   = 0;
    let montoIT    = 0;
    let montoIUE   = 0;
    let montoRCIVA = 0;

    const tipoCalc = String(cfg.U_TipoCalc);
    const esRecibo = idTipoDoc === 4 || idTipoDoc === 10;

    if (idTipoDoc === 1) {
      // ── Factura: cálculo normal sobre base imponible ──────────
      montoIVA   = this._calcImpuesto(baseImponible, cfg.U_IVApercent);
      montoIT    = this._calcImpuesto(baseImponible, cfg.U_ITpercent);
      montoIUE   = this._calcImpuesto(baseImponible, cfg.U_IUEpercent);
      montoRCIVA = this._calcImpuesto(baseImponible, cfg.U_RCIVApercent);

    } else if (esRecibo && tipoCalc === '1') {
      // ── Grossing Down: impuestos sobre importe, se descuentan al proveedor ──
      // Recibo dice 150 Bs → empresa paga 150, proveedor recibe 150 - retenciones
      montoIT    = this._calcImpuesto(importe, cfg.U_ITpercent);
      montoRCIVA = this._calcImpuesto(importe, cfg.U_RCIVApercent);
      montoIVA   = this._calcImpuesto(importe, cfg.U_IVApercent);
      montoIUE   = this._calcImpuesto(importe, cfg.U_IUEpercent);

    } else if (esRecibo && tipoCalc === '0') {
      // ── Grossing Up correcto: el importe ingresado es el LÍQUIDO a pagar al proveedor.
      // La empresa asume las retenciones, por lo que hay que calcular el BRUTO hacia arriba.
      //
      // Fórmula:  Bruto = Líquido / (1 - suma_de_tasas)
      // Ejemplo:  1800 / (1 - 0.155) = 2130.18  → IUE=266.27, IT=63.91, Prov.recibe=1800
      //
      // El Bruto es el costo real para la empresa y lo que figura en el contrato.
      const tasaIUE   = (Number(cfg.U_IUEpercent)   || 0) / 100;
      const tasaIT    = (Number(cfg.U_ITpercent)     || 0) / 100;
      const tasaRCIVA = (Number(cfg.U_RCIVApercent)  || 0) / 100;
      const tasaIVA   = (Number(cfg.U_IVApercent)    || 0) / 100;
      const sumaTasas = tasaIUE + tasaIT + tasaRCIVA + tasaIVA;

      // Bruto = Líquido / (1 - tasas) — solo si hay tasas configuradas
      const bruto = sumaTasas > 0 && sumaTasas < 1
        ? this._round(importe / (1 - sumaTasas))
        : importe;

      montoIUE   = this._round(bruto * tasaIUE);
      montoIT    = this._round(bruto * tasaIT);
      montoRCIVA = this._round(bruto * tasaRCIVA);
      montoIVA   = this._round(bruto * tasaIVA);
    }

    const impRet = this._round(montoIVA + montoIT + montoIUE + montoRCIVA);

    // Total según tipo de cálculo:
    // GU → el Total es el BRUTO (costo real empresa = líquido + retenciones que asume)
    //       Total = Importe (líquido) + ImpRet = Bruto
    // GD → proveedor recibe menos: Total = Importe - ImpRet
    // Factura → Total = Importe - ImpRet
    const total = esRecibo && tipoCalc === '0'
      ? this._round(importe + impRet)   // GU: Total = Bruto (líquido + retenciones)
      : this._round(importe - impRet);  // GD / Factura: se descuenta al proveedor

    // Actualizar campos calculados sin disparar otro ciclo de valueChanges
    this.form.patchValue({
      montoIVA:   this._round(montoIVA),
      montoIT:    this._round(montoIT),
      montoIUE:   this._round(montoIUE),
      montoRCIVA: this._round(montoRCIVA),
      impRet,
      total,
      // Propagar exento calculado al campo del formulario si viene de %
      ...(Number(cfg.U_EXENTOpercent) > 0 ? { exento: this._round(exento) } : {}),
      ...(icePct > 0 ? { ice: this._round(ice) } : {}),
      // Propagar cuentas contables desde la config SOLO si el campo está vacío.
      // Si el usuario ya seleccionó una cuenta manualmente, NO se sobreescribe.
      ...(!r.cuentaIVA   && cfg.U_IVAcuenta   ? { cuentaIVA:   cfg.U_IVAcuenta   } : {}),
      ...(!r.cuentaIT    && cfg.U_ITcuenta    ? { cuentaIT:    cfg.U_ITcuenta    } : {}),
      ...(!r.cuentaIUE   && cfg.U_IUEcuenta   ? { cuentaIUE:   cfg.U_IUEcuenta   } : {}),
      ...(!r.cuentaRCIVA && cfg.U_RCIVAcuenta ? { cuentaRCIVA: cfg.U_RCIVAcuenta } : {}),
    }, { emitEvent: false });

    this.cdr.markForCheck();
  }

  /** Calcula un impuesto: si pct es 0 o null → 0; si pct > 0 → base × pct / 100 */
  private _calcImpuesto(base: number, pct: number | null | undefined): number {
    if (!pct || pct <= 0) return 0;
    return base * (pct / 100);
  }

  /** Convierte a número seguro */
  private _n(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  /** Redondea a 2 decimales */
  private _round(v: number): number {
    return Math.round(v * 100) / 100;
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

  guardarNuevoProv() {
    if (!this.nuevoProvNit.trim() || !this.nuevoProvNombre.trim()) return;
    this.guardandoProv = true;
    this.provSvc.create(this.nuevoProvNit.trim(), this.nuevoProvNombre.trim()).subscribe({
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

  confirmarUrl() {
    const url = this.urlInput.trim();
    if (!url) return;

    this.urlLoadingFactura = true;
    this.urlError          = null;
    this.cdr.markForCheck();

    this.facturaSvc.getFromSiat(url).subscribe({
      next: (factura) => {
        this.urlLoadingFactura = false;
        this.showUrlModal      = false;
        this.urlInput          = '';
        this._prefillFromFactura(factura);
      },
      error: (err) => {
        this.urlLoadingFactura = false;
        this.urlError = err?.error?.message
          ?? 'No se pudo obtener la factura. Verificá que la URL sea del SIAT boliviano.';
        this.cdr.markForCheck();
      },
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

    // Iniciar modo batch
    this.pdfBatchProcessing = true;
    this.pdfError = null;
    this.cdr.markForCheck();

    // Inicializar items del batch
    this.pdfBatchResults = this.pdfFiles.map((file, index) => ({
      id: `pdf-${Date.now()}-${index}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));

    // Cargar pdf.js una sola vez
    let pdfjsLib: any;
    try {
      pdfjsLib = await this._loadPdfJs();
    } catch (err: any) {
      this.pdfError = 'Error cargando PDF.js: ' + err.message;
      this.pdfBatchProcessing = false;
      this.cdr.markForCheck();
      return;
    }

    // Procesar cada PDF secuencialmente
    for (let i = 0; i < this.pdfBatchResults.length; i++) {
      this.currentProcessingIndex = i;
      const item = this.pdfBatchResults[i];
      item.status = 'processing';
      item.progress = 10;
      this.cdr.markForCheck();

      try {
        // 1. Leer el PDF como ArrayBuffer
        const arrayBuffer = await item.file.arrayBuffer();
        item.progress = 30;
        this.cdr.markForCheck();

        // 2. Renderizar la primera página como canvas
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        item.progress = 50;
        this.cdr.markForCheck();

        // 3. Escanear QR en el canvas con QrScanner
        let qrUrl: string | undefined;
        let cuf: string | undefined;
        try {
          const result = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
          qrUrl = result?.data;
          // Extraer CUF del QR URL del SIAT
          if (qrUrl) {
            cuf = this._extractCufFromQrUrl(qrUrl);
          }
        } catch {
          // No se encontró QR, continuar sin URL
        }
        item.qrUrl = qrUrl;
        item.cuf = cuf;
        item.progress = 70;
        this.cdr.markForCheck();

        // 4. Procesar con el servicio (SIAT primero, luego IA)
        await new Promise<void>((resolve) => {
          this.facturaSvc.processFacturaPdf(item.file!, qrUrl, cuf).subscribe({
            next: (result) => {
              item.status = result.success ? 'completed' : 'error';
              item.result = result;
              item.error = result.error;
              // Si tenemos CUF del QR pero no de la respuesta, agregarlo
              if (cuf && result.success && result.data) {
                (result.data as any).cuf = cuf;
              }
              item.progress = 100;
              this.cdr.markForCheck();
              resolve();
            },
            error: (err) => {
              item.status = 'error';
              item.error = err?.message ?? 'Error al procesar';
              item.progress = 100;
              this.cdr.markForCheck();
              resolve();
            }
          });
        });

      } catch (err: any) {
        item.status = 'error';
        item.error = err?.message ?? 'Error al procesar el PDF';
        item.progress = 100;
        this.cdr.markForCheck();
      }
    }

    this.pdfBatchProcessing = false;
    this.currentProcessingIndex = -1;
    
    // Mostrar modal con resultados batch
    this.showPdfModal = false;
    this.showPdfBatchModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Extrae el CUF de una URL de QR del SIAT boliviano
   */
  private _extractCufFromQrUrl(url: string): string | undefined {
    try {
      // URLs típicas del SIAT:
      // https://pilotosiat.impuestos.gob.bo/consulta/QR?nit=...&cuf=...&numero=...&t=2
      // https://siat.impuestos.gob.bo/consulta/QR?nit=...&cuf=...&numero=...
      const urlObj = new URL(url);
      const cuf = urlObj.searchParams.get('cuf');
      if (cuf) return cuf;
      
      // También puede estar en path: /consulta/QR/CUF...
      const match = url.match(/QR\/([A-F0-9]{32,})/i);
      if (match) return match[1];
      
      return undefined;
    } catch {
      return undefined;
    }
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
    } catch (err: any) {
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
    item.status = 'processing';
    item.progress = 50;
    item.error = undefined;
    this.cdr.markForCheck();

    try {
      await new Promise<void>((resolve) => {
        this.facturaSvc.processFacturaPdf(item.file!, item.qrUrl, item.cuf).subscribe({
          next: (result) => {
            item.status = result.success ? 'completed' : 'error';
            item.result = result;
            item.error = result.error;
            if (item.cuf && result.success && result.data) {
              (result.data as any).cuf = item.cuf;
            }
            item.progress = 100;
            this.cdr.markForCheck();
            resolve();
          },
          error: (err) => {
            item.status = 'error';
            item.error = err?.message ?? 'Error al reprocesar';
            item.progress = 100;
            this.cdr.markForCheck();
            resolve();
          }
        });
      });
    } catch (err: any) {
      item.status = 'error';
      item.error = err?.message ?? 'Error al reprocesar';
      item.progress = 100;
      this.cdr.markForCheck();
    }
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
   * Calcula impuestos automáticamente según configuración del tipo de documento
   */
  private async _crearDocumentoDesdeFactura(factura: FacturaSiat): Promise<void> {
    return new Promise((resolve, reject) => {
      const primerTipo = this.tiposDocs[0];
      const config = primerTipo; // Config del tipo de documento
      
      let fecha = this.hoy;
      if (factura.datetime) {
        try { fecha = factura.datetime.substring(0, 10); } catch { }
      }

      const importe = factura.total || 0;
      
      // Calcular impuestos según configuración del tipo de documento
      // Similar al motor de cálculo _recalcular() pero simplificado
      const idTipoDoc = Number(config?.U_IdTipoDoc ?? 1);
      const esRecibo = idTipoDoc === 4 || idTipoDoc === 10;
      const tipoCalc = String(config?.U_TipoCalc ?? '1');
      
      // Por defecto: factura (tipo 1) - cálculo normal sobre base imponible
      let montoIVA = 0, montoIT = 0, montoIUE = 0, montoRCIVA = 0;
      
      if (idTipoDoc === 1) {
        // Factura: calcular sobre importe (simplificado sin exento/ice/tasa)
        montoIVA = this._calcImpuestoSimple(importe, config?.U_IVApercent);
        montoIT = this._calcImpuestoSimple(importe, config?.U_ITpercent);
        montoIUE = this._calcImpuestoSimple(importe, config?.U_IUEpercent);
        montoRCIVA = this._calcImpuestoSimple(importe, config?.U_RCIVApercent);
      } else if (esRecibo) {
        if (tipoCalc === '1') {
          // Grossing Down: sobre importe
          montoIT = this._calcImpuestoSimple(importe, config?.U_ITpercent);
          montoRCIVA = this._calcImpuestoSimple(importe, config?.U_RCIVApercent);
          montoIVA = this._calcImpuestoSimple(importe, config?.U_IVApercent);
          montoIUE = this._calcImpuestoSimple(importe, config?.U_IUEpercent);
        } else {
          // Grossing Up: calcular bruto primero (simplificado)
          const tasaIUE = (Number(config?.U_IUEpercent) || 0) / 100;
          const tasaIT = (Number(config?.U_ITpercent) || 0) / 100;
          const tasaRCIVA = (Number(config?.U_RCIVApercent) || 0) / 100;
          const tasaIVA = (Number(config?.U_IVApercent) || 0) / 100;
          const sumaTasas = tasaIUE + tasaIT + tasaRCIVA + tasaIVA;
          
          const bruto = sumaTasas > 0 && sumaTasas < 1
            ? Math.round((importe / (1 - sumaTasas)) * 100) / 100
            : importe;
          
          montoIUE = Math.round(bruto * tasaIUE * 100) / 100;
          montoIT = Math.round(bruto * tasaIT * 100) / 100;
          montoRCIVA = Math.round(bruto * tasaRCIVA * 100) / 100;
          montoIVA = Math.round(bruto * tasaIVA * 100) / 100;
        }
      }

      const impRet = Math.round((montoIVA + montoIT + montoIUE + montoRCIVA) * 100) / 100;
      const total = esRecibo && tipoCalc === '0'
        ? Math.round((importe + impRet) * 100) / 100
        : Math.round((importe - impRet) * 100) / 100;

      // Payload según el DTO del backend (sin idRendicion, sin iva/it/iue/rciiva abreviados)
      // ✅ USAR CONCEPTO DEL USUARIO si existe, sino generar uno genérico
      const conceptoUsuario = (factura as any).concepto?.trim();
      const conceptoFinal = conceptoUsuario 
        ? conceptoUsuario.substring(0, 200)
        : `Compra según factura N° ${factura.invoiceNumber}`.substring(0, 200);
      
      const payload = {
        cuenta: '',
        nombreCuenta: '',
        concepto: conceptoFinal,
        fecha,
        idTipoDoc: config?.U_IdTipoDoc ?? 1,
        tipoDoc: config?.U_IdDocumento ?? 1,
        tipoDocName: config?.U_TipDoc ?? 'FACTURA',
        numDocumento: factura.invoiceNumber || '',
        nit: factura.nit || '0',
        prov: factura.companyName || '',
        codProv: '',
        importe: importe,
        descuento: 0,
        exento: 0,
        tasaCero: 0,
        ice: 0,
        tasa: Number(config?.U_TASA) === -1 ? 0 : (Number(config?.U_TASA) ?? 0),
        giftCard: 0,
        montoIVA,
        montoIT,
        montoIUE,
        montoRCIVA,
        impRet,
        total,
        cuf: factura.cuf || '',
        nroAutor: '',
        ctrl: '',
        proyecto: '',
        n1: this.auth.fijarNr ? this.auth.nr1 : '',
        n2: this.auth.fijarNr ? this.auth.nr2 : '',
        n3: this.auth.fijarNr ? this.auth.nr3 : '',
        ctaExento: config?.U_CTAEXENTO || '',
        // ✅ Importe en moneda local (Bs) - copia del importe original
        importeBs: importe,
        exentoBs: 0,
        desctoBs: 0,
      };

      this.rendDSvc.create(this.idRendicion, payload as any).subscribe({
        next: () => resolve(),
        error: (err) => reject(err)
      });
    });
  }

  /** Helper para calcular impuestos simplificado */
  private _calcImpuestoSimple(base: number, pct: number | null | undefined): number {
    if (!pct || pct <= 0) return 0;
    return Math.round(base * (pct / 100) * 100) / 100;
  }

  /**
   * Obtiene el conteo de items por estado
   */
  get batchStats() {
    const total = this.pdfBatchResults.length;
    const completed = this.pdfBatchResults.filter(i => i.status === 'completed').length;
    const errors = this.pdfBatchResults.filter(i => i.status === 'error').length;
    const processing = this.pdfBatchResults.filter(i => i.status === 'processing').length;
    const pending = this.pdfBatchResults.filter(i => i.status === 'pending').length;
    return { total, completed, errors, processing, pending };
  }

  // ══ Helpers para templates (evitar errores de tipado) ══

  getItemNit(item: PdfBatchItem): string {
    return (item.result?.data as any)?.nit || '—';
  }

  getItemRazonSocial(item: PdfBatchItem): string {
    const data = item.result?.data as any;
    return data?.razonSocial || data?.companyName || '—';
  }

  getItemNumeroFactura(item: PdfBatchItem): string {
    const data = item.result?.data as any;
    return data?.numeroFactura || data?.invoiceNumber || '—';
  }

  getItemFecha(item: PdfBatchItem): string {
    const data = item.result?.data as any;
    return data?.fecha || data?.datetime || '';
  }

  getItemMonto(item: PdfBatchItem): number {
    const data = item.result?.data as any;
    return data?.monto || data?.total || 0;
  }

  getItemCuf(item: PdfBatchItem): string {
    return item.cuf || (item.result?.data as any)?.cuf || '';
  }

  /** Carga pdf.js UMD desde CDN — expone window.pdfjsLib */
  private _loadPdfJs(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve((window as any).pdfjsLib);
        return;
      }
      const script   = document.createElement('script');
      script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload  = () => {
        const lib = (window as any).pdfjsLib;
        if (!lib) { reject(new Error('pdfjsLib no disponible')); return; }
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      };
      script.onerror = () => reject(new Error('No se pudo cargar pdf.js'));
      document.head.appendChild(script);
    });
  }

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
      cuenta: '', fecha: this.hoy, tipoDoc: String(primer?.U_IdDocumento) ?? '',
      tipoDocName: primer?.U_TipDoc ?? '',
      idTipoDoc: primer?.U_IdTipoDoc ?? 1,
      numDocumento: '', nroAutor: '', cuf: '', ctrl: '',
      prov: '', codProv: '', concepto: '',
      importe: 0, descuento: 0, exento: 0,
      tasa: Number(primer?.U_TASA) === -1 ? 0 : (Number(primer?.U_TASA) ?? 0),
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

  private qrScannerInstance: QrScanner | null = null;

  async abrirQrScanner() {
    this.qrError          = null;
    this.qrScanning       = true;
    this.qrLoadingFactura = false;
    this.showQrScanner    = true;
    this.cdr.markForCheck();

    // Esperar al siguiente frame para que el <video> esté en el DOM
    await new Promise(r => setTimeout(r, 100));

    try {
      const videoEl = document.getElementById('qr-video') as HTMLVideoElement;
      if (!videoEl) throw new Error('Elemento video no encontrado');

      this.qrScannerInstance = new QrScanner(
        videoEl,
        (result: QrScanner.ScanResult) => {
          const url = result?.data;
          if (url) this.onQrCaptured(url);
        },
        {
          preferredCamera:     'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await this.qrScannerInstance.start();
      this.cdr.markForCheck();

    } catch (err: any) {
      this.qrError    = 'No se pudo acceder a la cámara. Verificá los permisos del navegador.';
      this.qrScanning = false;
      this.cdr.markForCheck();
    }
  }

  // ── Exportar / Importar ──────────────────────────────────────

  exportarExcel() {
    const rows = this.documentos.map(d => ({
      'N°':           d.U_RD_IdRD,
      'Fecha':        d.U_RD_Fecha ?? '',
      'Tipo Doc':     this.getTipoDocName(d.U_RD_TipoDoc) ?? '',
      'N° Documento': d.U_RD_NumDocumento ?? '',
      'NIT':          d.U_RD_NIT ?? '',
      'Proveedor':    d.U_RD_Prov ?? '',
      'Concepto':     d.U_RD_Concepto ?? '',
      'Cuenta':       d.U_RD_Cuenta ?? '',
      'Nombre Cuenta': d.U_RD_NombreCuenta ?? '',
      'Importe':      d.U_RD_Importe ?? 0,
      'Exento':       d.U_RD_Exento ?? 0,
      'ICE':          d.U_ICE ?? 0,
      'Tasas':        d.U_TASA ?? 0,
      'Tasa Cero':    d.U_RD_TasaCero ?? 0,
      'Gift Card':    d.U_GIFTCARD ?? 0,
      'Imp/Ret':      d.U_RD_ImpRet ?? 0,
      'Total':        d.U_RD_Total ?? 0,
      'CUF':          d.U_CUF ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Ancho de columnas
    ws['!cols'] = [
      {wch:6},{wch:12},{wch:18},{wch:16},{wch:14},{wch:28},
      {wch:35},{wch:14},{wch:28},{wch:12},{wch:10},{wch:10},
      {wch:10},{wch:10},{wch:10},{wch:12},{wch:12},{wch:32},
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Documentos');

    const nombreArchivo = `Rendicion_${this.cabecera?.U_IdRendicion ?? 0}_Documentos.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    this.toast.exito(`Exportado: ${nombreArchivo}`);
  }

  descargarFormato() {
    const ejemplo = [{
      'Fecha':        '2026-03-23',
      'Tipo Doc':     'FACTURA',
      'N° Documento': '1234',
      'NIT':          '1234567890',
      'Proveedor':    'Empresa S.R.L.',
      'Concepto':     'Descripción del gasto',
      'Cuenta':       '51105001',
      'Importe':      100.00,
      'Exento':       0,
      'ICE':          0,
      'Tasas':        0,
      'Tasa Cero':    0,
      'Gift Card':    0,
      'CUF':          '',
    }];

    const ws = XLSX.utils.json_to_sheet(ejemplo);
    ws['!cols'] = [
      {wch:12},{wch:18},{wch:16},{wch:14},{wch:28},
      {wch:35},{wch:14},{wch:12},{wch:10},{wch:10},
      {wch:10},{wch:10},{wch:10},{wch:32},
    ];

    // Fila de instrucciones
    XLSX.utils.sheet_add_aoa(ws, [
      ['INSTRUCCIONES: Complete los campos y elimine esta fila antes de importar.'],
    ], { origin: 'A3' });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Importar');
    XLSX.writeFile(wb, 'Formato_Importacion_Documentos.xlsx');
    this.toast.exito('Formato descargado');
  }

  onImportarFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importando  = true;
    this.importError = null;
    this.cdr.markForCheck();

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array', cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows.length) {
          this.importError = 'El archivo está vacío o no tiene filas de datos';
          this.importando  = false;
          this.cdr.markForCheck();
          return;
        }

        // Filtrar filas de instrucciones
        const datos = rows.filter(r =>
          r['Fecha'] && r['Importe'] !== '' && !String(r['Fecha']).startsWith('INSTRUCCIONES')
        );

        if (!datos.length) {
          this.importError = 'No se encontraron filas válidas. Verificá el formato del archivo.';
          this.importando  = false;
          this.cdr.markForCheck();
          return;
        }

        // Buscar tipo de documento activo para el primer tipo encontrado
        const primerTipo = this.tiposDocs[0];

        // Importar secuencialmente
        this._importarFila(datos, 0, 0, primerTipo);

      } catch (err: any) {
        this.importError = `Error al leer el archivo: ${err?.message ?? 'formato inválido'}`;
        this.importando  = false;
        this.cdr.markForCheck();
      }
    };
    reader.readAsArrayBuffer(file);

    // Limpiar input para permitir reimportar el mismo archivo
    input.value = '';
  }

  private _importarFila(rows: any[], idx: number, ok: number, tipoDoc: any) {
    if (idx >= rows.length) {
      this.importando = false;
      this.toast.exito(`${ok} documento${ok !== 1 ? 's' : ''} importado${ok !== 1 ? 's' : ''} correctamente`);
      this.loadDocs();
      return;
    }

    const r = rows[idx];
    const fecha = r['Fecha'] instanceof Date
      ? r['Fecha'].toISOString().substring(0, 10)
      : String(r['Fecha'] ?? '').substring(0, 10);

    const payload = {
      idRendicion:  this.idRendicion,
      fecha,
      tipoDoc:      tipoDoc?.U_IdDocumento ?? r['Tipo Doc'] ?? '',
      tipoDocName:  tipoDoc?.U_TipDoc ?? r['Tipo Doc'] ?? '',
      idTipoDoc:    tipoDoc?.U_IdTipoDoc ?? 1,
      numDocumento: String(r['N° Documento'] ?? ''),
      nit:          String(r['NIT']          ?? ''),
      prov:         r['Proveedor']    || '',
      concepto:     r['Concepto']     || '',
      cuenta:       String(r['Cuenta'] ?? ''),
      nombreCuenta: '',
      importe:      Number(r['Importe'])   || 0,
      exento:       Number(r['Exento'])    || 0,
      ice:          Number(r['ICE'])       || 0,
      tasa:         Number(r['Tasas'])     || 0,
      tasaCero:     Number(r['Tasa Cero']) || 0,
      giftCard:     Number(r['Gift Card']) || 0,
      cuf:          String(r['CUF'] ?? ''),
      // impuestos calculados — se recalcularán en backend
      iva:   0, it: 0, iue: 0, rciiva: 0, impRet: 0, total: 0,
    };

    this.rendDSvc.create(this.idRendicion, payload as any).subscribe({
      next: () => this._importarFila(rows, idx + 1, ok + 1, tipoDoc),
      error: (err: any) => {
        this.importError = `Error en fila ${idx + 1}: ${err?.error?.message ?? 'error desconocido'}`;
        this.importando  = false;
        this.loadDocs();
        this.cdr.markForCheck();
      },
    });
  }

  cerrarQrScanner() {
    if (this.qrScannerInstance) {
      this.qrScannerInstance.stop();
      this.qrScannerInstance.destroy();
      this.qrScannerInstance = null;
    }
    this.qrStream?.getTracks().forEach(t => t.stop());
    this.qrStream         = null;
    this.qrScanning       = false;
    this.qrLoadingFactura = false;
    this.showQrScanner    = false;
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
    // Detener el scanner pero mantener el modal abierto para mostrar el loader
    if (this.qrScannerInstance) {
      this.qrScannerInstance.stop();
    }
    this.qrScanning       = false;
    this.qrLoadingFactura = true;
    this.qrError          = null;
    this.cdr.markForCheck();

    this.facturaSvc.getFromSiat(url).subscribe({
      next: (factura) => {
        this.cerrarQrScanner();
        this._prefillFromFactura(factura);
      },
      error: (err) => {
        this.qrLoadingFactura = false;
        this.qrError = err?.error?.message
          ?? 'No se pudo obtener la factura del SIAT. Verificá la conexión o intentá con URL manual.';
        this.cdr.markForCheck();
      },
    });
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
    
    // ✅ DISPARAR SUGERENCIA DE IA si hay concepto y IA está habilitada
    if (conceptoUsuario && this.iaEnabled) {
      setTimeout(() => this.onConceptoChange(conceptoUsuario), 300);
    }

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
        this.provSvc.findOrCreate(factura.nit, factura.companyName).subscribe({
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
    const values = {
      cuenta:       d.U_RD_Cuenta        ?? '',
      nombreCuenta: d.U_RD_NombreCuenta  ?? '',
      fecha:        d.U_RD_Fecha?.substring(0, 10) ?? '',
      tipoDoc:      String(d.U_RD_TipoDoc),
      tipoDocName:  d.U_RD_TipoDoc,
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
    this.form.reset(values);
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
      this._recalcular();
      this._preservarExento = false;
    }
    this.showForm = true;
    this.aplicarEstadoCampos();
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Cerrar menú de acciones si se hace clic fuera
    if (this.openMenuId !== null) {
      const target = event.target as HTMLElement;
      const menuWrap = target.closest('.row-menu-wrap');
      if (!menuWrap) {
        this.closeMenu();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.openMenuId !== null)  { this.closeMenu(); return; }
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

  setTab(tab: 'doc' | 'montos' | 'impuestos') {
    this.activeTab = tab;
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

    obs.subscribe({
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
    this.openDialog({
      title: '¿Eliminar documento?',
      message: `Se eliminará el documento N° ${d.U_RD_IdRD} — "${d.U_RD_Concepto}".`,
      confirmLabel: 'Sí, eliminar', type: 'danger',
    }, () => {
      this.rendDSvc.remove(this.idRendicion, d.U_RD_IdRD).subscribe({
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
    this.paged  = this.documentos.slice(start, start + this.limit);
    // Recargar contadores de adjuntos para la nueva página
    setTimeout(() => this.cargarContadoresAdjuntos(), 0);
  }
  onPageChange(p: number)  { this.page = p;  this.updatePaging(); this.cdr.markForCheck(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); this.cdr.markForCheck(); }

  // ── Dialog ──────────────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

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