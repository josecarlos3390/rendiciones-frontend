import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Variante tabla (por defecto) -->
    <div class="skeleton-table" *ngIf="variant === 'table'">
      <div class="skeleton-table__header">
        <div class="skeleton-block" *ngFor="let c of cols" [style.width]="c"></div>
      </div>
      <div class="skeleton-table__row" *ngFor="let r of rowsArray">
        <div class="skeleton-block" *ngFor="let c of cols" [style.width]="c"></div>
      </div>
    </div>

    <!-- Variante cards (dashboard KPIs) -->
    <div class="skeleton-cards" *ngIf="variant === 'cards'">
      <div class="skeleton-card" *ngFor="let r of rowsArray">
        <div class="skeleton-block skeleton-block--title"></div>
        <div class="skeleton-block skeleton-block--value"></div>
        <div class="skeleton-block skeleton-block--sub"></div>
      </div>
    </div>

    <!-- Variante lista simple -->
    <div class="skeleton-list" *ngIf="variant === 'list'">
      <div class="skeleton-list__item" *ngFor="let r of rowsArray">
        <div class="skeleton-block skeleton-block--line-lg"></div>
        <div class="skeleton-block skeleton-block--line-sm"></div>
      </div>
    </div>
  `,
})
export class SkeletonLoaderComponent {
  @Input() variant: 'table' | 'cards' | 'list' = 'table';
  @Input() rows    = 5;
  @Input() columns = ['15%', '20%', '20%', '15%', '15%', '15%'];

  get rowsArray(): number[] { return Array(this.rows).fill(0); }
  get cols():      string[] { return this.columns; }
}