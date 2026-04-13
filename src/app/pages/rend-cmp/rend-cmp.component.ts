import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RendCmpService, RendCmp } from '@services/rend-cmp.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';

import { FormFieldComponent } from '@shared/form-field/form-field.component';
import { FormDirtyService } from '@shared/form-dirty';
import { AuthService } from '@auth/auth.service';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';

@Component({
  selector:        'app-rend-cmp',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, SkeletonLoaderComponent, ActionMenuComponent, FormModalComponent, FormFieldComponent],
  templateUrl:     './rend-cmp.component.html',
  styleUrls:       ['./rend-cmp.component.scss'],
})
export class RendCmpComponent implements OnInit {

  items:     RendCmp[] = [];
  loading    = false;
  loadError  = false;

  showForm     = false;
  editingItem: RendCmp | null = null;
  isSaving     = false;
  initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  form!: FormGroup;

  constructor(
    public  auth: AuthService,
    private svc:    RendCmpService,
    private fb:     FormBuilder,
    private toast:  ToastService,
    private cdr:    ChangeDetectorRef,
    private appRef: ApplicationRef,
    private dirtyService: FormDirtyService,
  ) {}

  ngOnInit() {
    this.buildForm();
    setTimeout(() => this.load(), 0);
  }

  private buildForm() {
    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(100)]],
      campo:       ['', [Validators.required, Validators.maxLength(100)]],
    });
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());

  }

  get isDirty(): boolean {
    if (!this.editingItem) return true;
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }


  load() {
    this.loading   = true;
    this.loadError = false;
    this.cdr.markForCheck();

    this.svc.getAll().subscribe({
      next: (data) => {
        this.items   = data;
        this.loading = false;
        this.cdr.markForCheck();
        this.appRef.tick();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
        this.cdr.markForCheck();
        this.appRef.tick();
      },
    });
  }

  openCreate() {
    this.editingItem   = null;
    this.initialValues = null;
    this.form.reset({ descripcion: '', campo: '' });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(item: RendCmp) {
    this.editingItem = item;
    const values = { descripcion: item.U_Descripcion, campo: item.U_Campo };
    this.form.reset(values);
    this.initialValues = { ...values };
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm      = false;
    this.editingItem   = null;
    this.initialValues = null;
    this.isSaving      = false;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const obs = this.editingItem
      ? this.svc.update(this.editingItem.U_IdCampo, raw)
      : this.svc.create(raw);

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeForm();
        this.toast.exito(this.editingItem ? 'Campo actualizado' : 'Campo creado');
        this.load();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message ?? 'Error al guardar');
        this.cdr.markForCheck();
      },
    });
  }

  remove(item: RendCmp) {
    this.openDialog({
      title:        '¿Eliminar campo de mapeo?',
      message:      `Se eliminará "${item.U_Descripcion}" (Campo SAP: ${item.U_Campo}) de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.svc.remove(item.U_IdCampo).subscribe({
        next:  () => { this.toast.exito('Campo eliminado'); this.load(); },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al eliminar'),
      });
    });
  }

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

  getActionMenuItems(item: RendCmp): ActionMenuItem[] {
    if (!this.auth.puedeEditarConf) {
      return [];
    }
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

  onActionClick(actionId: string, item: RendCmp): void {
    switch (actionId) {
      case 'edit':
        this.openEdit(item);
        break;
      case 'delete':
        this.remove(item);
        break;
    }
  }
}
