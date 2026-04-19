import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
  TemplateRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UsersService } from './users.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { AuthService } from '@auth/auth.service';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { User } from '@models/user.model';
import { SapService, DimensionWithRules } from '@services/sap.service';
import { UserFormComponent } from './user-form/user-form.component';
import { UsersFiltersComponent } from './components/users-filters.component';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { StatusBadgeComponent } from '@shared/status-badge';
import { ICON_EDIT, ICON_TOGGLE_ON, ICON_TOGGLE_OFF } from '@common/constants/icons';

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [
    CommonModule, FormsModule,
    SkeletonLoaderComponent, CrudPageHeaderComponent, CrudEmptyStateComponent,
    UserFormComponent, UsersFiltersComponent,
    DataTableComponent, StatusBadgeComponent,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent extends AbstractCrudListComponent<User> implements OnInit {
  readonly store = new CrudListStore<User>({ limit: 10, searchFields: ['U_NomUser', 'U_Login'] });
  tableConfig!: DataTableConfig;

  @ViewChild('usuarioCol', { static: true }) usuarioCol!: TemplateRef<any>;
  @ViewChild('tipoCol',   { static: true }) tipoCol!:   TemplateRef<any>;
  @ViewChild('modulosCol',{ static: true }) modulosCol!:TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;
  @ViewChild('expiraCol', { static: true }) expiraCol!: TemplateRef<any>;

  // Dimensiones SAP (NR1..NR5) — se pasan al form
  dimensions:  DimensionWithRules[] = [];
  loadingDims  = false;

  // Form state
  showForm     = false;
  editingUser: User | null = null;
  isSaving     = false;

  constructor(
    private usersService: UsersService,
    private toast:        ToastService,
    protected auth:       AuthService,
    protected override cdr: ChangeDetectorRef,
    private sapService:   SapService,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {
    this.buildTableConfig();
    Promise.resolve().then(() => {
      this.load();
      this.loadDimensions();
      this._applyActivaFilter();
    });
  }

  protected override getActiva(item: User): boolean {
    return item.U_Estado === '1';
  }

  get loadingState(): 'idle' | 'loading' | 'success' | 'empty' | 'error' {
    if (this.store.loading()) return 'loading';
    if (this.store.loadError()) return 'error';
    return this.store.filtered().length > 0 ? 'success' : 'empty';
  }

  rowClassFn = (item: User): string => {
    return item.U_Estado !== '1' ? 'row-inactive' : '';
  };

  // ── Dimensiones SAP ───────────────────────────────────────
  loadDimensions() {
    this.loadingDims = true;
    this.sapService.getDimensions().subscribe({
      next: (dims) => {
        this.dimensions  = dims;
        this.loadingDims = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDims = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers tabla ─────────────────────────────────────────
  initial(u: User): string {
    return (u.U_NomUser ?? u.U_Login ?? 'U')[0].toUpperCase();
  }

  isActive(u: User): boolean  { return u.U_Estado === '1'; }
  isBlocked(u: User): boolean { return u.U_Estado === '2'; }

  estadoLabel(u: User): string {
    if (u.U_Estado === '1') return 'Activo';
    if (u.U_Estado === '2') return 'Bloqueado';
    return 'Inactivo';
  }

  getBadgeType(u: User): 'success' | 'danger' | 'neutral' {
    if (u.U_Estado === '1') return 'success';
    if (u.U_Estado === '2') return 'danger';
    return 'neutral';
  }

  isExpired(u: User): boolean {
    if (!u.U_FECHAEXPIRACION) return false;
    return new Date(u.U_FECHAEXPIRACION) < new Date();
  }

  // ── CRUD ─────────────────────────────────────────────────
  load(onComplete?: () => void) {
    this.store.load(this.usersService.getAll(), () => {
      this.cdr.markForCheck();
      onComplete?.();
    });
  }

  // ── Formulario ───────────────────────────────────────────
  openNew() {
    this.editingUser = null;
    this.showForm    = true;
    this.cdr.markForCheck();
  }

  openEdit(user: User) {
    this.editingUser = user;
    this.showForm    = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm    = false;
    this.editingUser = null;
    this.cdr.markForCheck();
  }

  onFormSaved(event: { raw: any; isEdit: boolean }) {
    if (this.isSaving) return;
    this.isSaving = true;
    const raw = event.raw;

    const payload: any = {
      name:            raw.name,
      supervisorName:  raw.supervisorName,
      superUser:       Number(raw.superUser),
      appRend:         raw.appRend,
      appConf:         raw.appConf,
      appExtB:         raw.appExtB,
      appUpLA:         raw.appUpLA,
      genDocPre:       raw.genDocPre,
      fijarNr:         raw.fijarNr,
      nr1:             raw.nr1 ?? '',
      nr2:             raw.nr2 ?? '',
      nr3:             raw.nr3 ?? '',
      nr4:             raw.nr4 ?? '',
      nr5:             raw.nr5 ?? '',
      fijarSaldo:      raw.fijarSaldo,
      estado:          String(raw.estado),
      fechaExpiracion: raw.fechaExpiracion || undefined,
    };
    if (raw.password?.trim()) payload.password = raw.password;

    if (this.editingUser) {
      this.usersService.updateByAdmin(this.editingUser.U_IdU, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.exito('Usuario actualizado');
            this.closeForm();
          });
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorHandler.handle(err, 'Error al actualizar usuario', this.cdr);
        },
      });
    } else {
      this.usersService.create({ login: raw.login, password: raw.password, ...payload }).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.exito('Usuario creado');
            this.closeForm();
          });
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorHandler.handle(err, 'Error al crear usuario', this.cdr);
        },
      });
    }
  }

  // ── Dialog ───────────────────────────────────────────────
  confirmToggleStatus(u: User) {
    const isActive = u.U_Estado === '1';
    this.confirmDialog.ask({
      title:        isActive ? 'Inactivar usuario?' : 'Activar usuario?',
      message:      isActive
        ? u.U_NomUser + ' no podra iniciar sesion.'
        : u.U_NomUser + ' podra iniciar sesion nuevamente.',
      confirmLabel: isActive ? 'Si, inactivar' : 'Si, activar',
      type:         isActive ? 'warning' : 'primary',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.usersService.toggleStatus(u.U_IdU, isActive ? '0' : '1', u).subscribe({
        next:  () => {
          this.toast.exito(isActive ? 'Usuario inactivado' : 'Usuario activado');
          this.load();
          this.cdr.markForCheck();
        },
        error: (err: any) => this.errorHandler.handle(err, 'Error al cambiar estado', this.cdr),
      });
    });
  }

  // ── Data Table ───────────────────────────────────────────
  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'U_Login', header: 'Usuario', cellTemplate: this.usuarioCol, mobile: { primary: true, order: 1 } },
        { key: 'U_SuperUser', header: 'Tipo', align: 'center', cellTemplate: this.tipoCol, mobile: { order: 2 } },
        { key: 'modulos', header: 'Módulos', align: 'center', cellTemplate: this.modulosCol, mobile: { hide: true } },
        { key: 'U_Estado', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
        { key: 'U_FECHAEXPIRACION', header: 'Expira', align: 'center', cellTemplate: this.expiraCol, mobile: { hide: true } },
      ],
      showActions: true,
      actions: [
        { id: 'edit', label: 'Editar', icon: ICON_EDIT },
        {
          id: 'activate',
          label: 'Activar',
          icon: ICON_TOGGLE_ON,
          cssClass: 'text-success',
          condition: (u) => !this.isActive(u),
        },
        {
          id: 'deactivate',
          label: 'Desactivar',
          icon: ICON_TOGGLE_OFF,
          cssClass: 'text-danger',
          condition: (u) => this.isActive(u),
        },
      ],
      striped: true,
      hoverable: true,
    };
  }

  onTableAction(event: { action: string; item: User }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'activate':
      case 'deactivate':
        this.confirmToggleStatus(event.item);
        break;
    }
  }
}
