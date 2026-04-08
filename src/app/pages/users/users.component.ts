import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UsersService } from './users.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../auth/auth.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';
import { SearchInputComponent } from '../../shared/debounce';
import { User } from '../../models/user.model';
import { SapService, DimensionWithRules } from '../../services/sap.service';
import { UserFormComponent } from './user-form/user-form.component';

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [
    CommonModule, FormsModule,
    ConfirmDialogComponent, PaginatorComponent,
    SkeletonLoaderComponent, UserFormComponent,
    SearchInputComponent,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class UsersComponent implements OnInit {
  users:    User[] = [];
  filtered: User[] = [];
  paged:    User[] = [];
  search   = '';
  loading   = false;
  loadError = false;

  // Dimensiones SAP (NR1..NR5) — se pasan al form
  dimensions:  DimensionWithRules[] = [];
  loadingDims  = false;

  // Paginación
  page       = 1;
  limit      = 10;
  totalPages = 1;

  // Form state
  showForm     = false;
  editingUser: User | null = null;
  isSaving     = false;

  // Dialog
  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    private usersService: UsersService,
    private toast:        ToastService,
    protected  auth:      AuthService,
    private cdr:          ChangeDetectorRef,
    private sapService:   SapService,
  ) {}

  ngOnInit() {
    Promise.resolve().then(() => {
      this.load();
      this.loadDimensions();
    });
  }

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

  isExpired(u: User): boolean {
    if (!u.U_FECHAEXPIRACION) return false;
    return new Date(u.U_FECHAEXPIRACION) < new Date();
  }

  // ── CRUD ─────────────────────────────────────────────────
  load(onComplete?: () => void) {
    this.loading   = true;
    this.loadError = false;
    this.usersService.getAll().subscribe({
      next: (users) => {
        this.users   = users;
        this.loading = false;
        this.applyFilter();
        this.cdr.markForCheck();
        onComplete?.();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
        this.cdr.markForCheck();
        onComplete?.();
      },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.users.filter(u =>
      (u.U_NomUser ?? '').toLowerCase().includes(q) ||
      (u.U_Login   ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
    this.cdr.markForCheck();
  }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

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
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al actualizar usuario');
          }
          this.cdr.markForCheck();
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
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al crear usuario');
          }
          this.cdr.markForCheck();
        },
      });
    }
  }

  // ── Dialog ───────────────────────────────────────────────
  confirmToggleStatus(u: User) {
    const isActive = this.isActive(u);
    this.openDialog({
      title:        isActive ? '¿Inactivar usuario?' : '¿Activar usuario?',
      message:      isActive
        ? `"${u.U_NomUser}" no podrá iniciar sesión.`
        : `"${u.U_NomUser}" podrá iniciar sesión nuevamente.`,
      confirmLabel: isActive ? 'Sí, inactivar' : 'Sí, activar',
      type:         isActive ? 'warning' : 'primary',
    }, () => {
      this.usersService.toggleStatus(u.U_IdU, isActive ? '0' : '1', u).subscribe({
        next:  () => {
          this.toast.exito(isActive ? 'Usuario inactivado' : 'Usuario activado');
          this.load();
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al cambiar estado');
          }
          this.cdr.markForCheck();
        },
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