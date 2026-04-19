import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Estados vacíos/carga/error estandarizados para CRUDs.
 *
 * Uso básico:
 * <app-crud-empty-state
 *   entityName="cuentas"
 *   [loading]="store.loading()"
 *   [error]="store.loadError()"
 *   [empty]="!store.loading() && !store.loadError() && store.filtered().length === 0"
 *   [search]="store.search()"
 *   [showCreate]="isAdmin"
 *   (retry)="load()"
 *   (create)="openNew()">
 * </app-crud-empty-state>
 *
 * Uso con textos personalizados:
 * <app-crud-empty-state
 *   [loading]="store.loading()"
 *   [error]="store.loadError()"
 *   [empty]="!store.loading() && !store.loadError() && store.filtered().length === 0"
 *   [searchEmpty]="..."
 *   loadingText="Cargando..."
 *   errorText="Error al cargar."
 *   emptyText="No hay registros."
 *   searchEmptyText="No se encontraron resultados."
 *   (retry)="load()">
 *   <ng-container emptyAction>
 *     <a (click)="openNew()">Crear el primero</a>
 *   </ng-container>
 * </app-crud-empty-state>
 */
@Component({
  selector: 'app-crud-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="loading" class="empty-state">{{ loadingText || ('Cargando ' + entityName + '...') }}</div>

    <div *ngIf="!loading && error" class="empty-state">
      {{ errorText || 'No se pudo cargar.' }}
      <a *ngIf="showRetry" (click)="retry.emit()">Reintentar</a>
    </div>

    <div *ngIf="!loading && !error && empty && !isSearchEmpty" class="empty-state">
      {{ emptyText || ('Este perfil aún no tiene ' + entityName + ' configuradas.') }}
      <ng-container *ngIf="emptyActionTpl; else defaultCreate">
        <ng-container *ngTemplateOutlet="emptyActionTpl"></ng-container>
      </ng-container>
      <ng-template #defaultCreate>
        <a *ngIf="showCreate" (click)="create.emit()">Agregar el primero</a>
      </ng-template>
    </div>

    <div *ngIf="!loading && !error && isSearchEmpty" class="empty-state">
      {{ searchEmptyText || ('No se encontraron ' + entityName + ' para "' + search + '".') }}
    </div>
  `,
})
export class CrudEmptyStateComponent {
  @Input() entityName = 'registros';
  @Input() loading = false;
  @Input() error = false;
  @Input() empty = false;
  @Input() searchEmpty = false;
  @Input() search: string | null = null;
  @Input() showRetry = true;
  @Input() showCreate = false;

  // Textos personalizados
  @Input() loadingText: string | null = null;
  @Input() errorText: string | null = null;
  @Input() emptyText: string | null = null;
  @Input() searchEmptyText: string | null = null;

  @Output() retry = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();

  @ContentChild('emptyAction', { read: TemplateRef }) emptyActionTpl!: TemplateRef<any>;

  get isSearchEmpty(): boolean {
    if (this.searchEmpty) return true;
    return this.empty && !!this.search;
  }
}
