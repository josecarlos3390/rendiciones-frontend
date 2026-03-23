import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RendCmpService, RendCmp } from '../../services/rend-cmp.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';

@Component({
  selector:        'app-rend-cmp',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, SkeletonLoaderComponent],
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
    private svc:    RendCmpService,
    private fb:     FormBuilder,
    private toast:  ToastService,
    private cdr:    ChangeDetectorRef,
    private appRef: ApplicationRef,
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
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.initialValues);
  }

  fieldChanged(field: string): boolean {
    if (!this.editingItem || !this.initialValues) return false;
    return this.form.get(field)?.value !== this.initialValues[field];
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
        this.toast.success(this.editingItem ? 'Campo actualizado' : 'Campo creado');
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
        next:  () => { this.toast.success('Campo eliminado'); this.load(); },
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
}