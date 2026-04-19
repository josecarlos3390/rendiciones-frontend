import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BreakpointService } from '@services/breakpoint.service';

import { PerfilesService } from './perfiles.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { AppConfigService } from '@services/app-config.service';
import { AuthService } from '@auth/auth.service';
import { FormModalComponent } from '@shared/form-modal';
import { FormModalTab } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import {
  Perfil, CreatePerfilPayload,
  PRO_CAR_OPTIONS, CUE_CAR_OPTIONS, EMP_CAR_OPTIONS,
} from '@models/perfil.model';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

import { PerfilesFilterComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-perfiles',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppSelectComponent, FormModalComponent, FormFieldComponent, DataTableComponent, PerfilesFilterComponent, CrudPageHeaderComponent, CrudEmptyStateComponent],
  templateUrl: './perfiles.component.html',
  styleUrls: ['./perfiles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilesComponent extends AbstractCrudListComponent<Perfil> implements OnInit, OnDestroy {
  @ViewChild('codCol', { static: true }) codCol!: TemplateRef<any>;
  @ViewChild('nombreCol', { static: true }) nombreCol!: TemplateRef<any>;
  @ViewChild('monedaCol', { static: true }) monedaCol!: TemplateRef<any>;
  @ViewChild('lineasCol', { static: true }) lineasCol!: TemplateRef<any>;
  @ViewChild('proveedoresCol', { static: true }) proveedoresCol!: TemplateRef<any>;
  @ViewChild('cuentasCol', { static: true }) cuentasCol!: TemplateRef<any>;
  @ViewChild('empleadosCol', { static: true }) empleadosCol!: TemplateRef<any>;

  store = new CrudListStore<Perfil>({ limit: 5, searchFields: ['U_NombrePerfil'] });

  tableConfig!: DataTableConfig;

  showForm      = false;
  editingPerfil: Perfil | null = null;
  isSaving      = false;
  form!: FormGroup;

  initialValues: Record<string, unknown> | null = null;

  // ── Tabs para móvil ──────────────────────────────────────────
  isMobile = false;
  activeTab = 'datos';
  readonly mobileTabs: FormModalTab[] = [
    { id: 'datos',   label: 'Datos del Perfil' },
    { id: 'filtros', label: 'Filtros' },
  ];
  private mobileSub?: Subscription;

  // Opciones para selects
  // Opciones por defecto — se actualizan con appConfig pero nunca quedan vacías
  monedaOptions: SelectOption[] = [
    { value: '0', label: 'Moneda Local (BS)' },
    { value: '1', label: 'Moneda Sistema (USD)' },
  ];
  readonly proCarOptions = PRO_CAR_OPTIONS;
  readonly cueCarOptions = CUE_CAR_OPTIONS;
  readonly empCarOptions = EMP_CAR_OPTIONS;

  /** Recarga monedaOptions desde el servidor y actualiza la vista */
  private async reloadMonedaOptions(): Promise<void> {
    await this.appConfig.load();
    this.monedaOptions = this.appConfig.monedaOptions as SelectOption[];
    this.cdr.markForCheck();
  }

  readonly siNoOptions: SelectOption[] = [
    { value: 0, label: 'NO', icon: '✗' },
    { value: 1, label: 'SÍ', icon: '✓' },
  ];

  readonly lineasOptions: SelectOption[] = [
    { value: 3, label: '3 líneas' },
    { value: 5, label: '5 líneas' },
    { value: 10, label: '10 líneas' },
    { value: 15, label: '15 líneas' },
    { value: 20, label: '20 líneas' },
    { value: 25, label: '25 líneas' },
    { value: 30, label: '30 líneas' },
    { value: 50, label: '50 líneas' },
  ];

  constructor(
    public  auth: AuthService,
    private perfilesService: PerfilesService,
    private toast:           ToastService,
    private fb:              FormBuilder,
    protected override cdr:  ChangeDetectorRef,
    private appConfig:       AppConfigService,
    private dirtyService:    FormDirtyService,
    private breakpoint:      BreakpointService,
    private confirmDialog:   ConfirmDialogService,
    private errorHandler:    HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {
    this.buildForm();
    this.buildTableConfig();
    this.mobileSub = this.breakpoint.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
      this.cdr.markForCheck();
    });
    // Con OnPush, el botón no se habilita automáticamente al escribir.
    // statusChanges fuerza la re-evaluación cuando cambia form.valid.
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
    Promise.resolve().then(() => {
      this.load();
      this.reloadMonedaOptions();
    });
  }

  ngOnDestroy(): void {
    this.mobileSub?.unsubscribe();
  }

  get activeTabs(): FormModalTab[] {
    return this.isMobile ? this.mobileTabs : [];
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
  }

  get isDatosTab(): boolean   { return !this.isMobile || this.activeTab === 'datos'; }
  get isFiltrosTab(): boolean { return !this.isMobile || this.activeTab === 'filtros'; }

  // ── Helpers ──────────────────────────────────────────────

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  monedaLabel(val: string): string {
    return this.monedaOptions.find(o => o.value === val)?.label ?? val;
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      nombrePerfil:   ['', [Validators.required, Validators.maxLength(300)]],
      trabaja:        ['0'],
      perCtaBl:       [0],
      cntLineas:      [10],
      controlPartida: [0],
      proCar:         ['TODOS'],
      proTexto:       ['', Validators.maxLength(25)],
      cueCar:         ['TODOS'],
      cueTexto:       ['', Validators.maxLength(30)],
      empCar:         ['EMPIEZA'],
      empTexto:       ['', Validators.maxLength(10)],
      bolivianos:     [0],
      sucursal:       [0],
    });
  }

  // ── CRUD ─────────────────────────────────────────────────

  load(onComplete?: () => void) {
    this.store.load(this.perfilesService.getAll(), onComplete);
  }

  // ── Formulario ───────────────────────────────────────────

  openNew() {
    this.reloadMonedaOptions();
    this.editingPerfil = null;
    this.initialValues = null; // isDirty retorna true cuando editingPerfil es null
    this.activeTab = 'datos';
    this.form.reset({
      nombrePerfil: '', trabaja: '0', perCtaBl: 0,
      cntLineas: 10, controlPartida: 0,
      proCar: 'TODOS', proTexto: '',
      cueCar: 'TODOS', cueTexto: '',
      empCar: 'EMPIEZA', empTexto: '',
      bolivianos: 0, sucursal: 0,
    });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  // ── Tabla ────────────────────────────────────────────────
  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'U_CodPerfil', header: 'Cód.', align: 'center', cellTemplate: this.codCol },
        { key: 'U_NombrePerfil', header: 'Nombre Perfil', cellTemplate: this.nombreCol, mobile: { primary: true } },
        { key: 'U_Trabaja', header: 'Moneda', align: 'center', cellTemplate: this.monedaCol },
        { key: 'U_CntLineas', header: 'Líneas', align: 'center', cellTemplate: this.lineasCol, mobile: { hide: true } },
        { key: 'U_PRO_CAR', header: 'Proveedores', cellTemplate: this.proveedoresCol, mobile: { hide: true } },
        { key: 'U_CUE_CAR', header: 'Cuentas', cellTemplate: this.cuentasCol, mobile: { hide: true } },
        { key: 'U_EMP_CAR', header: 'Empleados', cellTemplate: this.empleadosCol, mobile: { hide: true } },
      ],
      showActions: true,
      actions: [
        { id: 'edit', label: 'Editar', icon: ICON_EDIT },
        { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'danger' },
      ],
      striped: true,
      hoverable: true,
    };
  }

  onTableAction(event: { action: string; item: Perfil }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'delete':
        this.confirmDelete(event.item);
        break;
    }
  }

  openEdit(p: Perfil) {
    this.reloadMonedaOptions();
    this.editingPerfil = p;
    this.activeTab = 'datos';
    this.form.reset({
      nombrePerfil:   p.U_NombrePerfil   ?? '',
      trabaja:        p.U_Trabaja         ?? '0',
      perCtaBl:       p.U_Per_CtaBl      ?? 0,
      cntLineas:      p.U_CntLineas      ?? 10,
      controlPartida: p.U_ControlPartida ?? 0,
      proCar:         p.U_PRO_CAR        ?? 'TODOS',
      proTexto:       p.U_PRO_Texto      ?? '',
      cueCar:         p.U_CUE_CAR        ?? 'TODOS',
      cueTexto:       p.U_CUE_Texto      ?? '',
      empCar:         p.U_EMP_CAR        ?? 'EMPIEZA',
      empTexto:       p.U_EMP_TEXTO      ?? '',
      bolivianos:     p.U_Bolivianos     ?? 0,
      sucursal:       p.U_SUCURSAL       ?? 0,
    });
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm      = false;
    this.editingPerfil = null;
    this.initialValues = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      if (this.isMobile) {
        const datosFields = ['nombrePerfil'];
        const hasDatosError = datosFields.some(f => this.form.get(f)?.invalid);
        this.activeTab = hasDatosError ? 'datos' : 'filtros';
        this.cdr.markForCheck();
      }
      return;
    }
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: CreatePerfilPayload = {
      nombrePerfil:   raw.nombrePerfil,
      trabaja:        raw.trabaja,
      perCtaBl:       Number(raw.perCtaBl),
      cntLineas:      Number(raw.cntLineas),
      controlPartida: Number(raw.controlPartida),
      proCar:         raw.proCar,
      proTexto:       raw.proTexto ?? '',
      cueCar:         raw.cueCar,
      cueTexto:       raw.cueTexto ?? '',
      empCar:         raw.empCar,
      empTexto:       raw.empTexto ?? '',
      bolivianos:     Number(raw.bolivianos),
      sucursal:       Number(raw.sucursal),
    };

    if (this.editingPerfil) {
      this.perfilesService.update(this.editingPerfil.U_CodPerfil, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.exito('Perfil actualizado');
            this.closeForm();
          });
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorHandler.handle(err, 'Error al actualizar perfil', this.cdr);
        },
      });
    } else {
      this.perfilesService.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.exito('Perfil creado');
            this.closeForm();
          });
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorHandler.handle(err, 'Error al crear perfil', this.cdr);
        },
      });
    }
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(p: Perfil) {
    this.confirmDialog.ask({
      title:        '¿Eliminar perfil?',
      message:      `Se eliminará el perfil "${p.U_NombrePerfil}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.perfilesService.remove(p.U_CodPerfil).subscribe({
        next:  () => { this.toast.exito('Perfil eliminado'); this.load(); this.cdr.markForCheck(); },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar perfil', this.cdr),
      });
    });
  }
}
