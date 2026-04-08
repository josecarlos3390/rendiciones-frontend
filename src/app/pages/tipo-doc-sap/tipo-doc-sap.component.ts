import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TipoDocSapService, TipoDocSap } from '../../services/tipo-doc-sap.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector:        'app-tipo-doc-sap',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports:         [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl:     './tipo-doc-sap.component.html',
  styleUrls:       ['./tipo-doc-sap.component.scss'],
})
export class TipoDocSapComponent implements OnInit {

  items:       TipoDocSap[] = [];
  loading      = false;
  loadError    = false;

  showForm     = false;
  editingItem:  TipoDocSap | null = null;
  isSaving     = false;
  initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  form!: FormGroup;

  constructor(
    public  auth: AuthService,
    private svc:   TipoDocSapService,
    private fb:    FormBuilder,
    private toast: ToastService,
    private cdr:   ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.buildForm();
    setTimeout(() => this.load(), 0);
  }

  load() {
    this.loading   = true;
    this.loadError = false;
    this.svc.getAll().subscribe({
      next: (data) => {
        this.items   = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
        this.cdr.markForCheck();
      },
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      idTipo:    [null, [Validators.required, Validators.min(0)]],
      nombre:    ['',   [Validators.required, Validators.maxLength(100)]],
      esTipoF:   ['F',  Validators.required],
      permiteGU: [false],
      permiteGD: [false],
      orden:     [0,    Validators.required],
      activo:    [true],
    });
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
  }

  get isDirty(): boolean {
    if (!this.editingItem) return true;
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.initialValues);
  }

  openCreate() {
    this.editingItem = null;
    this.form.reset({
      idTipo: null, nombre: '', esTipoF: 'F',
      permiteGU: false, permiteGD: false, orden: this.items.length + 1, activo: true,
    });
    this.form.get('idTipo')?.enable();
    this.initialValues = null;
    this.showForm = true;
  }

  openEdit(item: TipoDocSap) {
    this.editingItem = item;
    this.form.reset({
      idTipo:    item.U_IdTipo,
      nombre:    item.U_Nombre,
      esTipoF:   item.U_EsTipoF,
      permiteGU: item.U_PermiteGU === 'Y',
      permiteGD: item.U_PermiteGD === 'Y',
      orden:     item.U_Orden,
      activo:    item.U_Activo === 'Y',
    });
    this.form.get('idTipo')?.disable();
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
  }

  closeForm() {
    this.showForm    = false;
    this.editingItem = null;
    this.isSaving    = false;
    this.form.get('idTipo')?.enable();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const obs = this.editingItem
      ? this.svc.update(this.editingItem.U_IdTipo, {
          nombre: raw.nombre, esTipoF: raw.esTipoF,
          permiteGU: raw.permiteGU, permiteGD: raw.permiteGD,
          orden: Number(raw.orden), activo: raw.activo,
        })
      : this.svc.create({
          idTipo: Number(raw.idTipo), nombre: raw.nombre, esTipoF: raw.esTipoF,
          permiteGU: raw.permiteGU, permiteGD: raw.permiteGD,
          orden: Number(raw.orden), activo: raw.activo,
        });

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeForm();
        this.toast.exito(this.editingItem ? 'Tipo actualizado' : 'Tipo creado');
        this.load();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message ?? 'Error al guardar');
        this.cdr.markForCheck();
      },
    });
  }

  remove(item: TipoDocSap) {
    this.openDialog({
      title:        '¿Eliminar tipo de documento?',
      message:      `Se eliminará "${item.U_Nombre}" (ID: ${item.U_IdTipo}) de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.svc.remove(item.U_IdTipo).subscribe({
        next:  () => { this.toast.exito('Tipo eliminado'); this.load(); },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al eliminar'),
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
  tipoLabel(t: TipoDocSap): string {
    return t.U_EsTipoF === 'F' ? 'Factura' : 'Recibo';
  }

  tipoCss(t: TipoDocSap): string {
    return t.U_EsTipoF === 'F' ? 'badge-factura' : 'badge-recibo';
  }

  activoCss(t: TipoDocSap): string {
    return t.U_Activo === 'Y' ? 'status-badge status-closed' : 'status-badge status-secondary';
  }

  fieldChanged(field: string): boolean {
    if (!this.editingItem || !this.initialValues) return false;
    return this.form.get(field)?.value !== this.initialValues[field];
  }
}