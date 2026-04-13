import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Variante tabla (por defecto) -->
    <div class="skeleton-table fade-in" *ngIf="variant === 'table'">
      <div class="skeleton-table__header">
        <div class="skeleton-block skeleton-shimmer" *ngFor="let c of cols" [style.width]="c"></div>
      </div>
      <div class="skeleton-table__row" *ngFor="let r of rowsArray; let i = index" [style.animationDelay]="i * 0.05 + 's'">
        <div class="skeleton-block skeleton-shimmer" *ngFor="let c of cols" [style.width]="c"></div>
      </div>
    </div>

    <!-- Variante cards (dashboard KPIs) -->
    <div class="skeleton-cards fade-in" *ngIf="variant === 'cards'">
      <div class="skeleton-card" *ngFor="let r of rowsArray; let i = index" [style.animationDelay]="i * 0.1 + 's'">
        <div class="skeleton-block skeleton-block--title skeleton-shimmer"></div>
        <div class="skeleton-block skeleton-block--value skeleton-shimmer"></div>
        <div class="skeleton-block skeleton-block--sub skeleton-shimmer"></div>
      </div>
    </div>

    <!-- Variante lista simple -->
    <div class="skeleton-list fade-in" *ngIf="variant === 'list'">
      <div class="skeleton-list__item" *ngFor="let r of rowsArray; let i = index" [style.animationDelay]="i * 0.05 + 's'">
        <div class="skeleton-block skeleton-block--line-lg skeleton-shimmer"></div>
        <div class="skeleton-block skeleton-block--line-sm skeleton-shimmer"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-table {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .skeleton-table__header {
      display: flex;
      padding: 12px 16px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      gap: 16px;
    }

    .skeleton-table__row {
      display: flex;
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      gap: 16px;
      animation: slideInUp 0.3s ease-out forwards;
      opacity: 0;
    }

    .skeleton-table__row:last-child {
      border-bottom: none;
    }

    .skeleton-block {
      height: 16px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      border-radius: 4px;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .skeleton-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .skeleton-card {
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      animation: slideInUp 0.3s ease-out forwards;
      opacity: 0;
    }

    .skeleton-block--title {
      width: 60%;
      height: 14px;
      margin-bottom: 12px;
    }

    .skeleton-block--value {
      width: 40%;
      height: 32px;
      margin-bottom: 8px;
    }

    .skeleton-block--sub {
      width: 80%;
      height: 12px;
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-list__item {
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      animation: slideInUp 0.3s ease-out forwards;
      opacity: 0;
    }

    .skeleton-block--line-lg {
      width: 70%;
      height: 16px;
      margin-bottom: 8px;
    }

    .skeleton-block--line-sm {
      width: 40%;
      height: 12px;
    }

    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() variant: 'table' | 'cards' | 'list' = 'table';
  @Input() rows    = 5;
  @Input() columns = ['15%', '20%', '20%', '15%', '15%', '15%'];

  get rowsArray(): number[] { return Array(this.rows).fill(0); }
  get cols():      string[] { return this.columns; }
}