import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, TemplateRef, ContentChild,
  HostListener, OnDestroy, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Definición de un tab para el modal
 */
export interface FormModalTab {
  id: string;
  label: string;
}

/**
 * Componente reutilizable para modales de formulario (creación/edición)
 * 
 * Uso básico:
 * <app-form-modal
 *   [title]="'Documento'"
 *   [subtitle]="perfilSeleccionado?.U_NombrePerfil"
 *   [isOpen]="showForm"
 *   [loading]="isSaving"
 *   [isEditing]="editingId !== null"
 *   [isDirty]="isDirty"
 *   (save)="guardar()"
 *   (cancel)="cerrarFormulario()">
 *   
 *   <ng-template #formContent>
 *     <div class="form-field">...</div>
 *   </ng-template>
 * </app-form-modal>
 * 
 * Uso con tabs:
 * <app-form-modal
 *   [title]="'Documento'"
 *   [tabs]="[{id:'doc', label:'Identificación'}, {id:'montos', label:'Montos'}]"
 *   [activeTab]="activeTab"
 *   (tabChange)="onTabChange($event)"
 *   [showTabNav]="true"
 *   ...>
 *   <ng-template #formContent>
 *     <!-- Contenido con tabs manejados externamente -->
 *   </ng-template>
 * </app-form-modal>
 */

