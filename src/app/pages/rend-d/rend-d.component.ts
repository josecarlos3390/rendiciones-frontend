import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
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
import { ProvService, ProvEventual } from '../../services/prov.service';
import { DdmmyyyyPipe }       from '../../shared/ddmmyyyy.pipe';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';
import { AuthService }        from '../../auth/auth.service';
import { FacturaService, FacturaSiat } from '../../services/factura.service';
import QrScanner from 'qr-scanner';
import * as XLSX from 'xlsx';
import { RendM }              from '../../models/rend-m.model';
import { RendD, CreateRendDPayload } from '../../models/rend-d.model';
import { Documento }          from '../../models/documento.model';
import { Perfil }             from '../../models/perfil.model';


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
    ConfirmDialogComponent, PaginatorComponent, AppSelectComponent,
    CuentaSearchComponent, ProveedorSearchComponent, DdmmyyyyPipe,
    SkeletonLoaderComponent,
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
  proveedorSeleccionado: { cardCode: string; cardName: string } | null = null;

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
  pdfFile:      File | null = null;
  pdfFileName   = '';

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
    return this.cabecera?.U_Estado !== 1;
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
    return this.tiposDocs.map(d => ({ value: d.U_TipDoc, label: d.U_TipDoc }));
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
    private toast:          ToastService,
    private fb:             FormBuilder,
    public  auth:           AuthService,
    private cdr:            ChangeDetectorRef,
    private facturaSvc:     FacturaService,
  ) {}

  ngOnInit() {
    this.idRendicion = Number(this.route.snapshot.paramMap.get('id'));
    this.buildForm();
    Promise.resolve().then(() => this.loadAll());
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

  // ── Formulario ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      // Tab 1
      cuenta:        ['', Validators.maxLength(25)],
      nombreCuenta:  ['', Validators.maxLength(250)],
      fecha:         ['', Validators.required],
      tipoDoc:       ['', Validators.required],
      idTipoDoc:     [1],
      numDocumento:  ['', Validators.maxLength(20)],
      nroAutor:      ['', Validators.maxLength(250)],
      cuf:           ['', Validators.maxLength(250)],
      ctrl:          ['', Validators.maxLength(25)],
      prov:          ['', Validators.maxLength(200)],
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

  onTipoDocChange(tipDoc: string) {
    const doc = this.tiposDocs.find(d => d.U_TipDoc === tipDoc);
    if (!doc) return;
    this.form.patchValue({
      idTipoDoc:  doc.U_IdTipoDoc,
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
      // ── Grossing Up: impuestos calculados sobre el importe del recibo ──
      // Recibo: 150 Bs → IT 3% = 4.50, RCIIVA 13% = 19.50 → ImpRet = 24
      // Proveedor recibe: 150 Bs completos
      // Empresa registra: 150 + 24 = 174 Bs (asume las retenciones)
      montoIT    = this._calcImpuesto(importe, cfg.U_ITpercent);
      montoRCIVA = this._calcImpuesto(importe, cfg.U_RCIVApercent);
      montoIVA   = this._calcImpuesto(importe, cfg.U_IVApercent);
      montoIUE   = this._calcImpuesto(importe, cfg.U_IUEpercent);
    }

    const impRet = this._round(montoIVA + montoIT + montoIUE + montoRCIVA);

    // Total según tipo de cálculo:
    // GD → proveedor recibe menos: Total = Importe - ImpRet
    // GU → empresa asume retenciones: Total = Importe + ImpRet (gasto mayor)
    // Factura → Total = Importe - ImpRet
    const total = esRecibo && tipoCalc === '0'
      ? this._round(importe + impRet)   // GU: empresa paga importe + retenciones
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
      // Propagar las cuentas contables desde la config
      cuentaIVA:   cfg.U_IVAcuenta   || '',
      cuentaIT:    cfg.U_ITcuenta    || '',
      cuentaIUE:   cfg.U_IUEcuenta   || '',
      cuentaRCIVA: cfg.U_RCIVAcuenta || '',
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
        this.form.patchValue({ codProv: prov.U_NIT, prov: prov.U_RAZON_SOCIAL });
        this.proveedorSeleccionado = { cardCode: prov.U_NIT, cardName: prov.U_RAZON_SOCIAL };
        this.toast.success(`Proveedor "${prov.U_RAZON_SOCIAL}" registrado`);
        this.cdr.markForCheck();
      },
      error: (_err: any) => {
        this.guardandoProv = false;
        this.cdr.markForCheck();
      },
    });
  }

  onProveedorSelected(prov: { cardCode: string; cardName: string } | null) {
    this.form.patchValue({
      codProv: prov?.cardCode ?? '',
      prov:    prov?.cardName ?? '',
    });
    this.proveedorSeleccionado = prov ?? null;
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
    this.pdfFile = null;
    this.pdfFileName = '';
    this.showPdfModal = true;
    this.cdr.markForCheck();
  }

  closePdfModal() {
    this.showPdfModal     = false;
    this.pdfFile          = null;
    this.pdfFileName      = '';
    this.pdfLoadingFactura = false;
    this.pdfError         = null;
    this.cdr.markForCheck();
  }

  onPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pdfFile = file;
    this.pdfFileName = file?.name ?? '';
    this.cdr.markForCheck();
  }

  async confirmarPdf() {
    if (!this.pdfFile) return;

    this.pdfLoadingFactura = true;
    this.pdfError          = null;
    this.cdr.markForCheck();

    try {
      // 1. Cargar pdf.js desde CDN
      const pdfjsLib = await this._loadPdfJs();

      // 2. Leer el PDF como ArrayBuffer
      const arrayBuffer = await this.pdfFile.arrayBuffer();

      // 3. Renderizar la primera página como canvas
      const pdf      = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page     = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 }); // escala 2x para mejor detección

      const canvas  = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;

      // 4. Escanear QR en el canvas con QrScanner
      const result = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
      const url    = result?.data;

      if (!url) throw new Error('No se encontró ningún código QR en el PDF');

      // 5. Mismo flujo que URL/QR
      this.facturaSvc.getFromSiat(url).subscribe({
        next: (factura) => {
          this.pdfLoadingFactura = false;
          this.showPdfModal      = false;
          this.pdfFile           = null;
          this.pdfFileName       = '';
          this._prefillFromFactura(factura);
        },
        error: (err) => {
          this.pdfLoadingFactura = false;
          this.pdfError = err?.error?.message
            ?? 'Se encontró el QR pero no se pudo consultar el SIAT.';
          this.cdr.markForCheck();
        },
      });

    } catch (err: any) {
      this.pdfLoadingFactura = false;
      this.pdfError = err?.message?.includes('No QR code found')
        ? 'No se encontró ningún código QR en el PDF. Verificá que sea una factura electrónica.'
        : (err?.message ?? 'Error al procesar el PDF');
      this.cdr.markForCheck();
    }
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
      cuenta: '', fecha: this.hoy, tipoDoc: primer?.U_TipDoc ?? '',
      idTipoDoc: primer?.U_IdTipoDoc ?? 1,
      numDocumento: '', nroAutor: '', cuf: '', ctrl: '',
      prov: '', concepto: '',
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
    if (this.auth.fijarNr) {
      this.form.patchValue({
        n1: this.auth.nr1,
        n2: this.auth.nr2,
        n3: this.auth.nr3,
      }, { emitEvent: false });
    }
    this.showForm = true;
    this.aplicarEstadoCampos();
    this.cdr.markForCheck();
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
      'Tipo Doc':     d.U_RD_TipoDoc ?? '',
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
    this.toast.success(`Exportado: ${nombreArchivo}`);
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
    this.toast.success('Formato descargado');
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
      this.toast.success(`${ok} documento${ok !== 1 ? 's' : ''} importado${ok !== 1 ? 's' : ''} correctamente`);
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
      tipoDoc:      r['Tipo Doc']     || tipoDoc?.U_TipDoc || '',
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

    const concepto = `Compra según factura N° ${factura.invoiceNumber}`;

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

    // Buscar o crear proveedor en REND_PROV y pre-seleccionar en el selector
    if (factura.nit && factura.companyName) {
      this.provSvc.findOrCreate(factura.nit, factura.companyName).subscribe({
        next: (prov) => {
          // U_CODIGO es el cardCode que usa el selector de proveedor
          const cardCode = (prov as any).U_CODIGO ?? factura.nit;
          const cardName = (prov as any).U_RAZON_SOCIAL ?? factura.companyName;
          this.proveedorSeleccionado = { cardCode, cardName };
          this.form.patchValue({
            prov:    cardName,
            codProv: cardCode,
          });
          this.cdr.markForCheck();
        },
        error: () => {
          // Si falla, al menos mostrar los datos del QR
          this.proveedorSeleccionado = {
            cardCode: factura.nit,
            cardName: factura.companyName,
          };
          this.cdr.markForCheck();
        },
      });
    }

    this.cdr.markForCheck();
    this.toast.success(`Factura N° ${factura.invoiceNumber} cargada — completá cuenta y otros datos`);
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
      ? { cardCode: d.U_RD_CodProv, cardName: d.U_RD_Prov ?? '' }
      : null;
    const values = {
      cuenta:       d.U_RD_Cuenta        ?? '',
      fecha:        d.U_RD_Fecha?.substring(0, 10) ?? '',
      tipoDoc:      d.U_RD_TipoDoc,
      idTipoDoc:    d.U_RD_IdTipoDoc,
      numDocumento: d.U_RD_NumDocumento  ?? '',
      nroAutor:     d.U_RD_NroAutor      ?? '',
      cuf:          d.U_CUF              ?? '',
      ctrl:         d.U_RD_Ctrl          ?? '',
      prov:         d.U_RD_Prov          ?? '',
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
    };
    this.form.reset(values);
    this.initialValues = { ...values };
    // Enganchar motor con la config del tipo de doc del registro que se edita
    this.configDocActivo = this.tiposDocs.find(td => td.U_TipDoc === values.tipoDoc) ?? null;
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
      tipoDoc:      r.tipoDoc,
      numDocumento: r.numDocumento  || undefined,
      nroAutor:     r.nroAutor      || undefined,
      cuf:          r.cuf           || undefined,
      ctrl:         r.ctrl          || undefined,
      prov:         r.prov          || undefined,
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
          this.toast.success(msg);
          this.closeForm();
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSaving = false;
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
          this.toast.success('Documento eliminado');
          this.loadDocs();
          this.cdr.markForCheck();
        },
        error: () => { this.cdr.markForCheck(); },
      });
    });
  }

  // ── Paginación ──────────────────────────────────────────────────

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.documentos.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.documentos.slice(start, start + this.limit);
  }
  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

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