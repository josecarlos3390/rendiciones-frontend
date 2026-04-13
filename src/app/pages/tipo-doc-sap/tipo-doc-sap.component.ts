import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TipoDocSapService, TipoDocSap } from '@services/tipo-doc-sap.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import { AuthService } from '@auth/auth.service';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';

@Component({
  selector:        'app-tipo-doc-sap',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, AppSelectComponent, ActionMenuComponent, FormModalComponent, StatusBadgeComponent, FormFieldComponent],
  templateUrl:     './tipo-doc-sap.component.html',
  styleUrls:       ['./tipo-doc-sap.component.scss'],
})
export class TipoDocSapComponent implements OnInit {

  items:       TipoDocSap[] = [];
  loading      = false;
  loadError    = false;

  showForm     = false;
  editingItem:  TipoDocSap | null = null;

  tipoOptions: SelectOption<string>[] = [
    { value: 'F', label: 'Factura — Impuestos sobre base imponible', icon: '🧾' },
    { value: 'R', label: 'Recibo — Impuestos sobre importe bruto', icon: '📄' },
  ];
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
    private dirtyService: FormDirtyService,
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
    return this.dirtyService.isDirty(this.form, this.initialValues);
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

  // ── Action Menu ──────────────────────────────────────────
  getActionMenuItems(item: TipoDocSap): ActionMenuItem[] {
    if (!this.auth.puedeEditarConf) return [];
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'delete',
        label: 'Eliminar',
        cssClass: 'danger',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
      },
    ];
  }

  onActionClick(actionId: string, item: TipoDocSap): void {
    if (actionId === 'edit') {
      this.openEdit(item);
    } else if (actionId === 'delete') {
      this.remove(item);
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  tipoLabel(t: TipoDocSap): string {
    return t.U_EsTipoF === 'F' ? 'Factura' : 'Recibo';
  }

  tipoCss(t: TipoDocSap): string {
    return t.U_EsTipoF === 'F' ? 'badge badge-primary' : 'badge badge-info';
  }

  activoCss(t: TipoDocSap): string {
    return t.U_Activo === 'Y' ? 'badge badge-success' : 'badge badge-secondary';
  }

  boolCss(value: string): string {
    return value === 'Y' ? 'badge badge-success' : 'badge badge-secondary';
  }

  fieldChanged(field: string): boolean {
    if (!this.editingItem || !this.initialValues) return false;
    return this.form.get(field)?.value !== this.initialValues[field];
  }
}