@Component({
  selector: 'app-form-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen" (click)="onBackdropClick($event)">
      <div class="modal-card form-modal-card" 
           [class.form-modal-card--wide]="wide"
           role="dialog" 
           aria-modal="true" 
           tabindex="-1"
           #modalCard
           (click)="$event.stopPropagation()">
        
        <!-- Header Sticky -->
        <div class="modal-header form-modal-header">
          <div class="form-modal-header-info">
            <h3 class="form-modal-title">
              {{ headerTitle || (isEditing ? 'Editar ' + title : 'Nuevo ' + title) }}
              <span class="dirty-indicator" *ngIf="isEditing && isDirty" title="Cambios sin guardar">●</span>
            </h3>
            <span class="form-modal-subtitle" *ngIf="subtitle">{{ subtitle }}</span>
          </div>
          <button type="button" class="modal-close" (click)="onCancel()" [disabled]="loading">✕</button>
        </div>

        <!-- Tabs Navigation Sticky -->
        <div class="modal-tabs" *ngIf="tabs.length > 0">
          <button 
            type="button"
            class="modal-tab"
            *ngFor="let tab of tabs"
            [class.active]="activeTab === tab.id"
            [disabled]="loading"
            (click)="onTabClick(tab.id)">
            {{ tab.label }}
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body form-modal-body">
          <ng-container *ngTemplateOutlet="formContentTemplate || defaultContent"></ng-container>
          
          <!-- Template por defecto si no se proporciona content -->
          <ng-template #defaultContent>
            <div class="form-placeholder">
              <p>No se ha definido el contenido del formulario.</p>
              <p>Usa <code>&lt;ng-template #formContent&gt;</code> para definir el contenido.</p>
            </div>
          </ng-template>
        </div>

        <!-- Footer -->
        <div class="modal-footer form-modal-footer">
          <ng-container *ngTemplateOutlet="formFooterTemplate || defaultFooter"></ng-container>
          
          <!-- Footer por defecto -->
          <ng-template #defaultFooter>
            <!-- Navegación de tabs (izquierda) -->
            <div class="footer-tab-nav" *ngIf="showTabNav && tabs.length > 0">
              <button 
                type="button" 
                class="btn btn-ghost btn-sm"
                [disabled]="loading || isFirstTab"
                (click)="onPrevTab()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Anterior
              </button>
              <button 
                type="button" 
                class="btn btn-ghost btn-sm"
                [disabled]="loading || isLastTab"
                (click)="onNextTab()">
                Siguiente →
              </button>
            </div>
            
            <!-- Spacer para empujar botones a la derecha cuando hay tab-nav -->
            <div class="footer-spacer" *ngIf="showTabNav && tabs.length > 0"></div>
            
            <!-- Botones principales -->
            <button type="button" class="btn btn-ghost" (click)="onCancel()" [disabled]="loading">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" (click)="onSave()" [disabled]="loading || submitDisabled">
              <span *ngIf="loading">{{ loadingText }}</span>
              <span *ngIf="!loading">{{ submitText || (isEditing ? 'Guardar Cambios' : 'Crear ' + title) }}</span>
            </button>
          </ng-template>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* Header: fijo arriba en ambos temas */
    .form-modal-header {
      flex-shrink: 0;
      background: var(--bg-surface);
    }

    /* Título: hereda color del tema correctamente */
    .form-modal-title {
      color: var(--text-heading);
    }

    /* Tabs */
    .modal-tabs {
      flex-shrink: 0;
      display: flex;
      gap: 0;
      padding: 0 24px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-faint);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      position: sticky;
      top: 57px;
      z-index: 9;
    }

    .modal-tabs::-webkit-scrollbar { display: none; }

    .modal-tab {
      padding: 14px 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex: 0 0 auto;
      min-width: max-content;
    }

    .modal-tab:hover:not(:disabled) {
      color: var(--text-body);
      background: var(--bg-hover);
    }

    .modal-tab.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
      background: var(--bg-surface);
    }

    .modal-tab:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Footer layout */
    .footer-tab-nav {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .footer-tab-nav .btn {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .footer-spacer { flex: 1; }

    :host ::ng-deep .form-modal-footer {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Móvil: tabs no sticky (posición relativa, flex-shrink:0 los mantiene visibles) */
    @media (max-width: 640px) {
      .form-modal-header {
        position: relative;
      }

      .modal-tabs {
        position: relative;
        top: auto;
        padding: 0 4px;
      }

      .modal-tab {
        padding: 10px 14px;
        font-size: 12px;
      }
    }

    @media (max-width: 380px) {
      .modal-tab { padding: 9px 11px; font-size: 11px; }
    }
  `],
  styleUrls: ['./form-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormModalComponent implements OnDestroy, OnChanges {
  /** Título del formulario (ej: 'Documento', 'Perfil', 'Norma') */
  @Input() title = '';
  
  /** Subtítulo opcional (ej: nombre del perfil seleccionado) */
  @Input() subtitle: string | null = null;
  
  /** Controla si el modal está abierto */
  @Input() isOpen = false;
  
  /** Estado de carga al guardar */
  @Input() loading = false;
  
  /** Modo edición vs creación */
  @Input() isEditing = false;
  
  /** Indica si hay cambios sin guardar (muestra indicador visual) */
  @Input() isDirty = false;
  
  /** Ancho extendido del modal (720px en lugar de 560px) */
  @Input() wide = false;
  
  /** Deshabilitar el botón de submit (para validaciones) */
  @Input() submitDisabled = false;
  
  /** Texto mostrado durante la carga */
  @Input() loadingText = 'Guardando...';
  
  /** Título personalizado del header (sobrescribe 'Nuevo/Editar {title}') */
  @Input() headerTitle: string | null = null;
  
  /** Texto personalizado del botón submit (sobrescribe 'Crear {title}'/'Guardar Cambios') */
  @Input() submitText: string | null = null;

  /** Array de tabs para navegación (opcional) */
  @Input() tabs: FormModalTab[] = [];

  /** ID del tab activo */
  @Input() activeTab = '';

  /** Mostrar botones de navegación de tabs en el footer */
  @Input() showTabNav = false;
  
  /** Evento emitido al guardar */
  @Output() save = new EventEmitter<void>();
  
  /** Evento emitido al cancelar/cerrar */
  @Output() cancel = new EventEmitter<void>();

  /** Evento emitido cuando cambia el tab activo */
  @Output() tabChange = new EventEmitter<string>();
  
  /** Template del contenido del formulario - usar #formContent */
  @ContentChild('formContent', { static: false, read: TemplateRef }) formContentTemplate!: TemplateRef<any>;
  
  /** Template personalizado del footer - usar #formFooter */
  @ContentChild('formFooter', { static: false, read: TemplateRef }) formFooterTemplate!: TemplateRef<any>;

  private scrollPosition = 0;

  /** Computed: está en el primer tab */
  get isFirstTab(): boolean {
    if (this.tabs.length === 0) return true;
    return this.tabs[0]?.id === this.activeTab;
  }

  /** Computed: está en el último tab */
  get isLastTab(): boolean {
    if (this.tabs.length === 0) return true;
    return this.tabs[this.tabs.length - 1]?.id === this.activeTab;
  }

  /** Computed: índice del tab activo */
  get activeTabIndex(): number {
    return this.tabs.findIndex(t => t.id === this.activeTab);
  }

  /** ESC para cerrar el modal */
  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.isOpen && !this.loading) {
      event.preventDefault();
      this.onCancel();
    }
  }

  /** Ctrl+Enter para guardar */
  @HostListener('document:keydown.control.enter', ['$event'])
  onCtrlEnter(event: Event): void {
    if (this.isOpen && !this.loading && !this.submitDisabled) {
      event.preventDefault();
      this.onSave();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.lockBodyScroll();
      } else {
        this.unlockBodyScroll();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isOpen) {
      this.unlockBodyScroll();
    }
  }

  onSave(): void {
    if (!this.loading && !this.submitDisabled) {
      this.save.emit();
    }
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancel.emit();
    }
  }

  onTabClick(tabId: string): void {
    if (!this.loading && tabId !== this.activeTab) {
      this.tabChange.emit(tabId);
    }
  }

  onPrevTab(): void {
    if (this.isFirstTab || this.loading) return;
    const currentIndex = this.activeTabIndex;
    if (currentIndex > 0) {
      this.tabChange.emit(this.tabs[currentIndex - 1].id);
    }
  }

  onNextTab(): void {
    if (this.isLastTab || this.loading) return;
    const currentIndex = this.activeTabIndex;
    if (currentIndex < this.tabs.length - 1) {
      this.tabChange.emit(this.tabs[currentIndex + 1].id);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.loading) {
      this.cancel.emit();
    }
  }

  /** Bloquear scroll cuando se abre el modal */
  private lockBodyScroll(): void {
    this.scrollPosition = window.pageYOffset;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollPosition}px`;
    document.body.style.width = '100%';
  }

  /** Restaurar scroll cuando se cierra el modal */
  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, this.scrollPosition);
  }
}