import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormModalComponent } from '../form-modal';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

export interface PickerItem {
  id: string | number;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Modal genérico para seleccionar un item de una lista
 * Útil para perfiles, dimensiones, cuentas, etc.
 * 
 * Uso:
 * <app-picker-modal
 *   [title]="'Seleccionar Perfil'"
 *   [items]="perfiles"
 *   [selectedId]="perfilActivoId"
 *   [isOpen]="showPicker"
 *   [loading]="loading"
 *   (confirm)="onPerfilSelect($event)"
 *   (cancel)="showPicker = false">
 * </app-picker-modal>
 */
@Component({
  selector: 'app-picker-modal',
  standalone: true,
  imports: [CommonModule, FormModalComponent, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-modal
      [title]="title"
      [headerTitle]="title"
      [submitText]="'Confirmar'"
      [subtitle]="subtitle"
      [isOpen]="isOpen"
      [loading]="loading"
      [isEditing]="false"
      [submitDisabled]="!selectedId"
      (save)="onConfirm()"
      (cancel)="onCancel()">
      
      <ng-template #formContent>
        <app-skeleton-loader *ngIf="loading" variant="table" [rows]="5">
        </app-skeleton-loader>
        
        <div class="picker-empty" *ngIf="!loading && items.length === 0">
          <div class="picker-empty-icon">{{ emptyIcon }}</div>
          <div class="picker-empty-title">{{ emptyTitle }}</div>
          <div class="picker-empty-message">{{ emptyMessage }}</div>
        </div>
        
        <ng-container *ngIf="!loading && items.length > 0">
          <p class="picker-hint" *ngIf="hint">{{ hint }}</p>
          
          <div class="picker-list">
            <button 
              type="button" 
              class="picker-item"
              *ngFor="let item of items"
              [class.picker-item--active]="selectedId === item.id"
              [class.picker-item--disabled]="item.disabled"
              [disabled]="item.disabled"
              (click)="onItemClick(item.id)">
              <span class="picker-item__icon" *ngIf="item.icon || showDefaultIcon">
                {{ item.icon || defaultIcon }}
              </span>
              <span class="picker-item__content">
                <span class="picker-item__label">{{ item.label }}</span>
                <span class="picker-item__desc" *ngIf="item.description">{{ item.description }}</span>
              </span>
              <span class="picker-item__check" *ngIf="selectedId === item.id">✓</span>
            </button>
          </div>
        </ng-container>
      </ng-template>
    </app-form-modal>
  `,
  styles: [`
    .picker-hint {
      margin: 0 0 12px;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .picker-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .picker-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-subtle);
      border: 2px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }

    .picker-item:hover:not(:disabled) {
      background: var(--bg-surface);
      border-color: var(--color-primary);
    }

    .picker-item--active {
      background: var(--color-primary-bg) !important;
      border-color: var(--color-primary) !important;
    }

    .picker-item--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .picker-item__icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .picker-item__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .picker-item__label {
      font-weight: 500;
      color: var(--text-heading);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .picker-item__desc {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .picker-item__check {
      color: var(--color-primary);
      font-weight: 600;
    }

    .picker-empty {
      text-align: center;
      padding: 32px 16px;
    }

    .picker-empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .picker-empty-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-heading);
      margin-bottom: 4px;
    }

    .picker-empty-message {
      font-size: 14px;
      color: var(--text-muted);
    }
  `],
})
export class PickerModalComponent {
  @Input() title = 'Seleccionar';
  @Input() subtitle: string | null = null;
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() items: PickerItem[] = [];
  @Input() selectedId: string | number | null = null;
  
  @Input() hint: string | null = null;
  @Input() showDefaultIcon = true;
  @Input() defaultIcon = '📋';
  
  @Input() emptyIcon = '📂';
  @Input() emptyTitle = 'Sin elementos';
  @Input() emptyMessage = 'No hay elementos disponibles para seleccionar.';
  
  @Output() confirm = new EventEmitter<string | number>();
  @Output() cancel = new EventEmitter<void>();
  @Output() selectionChange = new EventEmitter<string | number>();

  onItemClick(id: string | number): void {
    if (this.selectedId !== id) {
      this.selectedId = id;
      this.selectionChange.emit(id);
    }
  }

  onConfirm(): void {
    if (this.selectedId !== null) {
      this.confirm.emit(this.selectedId);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
