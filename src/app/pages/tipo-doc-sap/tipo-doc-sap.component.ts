import {
  Component, OnInit, ChangeDetectionStrategy,
  TemplateRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { TipoDocSapService, TipoDocSap } from '@services/tipo-doc-sap.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { FormDirtyService } from '@shared/form-dirty';
import { AuthService } from '@auth/auth.service';

import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { DataTableComponent, DataTableConfig, DataTableAction } from '@shared/data-table';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

@Component({
  selector:        'app-tipo-doc-sap',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [
    CommonModule, FormsModule, ReactiveFormsModule,
    AppSelectComponent, FormModalComponent, StatusBadgeComponent,
    FormFieldComponent, CrudPageHeaderComponent, CrudEmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl:     './tipo-doc-sap.component.html',
  styleUrls:       ['./tipo-doc-sap.component.scss'],
})
export class TipoDocSapComponent extends AbstractCrudListComponent<TipoDocSap> implements OnInit {

  @ViewChild('codigoCol',   { static: true }) codigoCol!:   TemplateRef<any>;
  @ViewChild('nombreCol',   { static: true }) nombreCol!:   TemplateRef<any>;
  @ViewChild('tipoCol',     { static: true }) tipoCol!:     TemplateRef<any>;
  @ViewChild('guCol',       { static: true }) guCol!:       TemplateRef<any>;
  @ViewChild('gdCol',       { static: true }) gdCol!:       TemplateRef<any>;
  @ViewChild('ordenCol',    { static: true }) ordenCol!:    TemplateRef<any>;
  @ViewChild('estadoCol',   { static: true }) estadoCol!:   TemplateRef<any>;

  readonly store = new CrudListStore<TipoDocSap>({
    limit: 10,
    searchFields: ['U_Nombre', 'U_EsTipoF'],
  });

  tableConfig!: DataTableConfig;

  showForm     = false;
  editingItem:  TipoDocSap | null = null;
  isSaving     = false;
  initialValues: Record<string, unknown> | null = null;
  form!: FormGroup;

  tipoOptions: SelectOption<string>[] = [
    { value: 'F', label: 'Factura — Impuestos sobre base imponible', icon: '🧾' },
    { value: 'R', label: 'Recibo — Impuestos sobre importe bruto', icon: '📄' },
  ];

  constructor(
    public  auth: AuthService,
    private svc:   TipoDocSapService,
    private fb:    FormBuilder,
    private toast: ToastService,
    private dirtyService: FormDirtyService,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {
    this.buildForm();
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
    this.buildTableConfig();
    Promise.resolve().then(() => {
      this.load();
      this._applyActivaFilter();
    });
  }

  protected override getActiva(item: TipoDocSap): boolean {
    return item.U_Activo === 'Y';
  }

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  get loadingState(): 'idle' | 'loading' | 'success' | 'empty' | 'error' {
    if (this.store.loading()) return 'loading';
    if (this.store.loadError()) return 'error';
    return this.store.filtered().length > 0 ? 'success' : 'empty';
  }

  rowClassFn = (item: TipoDocSap): string => {
    return item.U_Activo === 'N' ? 'row-inactive' : '';
  };

  // ── CRUD ─────────────────────────────────────────────────

  load(onComplete?: () => void) {
    this.store.load(this.svc.getAll(), onComplete);
  }

  // ── Formulario ───────────────────────────────────────────

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
  }

  openCreate() {
    this.editingItem = null;
    this.initialValues = null;
    this.form.reset({
      idTipo: null, nombre: '', esTipoF: 'F',
      permiteGU: false, permiteGD: false,
      orden: this.store.items().length + 1, activo: true,
    });
    this.form.get('idTipo')?.enable();
    this.showForm = true;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm    = false;
    this.editingItem = null;
    this.isSaving    = false;
    this.initialValues = null;
    this.form.get('idTipo')?.enable();
    this.cdr.markForCheck();
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
        this.errorHandler.handle(err, 'Error al guardar', this.cdr);
      },
    });
  }

  confirmDelete(item: TipoDocSap) {
    this.confirmDialog.ask({
      title:        '¿Eliminar tipo de documento?',
      message:      `Se eliminará "${item.U_Nombre}" (ID: ${item.U_IdTipo}) de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.svc.remove(item.U_IdTipo).subscribe({
        next:  () => { this.toast.exito('Tipo eliminado'); this.load(); },
        error: (err) => this.errorHandler.handle(err, 'Error al eliminar', this.cdr),
      });
    });
  }

  // ── Data Table ───────────────────────────────────────────

  private buildTableConfig(): void {
    const actions: DataTableAction[] = this.auth.puedeEditarConf
      ? [
          { id: 'edit',   label: 'Editar',   icon: ICON_EDIT },
          { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'danger' },
        ]
      : [];

    this.tableConfig = {
      columns: [
        { key: 'U_IdTipo',    header: 'Cód. SAP', width: '90px', align: 'center', cellTemplate: this.codigoCol },
        { key: 'U_Nombre',    header: 'Nombre',   cellTemplate: this.nombreCol, mobile: { primary: true } },
        { key: 'U_EsTipoF',   header: 'Tipo',     align: 'center', cellTemplate: this.tipoCol },
        { key: 'U_PermiteGU', header: 'Grossing Up',   align: 'center', cellTemplate: this.guCol,   mobile: { hide: true } },
        { key: 'U_PermiteGD', header: 'Grossing Down', align: 'center', cellTemplate: this.gdCol,   mobile: { hide: true } },
        { key: 'U_Orden',     header: 'Orden',    align: 'center', cellTemplate: this.ordenCol,  mobile: { hide: true } },
        { key: 'U_Activo',    header: 'Estado',   align: 'center', cellTemplate: this.estadoCol },
      ],
      showActions: actions.length > 0,
      actions,
      striped: true,
      hoverable: true,
    };
  }

  onTableAction(event: { action: string; item: TipoDocSap }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'delete':
        this.confirmDelete(event.item);
        break;
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  tipoLabel(t: TipoDocSap): string {
    return t.U_EsTipoF === 'F' ? 'Factura' : 'Recibo';
  }

  fieldChanged(field: string): boolean {
    if (!this.editingItem || !this.initialValues) return false;
    return this.form.get(field)?.value !== this.initialValues[field];
  }
}
