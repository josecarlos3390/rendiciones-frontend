import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ApplicationRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RendCmpService, RendCmp } from '@services/rend-cmp.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field/form-field.component';
import { FormDirtyService } from '@shared/form-dirty';
import { AuthService } from '@auth/auth.service';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

@Component({
  selector:        'app-rend-cmp',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTableComponent, FormModalComponent, FormFieldComponent, CrudPageHeaderComponent, CrudEmptyStateComponent],
  templateUrl:     './rend-cmp.component.html',
  styleUrls:       ['./rend-cmp.component.scss'],
})
export class RendCmpComponent extends AbstractCrudListComponent<RendCmp> implements OnInit {

  readonly store = new CrudListStore<RendCmp>({
    limit: 999,
    searchFields: ['U_Descripcion', 'U_Campo'],
  });

  @ViewChild('campoCol', { static: true }) campoCol!: TemplateRef<any>;

  tableConfig!: DataTableConfig;

  showForm     = false;
  editingItem: RendCmp | null = null;
  isSaving     = false;
  initialValues: Record<string, unknown> | null = null;

  form!: FormGroup;

  constructor(
    public  auth: AuthService,
    private svc:    RendCmpService,
    private fb:     FormBuilder,
    private toast:  ToastService,
    protected override cdr: ChangeDetectorRef,
    private appRef: ApplicationRef,
    private dirtyService: FormDirtyService,
    private confirmDialog: ConfirmDialogService,
  ) {
    super();
  }

  ngOnInit() {
    this.buildForm();
    this.buildTableConfig();
    setTimeout(() => this.load(), 0);
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'U_IdCampo', header: '#', align: 'center' },
        { key: 'U_Descripcion', header: 'Descripción' },
        { key: 'U_Campo', header: 'Campo SAP B1', cellTemplate: this.campoCol },
      ],
      showActions: true,
      actions: [
        { id: 'edit', label: 'Editar', icon: ICON_EDIT },
        { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'text-danger' },
      ],
      striped: true,
      hoverable: true,
    };
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
    this.store.load(this.svc.getAll(), () => {
      this.cdr.markForCheck();
      this.appRef.tick();
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
    this.confirmDialog.ask({
      title:        '¿Eliminar campo de mapeo?',
      message:      `Se eliminará "${item.U_Descripcion}" (Campo SAP: ${item.U_Campo}) de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.svc.remove(item.U_IdCampo).subscribe({
        next:  () => { this.toast.exito('Campo eliminado'); this.load(); },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al eliminar'),
      });
    });
  }

  onTableAction(event: { action: string; item: RendCmp }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'delete':
        this.remove(event.item);
        break;
    }
  }
}
