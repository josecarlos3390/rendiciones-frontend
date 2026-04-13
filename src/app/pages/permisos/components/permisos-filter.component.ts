import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';

@Component({
  selector: 'app-permisos-filter',
  standalone: true,
  imports: [CommonModule, AppSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter-bar">
      <div class="filter-left">
        <div class="filter-field">
          <label>Usuario</label>
          <app-select
            [options]="usuarioOptions"
            [value]="selectedUsuarioId"
            placeholder="Seleccione usuario"
            (valueChange)="onUsuarioChange($event)">
          </app-select>
        </div>
        
        <div class="filter-field" *ngIf="selectedUsuarioId">
          <label>Asignar Perfil</label>
          <app-select
            [options]="perfilOptions"
            [value]="selectedPerfilId"
            placeholder="Seleccione perfil"
            (valueChange)="onPerfilChange($event)">
          </app-select>
        </div>
        
        <button 
          *ngIf="selectedUsuarioId && selectedPerfilId"
          class="btn btn-primary"
          [disabled]="isSaving"
          (click)="onAsignar()">
          {{ isSaving ? 'Asignando...' : 'Asignar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .filter-bar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      padding: 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .filter-left {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex: 1;
      flex-wrap: wrap;
    }
    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 240px;
    }
    .filter-field label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    @media (max-width: 768px) {
      .filter-bar { flex-direction: column; align-items: stretch; }
      .filter-left { flex-direction: column; align-items: stretch; }
      .filter-field { width: 100%; min-width: 0; }
    }
  `]
})
export class PermisosFilterComponent {
  @Input() usuarioOptions: SelectOption[] = [];
  @Input() perfilOptions: SelectOption[] = [];
  @Input() selectedUsuarioId: number | null = null;
  @Input() selectedPerfilId: number | null = null;
  @Input() isSaving = false;

  @Output() usuarioChange = new EventEmitter<number | null>();
  @Output() perfilChange = new EventEmitter<number | null>();
  @Output() asignar = new EventEmitter<void>();

  onUsuarioChange(value: number | null): void { this.usuarioChange.emit(value); }
  onPerfilChange(value: number | null): void { this.perfilChange.emit(value); }
  onAsignar(): void { this.asignar.emit(); }
}
