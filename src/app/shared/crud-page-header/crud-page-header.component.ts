import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Header genérico para páginas CRUD.
 *
 * Uso simple:
 * <app-crud-page-header
 *   title="Plan de Cuentas (COA)"
 *   subtitle="Administra las cuentas..."
 *   actionLabel="+ Nueva Cuenta"
 *   [actionDisabled]="!canCreate"
 *   (actionClick)="openNew()">
 * </app-crud-page-header>
 *
 * Uso avanzado (slots):
 * <app-crud-page-header title="Detalle" [subtitle]="sub">
 *   <ng-container headerPrefix><button class="back-btn">Volver</button></ng-container>
 *   <ng-container titleExtra><span class="badge">N° 123</span></ng-container>
 *   <ng-container headerActions>
 *     <button class="btn btn-ghost">Exportar</button>
 *   </ng-container>
 * </app-crud-page-header>
 */
@Component({
  selector: 'app-crud-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <ng-content select="[headerPrefix]"></ng-content>
        <h2>{{ title }}<ng-content select="[titleExtra]"></ng-content></h2>
        <p class="page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-actions">
        <ng-content select="[headerActions]"></ng-content>
        <button
          *ngIf="actionLabel"
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="actionDisabled"
          (click)="actionClick.emit()">
          {{ actionLabel }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrudPageHeaderComponent {
  @Input() title = '';
  @Input() subtitle: string | null = null;
  @Input() actionLabel: string | null = null;
  @Input() actionDisabled = false;

  @Output() actionClick = new EventEmitter<void>();
}
