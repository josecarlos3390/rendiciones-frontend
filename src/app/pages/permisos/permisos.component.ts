import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PermisosService } from './permisos.service';
import { ToastService }    from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { Permiso, UsuarioSimple } from '@models/permiso.model';
import { Perfil } from '@models/perfil.model';
import { SelectOption } from '@shared/app-select/app-select.component';
import { AuthService } from '@auth/auth.service';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { StatusBadgeComponent } from '@shared/status-badge';
import { ICON_TRASH } from '@common/constants/icons';

import { PermisosFilterComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-permisos',
  imports: [CommonModule, FormsModule, PermisosFilterComponent, DataTableComponent, StatusBadgeComponent, CrudPageHeaderComponent],
  templateUrl: './permisos.component.html',
  styleUrls: ['./permisos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermisosComponent extends AbstractCrudListComponent<Permiso> implements OnInit {

  readonly store = new CrudListStore<Permiso>({
    limit: 999,
    searchFields: ['U_NOMBREPERFIL'],
  });

  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;

  tableConfig!: DataTableConfig;

  // ── Datos ────────────────────────────────────────────────
  usuarios:  UsuarioSimple[] = [];
  perfiles:  Perfil[]        = [];

  // ── Options cacheadas (evitar nuevo array en cada ciclo de detección)
  usuarioOptions:           SelectOption[] = [];
  perfilDisponiblesOptions: SelectOption[] = [];

  // ── Selección ────────────────────────────────────────────
  selectedUsuarioId: number | null = null;
  selectedPerfilId:  number | null = null;
  isSaving   = false;

  constructor(
    public  auth: AuthService,
    private service: PermisosService,
    private toast:   ToastService,
    protected override cdr: ChangeDetectorRef,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {
    this.buildTableConfig();
    Promise.resolve().then(() => {
      this.loadUsuarios();
      this.loadPerfiles();
    });
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'U_NOMBREPERFIL', header: 'Perfil' },
        { key: 'estado', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
      ],
      showActions: true,
      actions: [
        { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'text-danger' },
      ],
      striped: true,
      hoverable: true,
    };
  }

  // ── Helpers ───────────────────────────────────────────────

  get selectedUsuario(): UsuarioSimple | null {
    return this.usuarios.find(u => u.U_IdU === this.selectedUsuarioId) ?? null;
  }

  get selectedPerfil(): Perfil | null {
    return this.perfiles.find(p => p.U_CodPerfil === this.selectedPerfilId) ?? null;
  }

  get perfilesDisponibles(): Perfil[] {
    const asignados = new Set(this.store.items().map((p: Permiso) => p.U_IDPERFIL));
    return this.perfiles.filter(p => !asignados.has(p.U_CodPerfil));
  }

  // ── Carga ─────────────────────────────────────────────────

  loadUsuarios() {
    this.service.getUsuarios().subscribe({
      next: (data) => { this.usuarios = [...data]; this.rebuildUsuarioOptions(); this.cdr.markForCheck(); },
      error: () => { this.toast.error('Error al cargar usuarios'); this.cdr.markForCheck(); },
    });
  }

  loadPerfiles() {
    this.service.getPerfiles().subscribe({
      next: (data) => { this.perfiles = [...data]; this.rebuildPerfilOptions(); this.cdr.markForCheck(); },
      error: () => { this.toast.error('Error al cargar perfiles'); this.cdr.markForCheck(); },
    });
  }

  private rebuildUsuarioOptions(): void {
    this.usuarioOptions = this.usuarios.map(u => ({
      value: u.U_IdU,
      label: u.U_NomUser || u.U_Login,
      hint:  u.U_Login,
      icon:  '👤',
    }));
  }

  private rebuildPerfilOptions(): void {
    this.perfilDisponiblesOptions = this.perfilesDisponibles.map(p => ({
      value: p.U_CodPerfil,
      label: p.U_NombrePerfil,
      icon:  '🏷️',
    }));
  }

  onUsuarioChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedUsuarioId = val ? Number(val) : null;
    this.selectedPerfilId  = null;
    this.loadPermisos();
  }

  onUsuarioSelect(value: number | null) {
    this.selectedUsuarioId = value;
    this.selectedPerfilId  = null;
    this.rebuildPerfilOptions();
    this.loadPermisos();
  }

  onPerfilChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedPerfilId = val ? Number(val) : null;
  }

  onPerfilSelect(value: number | null) {
    this.selectedPerfilId = value;
  }

  loadPermisos() {
    if (!this.selectedUsuarioId) { this.store.setItems([]); return; }
    this.store.load(this.service.getByUsuario(this.selectedUsuarioId), () => {
      this.rebuildPerfilOptions();
      this.cdr.markForCheck();
    });
  }

  // ── Asignar permiso ───────────────────────────────────────

  asignar() {
    if (!this.selectedUsuarioId || !this.selectedPerfilId || this.isSaving) return;
    this.isSaving = true;
    this.service.create({ idUsuario: this.selectedUsuarioId, idPerfil: this.selectedPerfilId })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.selectedPerfilId = null;
          this.toast.exito('Permiso asignado correctamente');
          this.loadPermisos();
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorHandler.handle(err, 'Error al asignar permiso', this.cdr);
        },
      });
  }

  // ── Eliminar permiso ──────────────────────────────────────

  confirmRemove(p: Permiso) {
    this.confirmDialog.ask({
      title:        '¿Eliminar permiso?',
      message:      `Se quitará el acceso al perfil "${p.U_NOMBREPERFIL}" del usuario seleccionado.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.service.remove(p.U_IDUSUARIO, p.U_IDPERFIL).subscribe({
        next:  () => { this.toast.exito('Permiso eliminado'); this.loadPermisos(); this.cdr.markForCheck(); },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar', this.cdr),
      });
    });
  }

  // ── Acciones tabla ───────────────────────────────────────

  onTableAction(event: { action: string; item: Permiso }): void {
    if (event.action === 'delete') {
      this.confirmRemove(event.item);
    }
  }
}
