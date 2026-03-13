import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';

import { RendDService }  from './rend-d.service';
import { RendMService }  from '../rend-m/rend-m.service';
import { ToastService }  from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { AuthService }   from '../../auth/auth.service';
import { RendM }         from '../../models/rend-m.model';
import { RendD, CreateRendDPayload } from '../../models/rend-d.model';
import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';

@Component({
  standalone: true,
  selector: 'app-rend-d',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ConfirmDialogComponent, PaginatorComponent, AppSelectComponent],
  templateUrl: './rend-d.component.html',
  styleUrls: ['./rend-d.component.scss'],
})
export class RendDComponent implements OnInit {

  idRendicion!: number;
  cabecera:     RendM | null = null;
  documentos:   RendD[]     = [];
  paged:        RendD[]     = [];

  loadingCab = false;
  loadingDocs = false;
  loadError  = false;

  // Paginación
  page       = 1;
  limit      = 10;
  totalPages = 1;

  // Modal
  showForm     = false;
  editingDoc:  RendD | null = null;
  isSaving     = false;

  readonly tipoDocOptions: SelectOption[] = [
    { value: 'FACTURA', label: 'Factura', icon: '🧾' },
    { value: 'RECIBO',  label: 'Recibo',  icon: '📄' },
    { value: 'NOTA',    label: 'Nota',    icon: '📝' },
    { value: 'OTRO',    label: 'Otro',    icon: '📋' },
  ];
  form!:       FormGroup;

  private initialValues: any = null;

  // Confirm dialog
  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  get isAdmin():   boolean { return this.auth.isAdmin; }
  get isReadonly(): boolean {
    if (this.isAdmin) return false;
    return this.cabecera?.U_Estado !== 0;
  }

