import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PermisosService } from './permisos.service';
import { ToastService }    from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { Permiso, UsuarioSimple } from '../../models/permiso.model';
import { Perfil } from '../../models/perfil.model';
import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-permisos',
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, AppSelectComponent],
  templateUrl: './permisos.component.html',
  styleUrls: ['./permisos.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class PermisosComponent implements OnInit {

  // ── Datos ────────────────────────────────────────────────
  usuarios:  UsuarioSimple[] = [];
  perfiles:  Perfil[]        = [];
  permisos:  Permiso[]       = [];

  // ── Options cacheadas (evitar nuevo array en cada ciclo de detección)
  usuarioOptions:           SelectOption[] = [];
  perfilDisponiblesOptions: SelectOption[] = [];

  // ── Selección ────────────────────────────────────────────
  selectedUsuarioId: number | null = null;
  selectedPerfilId:  number | null = null;
  loading    = false;
  isSaving   = false;

  // ── Confirm dialog ────────────────────────────────────────
  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    public  auth: AuthService,
    private service: PermisosService,
    private toast:   ToastService,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit() {
    Promise.resolve().then(() => {
      this.loadUsuarios();
      this.loadPerfiles();
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  get selectedUsuario(): UsuarioSimple | null {
    return this.usuarios.find(u => u.U_IdU === this.selectedUsuarioId) ?? null;
  }

  get selectedPerfil(): Perfil | null {
    return this.perfiles.find(p => p.U_CodPerfil === this.selectedPerfilId) ?? null;
  }

  get perfilesDisponibles(): Perfil[] {
    const asignados = new Set(this.permisos.map(p => p.U_IDPERFIL));
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
    if (!this.selectedUsuarioId) { this.permisos = []; return; }
    this.loading = true;
    this.service.getByUsuario(this.selectedUsuarioId).subscribe({
      next: (data) => {
        this.permisos = data;
        this.loading  = false;
        this.rebuildPerfilOptions();
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
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
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al asignar permiso');
          }
          this.cdr.markForCheck();
        },
      });
  }

  // ── Eliminar permiso ──────────────────────────────────────

  confirmRemove(p: Permiso) {
    this.openDialog({
      title:        '¿Eliminar permiso?',
      message:      `Se quitará el acceso al perfil "${p.U_NOMBREPERFIL}" del usuario seleccionado.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.service.remove(p.U_IDUSUARIO, p.U_IDPERFIL).subscribe({
        next:  () => { this.toast.exito('Permiso eliminado'); this.loadPermisos(); this.cdr.markForCheck(); },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al eliminar');
          }
          this.cdr.markForCheck();
        },
      });
    });
  }

  // ── Dialog ────────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }
}