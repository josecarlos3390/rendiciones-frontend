import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ApplicationRef, NgZone } from '@angular/core';
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
import { AuthService }        from '../../auth/auth.service';
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
  ],
  templateUrl: './rend-d.component.html',
  styleUrls:   ['./rend-d.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  isSaving    = false;
  activeTab: 'doc' | 'montos' | 'impuestos' = 'doc';

  // Modal selector de modo (QR / Manual / URL / PDF)
  showModeSelector = false;

  // Modal URL
  showUrlModal  = false;
  urlInput      = '';

  // Modal PDF
  showPdfModal  = false;
  pdfFile:      File | null = null;
  pdfFileName   = '';

  // Modal escáner QR
  showQrScanner   = false;
  qrStream:       MediaStream | null = null;
  qrError:        string | null = null;
  qrScanning      = false;

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

  get totalImporte():   number { return this.documentos.reduce((s, d) => s + (d.U_RD_Importe  ?? 0), 0); }
  get totalDescuento(): number { return this.documentos.reduce((s, d) => s + (d.U_RD_Descuento ?? 0), 0); }
  get totalIVA():       number { return this.documentos.reduce((s, d) => s + (d.U_MontoIVA     ?? 0), 0); }
  get totalGeneral():   number { return this.documentos.reduce((s, d) => s + (d.U_RD_Total     ?? 0), 0); }

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
    return this.configDocActivo?.U_EXENTOpercent === -1;
  }

  /** true cuando el exento es % fijo de config (> 0) — se muestra calculado */
  get exentoEsFijo(): boolean {
    const pct = this.configDocActivo?.U_EXENTOpercent ?? 0;
    return pct > 0;
  }

  /** true cuando Tasas es variable (-1) — el usuario digita el monto */
  get tasaEsVariable(): boolean {
    return this.configDocActivo?.U_TASA === -1;
  }

  /** true cuando Tasas tiene valor fijo (distinto de -1) — campo deshabilitado */
  get tasaEsFijo(): boolean {
    return !!this.configDocActivo && this.configDocActivo.U_TASA !== -1;
  }

  /** true cuando ICE es variable (-1) — el usuario digita el monto */
  get iceEsVariable(): boolean {
    return this.configDocActivo?.U_ICE === -1;
  }

  /** true cuando ICE tiene valor fijo (distinto de -1) — campo deshabilitado */
  get iceEsFijo(): boolean {
    return !!this.configDocActivo && this.configDocActivo.U_ICE !== -1;
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
    private appRef:         ApplicationRef,
    private zone:           NgZone,
  ) {}

  ngOnInit() {
    this.idRendicion = Number(this.route.snapshot.paramMap.get('id'));
    this.buildForm();
    // Promise.resolve() difiere loadAll() al siguiente microtask,
    // garantizando que Angular termine de inicializar el árbol de CD
    // antes de que observables sincrónicos (shareReplay) disparen markForCheck.
    Promise.resolve().then(() => this.loadAll());
  }

  // ── Carga ─────────────────────────────────────────────────────

  /** Fuerza detección de cambios desde fuera de la zona Angular si es necesario */
  private _tick() {
    this.zone.run(() => this.cdr.markForCheck());
  }

  private loadAll() {
    this.loadingCab  = true;
    this.loadingDocs = true;
    this.loadError   = false;
    this._tick();

    this.rendMSvc.getOne(this.idRendicion).pipe(
      switchMap((cab) => {
        this.cabecera   = cab;
        this.loadingCab = false;
        this._tick();
        return forkJoin({
          perfil:      this.perfilesSvc.getOne(cab.U_IdPerfil),
          documentos:  this.rendDSvc.getAll(this.idRendicion),
          tiposDocs:   this.docsSvc.getByPerfil(cab.U_IdPerfil),
          dimensiones: this.sapSvc.getDimensions().pipe(
            catchError(() => of([])),
          ),
        });
      }),
    ).subscribe({
      next: ({ perfil, documentos, tiposDocs, dimensiones }) => {
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
              this._tick();
            },
            error: () => { this._tick(); },
          });
        }

        this.normasActivas = dimensiones.slice(0, 3).map((dim: any, idx: number) => ({
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
        this.updatePaging();
        this._tick();
      },
      error: () => {
        this.loadingCab  = false;
        this.loadingDocs = false;
        this.loadError   = true;
        this._tick();
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
      tasa:       doc.U_TASA === -1 ? this.form.get('tasa')?.value : (doc.U_TASA ?? 0),
      // Si ICE en config es -1, mantener el valor digitado; si no, usar el de la config
      ice:        doc.U_ICE  === -1 ? this.form.get('ice')?.value  : (doc.U_ICE  ?? 0),
    }, { emitEvent: false });

    this.configDocActivo = doc;
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
    if (cfg?.U_EXENTOpercent === -1) {
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
   * Grossing Down(U_TipoCalc = '1'): se implementará en una segunda iteración.
   *
   * Campos con valor -1 en la config → se usa el valor digitado en el formulario.
   * Campos con valor  0 en la config → impuesto no aplica, resultado = 0.
   */
  private _recalcular() {
    const cfg = this.configDocActivo;
    if (!cfg) return;

    const idTipoDoc = Number(cfg.U_IdTipoDoc);

    // Solo aplica para Factura (1), Sin Asignar (10) y Recibo (4)
    if (![1, 4, 10].includes(idTipoDoc)) return;

    const r = this.form.getRawValue();

    const importe   = this._n(r.importe);
    const descuento = this._n(r.descuento); // solo informativo, NO reduce base

    // ── Exento ────────────────────────────────────────────────────
    // -1  → variable: el usuario digita el monto directamente en el campo
    //  0  → no aplica
    // >0  → porcentaje fijo de configuración: se calcula sobre el importe
    const exento = cfg.U_EXENTOpercent === -1
      ? this._n(r.exento)                              // valor digitado en Bs
      : cfg.U_EXENTOpercent > 0
        ? this._round(importe * (cfg.U_EXENTOpercent / 100))  // % sobre importe
        : 0;

    // ── Tasa y ICE ────────────────────────────────────────────────
    // -1 → variable (valor digitado); cualquier otro → fijo desde config en Bs
    const tasa     = cfg.U_TASA  === -1 ? this._n(r.tasa)    : (cfg.U_TASA  ?? 0);
    const ice      = cfg.U_ICE   === -1 ? this._n(r.ice)     : (cfg.U_ICE   ?? 0);
    const tasaCero = this._n(r.tasaCero);
    const giftCard = this._n(r.giftCard);

    // ── Base imponible ────────────────────────────────────────────
    const baseImponible = importe - tasa - tasaCero - giftCard - exento - ice;

    let montoIVA   = 0;
    let montoIT    = 0;
    let montoIUE   = 0;
    let montoRCIVA = 0;

    const tipoCalc = String(cfg.U_TipoCalc);

    if (idTipoDoc === 1 || idTipoDoc === 10) {
      // ── Factura / Sin Asignar: Grossing Up ──
      montoIVA   = this._calcImpuesto(baseImponible, cfg.U_IVApercent);
      montoIT    = this._calcImpuesto(baseImponible, cfg.U_ITpercent);
      montoIUE   = this._calcImpuesto(baseImponible, cfg.U_IUEpercent);
      montoRCIVA = this._calcImpuesto(baseImponible, cfg.U_RCIVApercent);
    } else if (idTipoDoc === 4) {
      if (tipoCalc === '0') {
        // Grossing Up para Recibo
        montoIVA   = this._calcImpuesto(baseImponible, cfg.U_IVApercent);
        montoIT    = this._calcImpuesto(baseImponible, cfg.U_ITpercent);
        montoIUE   = this._calcImpuesto(baseImponible, cfg.U_IUEpercent);
        montoRCIVA = this._calcImpuesto(baseImponible, cfg.U_RCIVApercent);
      } else {
        // Grossing Down — se implementa en siguiente iteración
        montoIVA = montoIT = montoIUE = montoRCIVA = 0;
      }
    }

    const impRet = this._round(montoIVA + montoIT + montoIUE + montoRCIVA);
    const total  = this._round(importe - impRet);

    // Actualizar campos calculados sin disparar otro ciclo de valueChanges
    this.form.patchValue({
      montoIVA:   this._round(montoIVA),
      montoIT:    this._round(montoIT),
      montoIUE:   this._round(montoIUE),
      montoRCIVA: this._round(montoRCIVA),
      impRet,
      total,
      // Propagar exento calculado al campo del formulario si viene de %
      ...(cfg.U_EXENTOpercent > 0 ? { exento: this._round(exento) } : {}),
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
    this.showUrlModal = false;
    this.urlInput = '';
    this.cdr.markForCheck();
  }

  confirmarUrl() {
    if (!this.urlInput.trim()) return;
    this.showUrlModal = false;
    // Abre el formulario manual pre-listo; el campo URL se puede extender al modelo después
    this._openNewForm();
    this.cdr.markForCheck();
  }

  elegirPdf() {
    this.showModeSelector = false;
    this.pdfFile = null;
    this.pdfFileName = '';
    this.showPdfModal = true;
    this.cdr.markForCheck();
  }

  closePdfModal() {
    this.showPdfModal = false;
    this.pdfFile = null;
    this.pdfFileName = '';
    this.cdr.markForCheck();
  }

  onPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pdfFile = file;
    this.pdfFileName = file?.name ?? '';
    this.cdr.markForCheck();
  }

  confirmarPdf() {
    if (!this.pdfFile) return;
    this.showPdfModal = false;
    // Abre el formulario manual; integración de extracción PDF se puede conectar al servicio después
    this._openNewForm();
    this.cdr.markForCheck();
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
      tasa: primer?.U_TASA === -1 ? 0 : (primer?.U_TASA ?? 0),
      giftCard: 0, tasaCero: 0,
      ice: primer?.U_ICE === -1 ? 0 : (primer?.U_ICE ?? 0),
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

  async abrirQrScanner() {
    this.qrError    = null;
    this.qrScanning = true;
    this.showQrScanner = true;
    this.cdr.markForCheck();

    try {
      this.qrStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      // Asignar el stream al elemento <video> tras el render
      requestAnimationFrame(() => {
        const video = document.getElementById('qr-video') as HTMLVideoElement;
        if (video && this.qrStream) {
          video.srcObject = this.qrStream;
          video.play();
        }
        this.qrScanning = true;
        this.cdr.markForCheck();
      });
    } catch (err: any) {
      this.qrError    = 'No se pudo acceder a la cámara. Verificá los permisos del navegador.';
      this.qrScanning = false;
      this.cdr.markForCheck();
    }
  }

  cerrarQrScanner() {
    this.qrStream?.getTracks().forEach(t => t.stop());
    this.qrStream    = null;
    this.qrScanning  = false;
    this.showQrScanner = false;
    this.cdr.markForCheck();
  }

  // Placeholder — aquí se procesará el QR capturado en el futuro
  onQrCaptured(data: string) {
    this.cerrarQrScanner();
    // TODO: parsear `data` y pre-cargar el formulario
    this._openNewForm();
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
    if (this.configDocActivo) {
      this._engancharCalculos();
      this._recalcular();
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

  goBack() { this.router.navigate(['/rend-m']); }
}