  get isDirty(): boolean {
    if (!this.editingDoc || !this.initialValues) return true;
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.initialValues);
  }

  // Totales de la tabla
  get totalImporte():  number { return this.documentos.reduce((s, d) => s + (d.U_RD_Importe  ?? 0), 0); }
  get totalDescuento():number { return this.documentos.reduce((s, d) => s + (d.U_RD_Descuento ?? 0), 0); }
  get totalIVA():      number { return this.documentos.reduce((s, d) => s + (d.U_MontoIVA     ?? 0), 0); }
  get totalGeneral():  number { return this.documentos.reduce((s, d) => s + (d.U_RD_Total     ?? 0), 0); }

  constructor(
    private route:      ActivatedRoute,
    private router:     Router,
    private rendDSvc:   RendDService,
    private rendMSvc:   RendMService,
    private toast:      ToastService,
    private fb:         FormBuilder,
    public  auth:       AuthService,
    private cdr:        ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.idRendicion = Number(this.route.snapshot.paramMap.get('id'));
    this.buildForm();
    this.loadCabecera();
    this.loadDocs();
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      // Documento
      concepto:      ['', [Validators.required, Validators.maxLength(200)]],
      fecha:         ['', Validators.required],
      idTipoDoc:     [1,  [Validators.required]],
      tipoDoc:       ['FACTURA', [Validators.required, Validators.maxLength(50)]],
      numDocumento:  ['', Validators.maxLength(20)],
      nroAutor:      ['', Validators.maxLength(250)],
      ctrl:          ['', Validators.maxLength(25)],
      cuf:           ['', Validators.maxLength(250)],
      // Cuenta
      cuenta:        ['', Validators.maxLength(25)],
      nombreCuenta:  ['', Validators.maxLength(250)],
      // Montos
      importe:       [0, [Validators.required, Validators.min(0)]],
      descuento:     [0, [Validators.required, Validators.min(0)]],
      exento:        [0],
      tasaCero:      [0],
      impRet:        [0],
      total:         [0],
      tasa:          [1],
      giftCard:      [0],
      // Impuestos
      montoIVA:      [0, [Validators.required, Validators.min(0)]],
      montoIT:       [0, [Validators.required, Validators.min(0)]],
      montoIUE:      [0, [Validators.required, Validators.min(0)]],
      montoRCIVA:    [0, [Validators.required, Validators.min(0)]],
      ice:           [0, [Validators.required, Validators.min(0)]],
      ctaExento:     ['', [Validators.required, Validators.maxLength(25)]],
      // Proveedor
      nit:           ['0', [Validators.required, Validators.maxLength(50)]],
      codProv:       ['', Validators.maxLength(25)],
      prov:          ['', Validators.maxLength(200)],
      // Extras
      proyecto:      ['', Validators.maxLength(100)],
      partida:       ['', Validators.maxLength(50)],
      nroOT:         ['', Validators.maxLength(250)],
    });
  }

  fieldChanged(name: string): boolean {
    if (!this.editingDoc || !this.initialValues) return false;
    return this.form.get(name)?.value !== this.initialValues[name];
  }

  // ── Carga ────────────────────────────────────────────────

  loadCabecera() {
    this.loadingCab = true;
    this.rendMSvc.getOne(this.idRendicion).subscribe({
      next:  c  => { this.cabecera = c; this.loadingCab = false; this.cdr.detectChanges(); },
      error: () => { this.loadingCab = false; },
    });
  }

  loadDocs() {
    this.loadingDocs = true;
    this.loadError   = false;
    this.rendDSvc.getAll(this.idRendicion).subscribe({
      next: (data) => {
        this.documentos  = data;
        this.loadingDocs = false;
        this.updatePaging();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingDocs = false;
        this.loadError   = true;
      },
    });
  }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.documentos.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.documentos.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  // ── Modal ────────────────────────────────────────────────

  openNew() {
    this.editingDoc    = null;
    this.initialValues = null;
    this.form.reset({
      concepto: '', fecha: '', idTipoDoc: 1, tipoDoc: 'FACTURA',
      numDocumento: '', nroAutor: '', ctrl: '', cuf: '',
      cuenta: '', nombreCuenta: '',
      importe: 0, descuento: 0, exento: 0, tasaCero: 0,
      impRet: 0, total: 0, tasa: 1, giftCard: 0,
      montoIVA: 0, montoIT: 0, montoIUE: 0, montoRCIVA: 0, ice: 0,
      ctaExento: '', nit: '0', codProv: '', prov: '',
      proyecto: '', partida: '', nroOT: '',
    });
    this.showForm = true;
  }

  openEdit(d: RendD) {
    this.editingDoc = d;
    const values = {
      concepto:     d.U_RD_Concepto,
      fecha:        d.U_RD_Fecha?.substring(0, 10) ?? '',
      idTipoDoc:    d.U_RD_IdTipoDoc,
      tipoDoc:      d.U_RD_TipoDoc,
      numDocumento: d.U_RD_NumDocumento ?? '',
      nroAutor:     d.U_RD_NroAutor     ?? '',
      ctrl:         d.U_RD_Ctrl         ?? '',
      cuf:          d.U_CUF             ?? '',
      cuenta:       d.U_RD_Cuenta       ?? '',
      nombreCuenta: d.U_RD_NombreCuenta ?? '',
      importe:      d.U_RD_Importe,
      descuento:    d.U_RD_Descuento,
      exento:       d.U_RD_Exento       ?? 0,
      tasaCero:     d.U_RD_TasaCero     ?? 0,
      impRet:       d.U_RD_ImpRet       ?? 0,
      total:        d.U_RD_Total        ?? 0,
      tasa:         d.U_TASA            ?? 1,
      giftCard:     d.U_GIFTCARD        ?? 0,
      montoIVA:     d.U_MontoIVA,
      montoIT:      d.U_MontoIT,
      montoIUE:     d.U_MontoIUE,
      montoRCIVA:   d.U_MontoRCIVA,
      ice:          d.U_ICE,
      ctaExento:    d.U_CTAEXENTO,
      nit:          d.U_RD_NIT,
      codProv:      d.U_RD_CodProv ?? '',
      prov:         d.U_RD_Prov    ?? '',
      proyecto:     d.U_RD_Proyecto ?? '',
      partida:      d.U_RD_Partida  ?? '',
      nroOT:        d.U_RD_NRO_OT  ?? '',
    };
    this.form.reset(values);
    this.initialValues = { ...values };
    this.showForm = true;
  }

  closeForm() {
    this.showForm      = false;
    this.editingDoc    = null;
    this.initialValues = null;
    this.form.reset();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: CreateRendDPayload = {
      concepto:     raw.concepto,
      fecha:        raw.fecha,
      idTipoDoc:    Number(raw.idTipoDoc),
      tipoDoc:      raw.tipoDoc,
      numDocumento: raw.numDocumento  || undefined,
      nroAutor:     raw.nroAutor      || undefined,
      ctrl:         raw.ctrl          || undefined,
      cuf:          raw.cuf           || undefined,
      cuenta:       raw.cuenta        || undefined,
      nombreCuenta: raw.nombreCuenta  || undefined,
      importe:      Number(raw.importe),
      descuento:    Number(raw.descuento),
      exento:       Number(raw.exento),
      tasaCero:     Number(raw.tasaCero),
      impRet:       Number(raw.impRet),
      total:        Number(raw.total),
      tasa:         Number(raw.tasa),
      giftCard:     Number(raw.giftCard),
      montoIVA:     Number(raw.montoIVA),
      montoIT:      Number(raw.montoIT),
      montoIUE:     Number(raw.montoIUE),
      montoRCIVA:   Number(raw.montoRCIVA),
      ice:          Number(raw.ice),
      ctaExento:    raw.ctaExento,
      nit:          raw.nit,
      codProv:      raw.codProv  || undefined,
      prov:         raw.prov     || undefined,
      proyecto:     raw.proyecto || undefined,
      partida:      raw.partida  || undefined,
      nroOT:        raw.nroOT    || undefined,
    };

    if (this.editingDoc) {
      this.rendDSvc.update(this.idRendicion, this.editingDoc.U_RD_IdRD, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Documento actualizado');
          this.closeForm();
          this.loadDocs();
        },
        error: () => {
          this.isSaving = false;
        },
      });
    } else {
      this.rendDSvc.create(this.idRendicion, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Documento agregado');
          this.closeForm();
          this.loadDocs();
        },
        error: () => {
          this.isSaving = false;
        },
      });
    }
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(d: RendD) {
    this.openDialog({
      title:        '¿Eliminar documento?',
      message:      `Se eliminará el documento N° ${d.U_RD_IdRD} — "${d.U_RD_Concepto}".`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.rendDSvc.remove(this.idRendicion, d.U_RD_IdRD).subscribe({
        next:  () => { this.toast.success('Documento eliminado'); this.loadDocs(); },
        error: () => {},
      });
    });
  }

  // ── Dialog ───────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

  // ── Helpers ──────────────────────────────────────────────

  formatDate(ts: string): string { return ts?.substring(0, 10) ?? ''; }

  goBack() { this.router.navigate(['/rend-m']); }
}