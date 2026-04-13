/**
 * UsersTableComponent - Componente dumb para tabla de usuarios
 * @Input items: User[] - Lista de usuarios paginados
 * @Input page: number - Página actual
 * @Input limit: number - Ítems por página
 * @Input totalPages: number - Total de páginas
 * @Input total: number - Total de ítems filtrados
 * @Input loading: boolean - Estado de carga
 * @Output pageChange: EventEmitter<number> - Cambio de página
 * @Output limitChange: EventEmitter<number> - Cambio de límite
 * @Output edit: EventEmitter<User> - Editar usuario
 * @Output toggleActivo: EventEmitter<User> - Cambiar estado activo/inactivo
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { User } from '@models/user.model';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent, PaginatorComponent],
  template: `
    <div class="table-wrapper">
      <table class="data-table users-table">
        <thead>
          <tr>
            <th class="col-usuario">Usuario</th>
            <th class="col-tipo col-hide-tablet">Tipo</th>
            <th class="col-modulos col-hide-tablet">Modulos</th>
            <th class="col-estado">Estado</th>
            <th class="col-expira col-hide-mobile">Expira</th>
            <th class="col-acciones">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of items" [class.row-inactive]="!isActive(u)">
            <!-- 1. USUARIO: Título principal (full width) -->
            <td class="col-usuario col-mobile-primary" data-label="Usuario">
              <div class="user-cell">
                <div class="user-avatar" [class.avatar-inactive]="!isActive(u)">{{ initial(u) }}</div>
                <div class="user-cell-info">
                  <span class="user-login">{{ u.U_Login }}</span>
                  <span class="user-sup" *ngIf="u.U_NomSup">↑ {{ u.U_NomSup }}</span>
                </div>
              </div>
            </td>

            <!-- 2. TIPO (columna 1) -->
            <td class="col-tipo" data-label="Tipo">
              <span class="type-badge" [class.role-admin]="u.U_SuperUser === 1" [class.role-user]="u.U_SuperUser === 0">
                {{ u.U_SuperUser === 1 ? 'Admin' : 'Normal' }}
              </span>
            </td>

            <!-- 3. MÓDULOS (columna 2) -->
            <td class="col-modulos" data-label="Modulos">
              <div class="perm-badges">
                <span class="perm-badge" [class.perm-on]="u.U_AppRend == '1'" title="Rendiciones">R</span>
                <span class="perm-badge" [class.perm-on]="u.U_AppConf == '1'" title="Configuraciones">C</span>
              </div>
            </td>

            <!-- 4. ESTADO: Badge (centrado) -->
            <td class="col-estado col-mobile-badge" data-label="Estado">
              <span class="status-badge-dot"
                [class.status-active]="isActive(u)"
                [class.status-inactive]="!isActive(u) && !isBlocked(u)"
                [class.status-blocked]="isBlocked(u)">
                <span class="status-dot"></span>
                {{ estadoLabel(u) }}
              </span>
            </td>

            <!-- 5. EXPIRA: Oculto en móvil -->
            <td class="col-expira col-hide-mobile" data-label="Expira">
              <span [class.text-expired]="isExpired(u)">
                {{ u.U_FECHAEXPIRACION | date:'dd/MM/yyyy' }}
              </span>
            </td>

            <!-- 6. ACCIONES: Al final -->
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                [actions]="getActionMenuItems(u)"
                [itemLabel]="u.U_NomUser || u.U_Login"
                (actionClick)="onAction($event, u)">
              </app-action-menu>
            </td>
          </tr>
        </tbody>
      </table>

      <app-paginator
        [page]="page"
        [limit]="limit"
        [total]="total"
        [totalPages]="totalPages"
        (pageChange)="onPageChange($event)"
        (limitChange)="onLimitChange($event)">
      </app-paginator>
    </div>
  `,
  styleUrls: ['./users-table.component.scss']
})
export class UsersTableComponent {
  @Input() items: User[] = [];
  @Input() page = 1;
  @Input() limit = 10;
  @Input() totalPages = 1;
  @Input() total = 0;
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<User>();
  @Output() toggleActivo = new EventEmitter<User>();

  initial(u: User): string {
    return (u.U_NomUser ?? u.U_Login ?? 'U')[0].toUpperCase();
  }

  isActive(u: User): boolean {
    return u.U_Estado === '1';
  }

  isBlocked(u: User): boolean {
    return u.U_Estado === '2';
  }

  estadoLabel(u: User): string {
    if (u.U_Estado === '1') return 'Activo';
    if (u.U_Estado === '2') return 'Bloqueado';
    return 'Inactivo';
  }

  isExpired(u: User): boolean {
    if (!u.U_FECHAEXPIRACION) return false;
    return new Date(u.U_FECHAEXPIRACION) < new Date();
  }

  getActionMenuItems(u: User): ActionMenuItem[] {
    const isActive = this.isActive(u);
    return [
      { id: 'edit', label: 'Editar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
      { 
        id: 'toggle', 
        label: isActive ? 'Desactivar' : 'Activar', 
        icon: isActive 
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        cssClass: isActive ? 'text-warning' : 'text-success'
      },
    ];
  }

  onAction(actionId: string | ActionMenuItem, u: User): void {
    const id = typeof actionId === 'string' ? actionId : actionId.id;
    if (id === 'edit') {
      this.edit.emit(u);
    } else if (id === 'toggle') {
      this.toggleActivo.emit(u);
    }
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onLimitChange(limit: number): void {
    this.limitChange.emit(limit);
  }
}
