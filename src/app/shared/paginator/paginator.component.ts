import {
  Component, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="paginator" *ngIf="totalPages > 1 || total > 0">
      <span class="paginator-info">
        {{ rangeStart }}–{{ rangeEnd }} de {{ total }} registro{{ total !== 1 ? 's' : '' }}
      </span>

      <div class="paginator-controls">
        <button class="pag-btn" [disabled]="page <= 1" (click)="go(1)" title="Primera página">«</button>
        <button class="pag-btn" [disabled]="page <= 1" (click)="go(page - 1)" title="Anterior">‹</button>

        <ng-container *ngFor="let p of pages">
          <span *ngIf="p === -1" class="pag-ellipsis">…</span>
          <button
            *ngIf="p !== -1"
            class="pag-btn"
            [class.active]="p === page"
            (click)="go(p)">
            {{ p }}
          </button>
        </ng-container>

        <button class="pag-btn" [disabled]="page >= totalPages" (click)="go(page + 1)" title="Siguiente">›</button>
        <button class="pag-btn" [disabled]="page >= totalPages" (click)="go(totalPages)" title="Última página">»</button>
      </div>

      <div class="paginator-size">
        <span class="pag-size-label">Filas:</span>
        <select (change)="onLimitChange($event)">
          <option *ngFor="let s of pageSizes" [value]="s" [selected]="s === limit">{{ s }}</option>
        </select>
      </div>
    </div>
  `,
  styles: [`
    .paginator {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-faint);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      flex-wrap: wrap;
    }

    .paginator-info {
      font-size: 13px;
      color: var(--text-muted);
      flex: 1;
      min-width: 140px;
    }

    .paginator-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pag-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      color: var(--text-label);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: var(--font-body);
      transition: background var(--transition), border-color var(--transition), color var(--transition);
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &:hover:not(:disabled) {
        background: var(--color-primary-bg);
        border-color: var(--color-primary-border);
        color: var(--color-primary-text);
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
        border-color: var(--color-primary);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      &.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: #fff;
        font-weight: 600;
      }
    }

    .pag-ellipsis {
      color: var(--text-faint);
      font-size: 14px;
      padding: 0 4px;
      line-height: 32px;
    }

    .paginator-size {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
    }

    .pag-size-label {
      font-size: 13px;
      color: var(--text-muted);
    }

    .paginator-size select {
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      color: var(--text-body);
      font-size: 13px;
      font-family: var(--font-body);
      cursor: pointer;
      transition: border-color var(--transition);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--focus-ring);
      }
    }
  `],
})
export class PaginatorComponent implements OnChanges {
  @Input() page       = 1;
  @Input() limit      = 20;
  @Input() total      = 0;
  @Input() totalPages = 1;

  @Output() pageChange  = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  pageSizes = [5, 10, 20, 50, 100];
  pages: number[] = [];

  get rangeStart() { return Math.min(this.total, (this.page - 1) * this.limit + 1); }
  get rangeEnd()   { return Math.min(this.total,  this.page      * this.limit);      }

  ngOnChanges() { this.buildPages(); }

  go(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.pageChange.emit(p);
  }

  onLimitChange(event: Event) {
    const val = +(event.target as HTMLSelectElement).value;
    this.limitChange.emit(val);
  }

  private buildPages() {
    const total = this.totalPages;
    const cur   = this.page;

    if (total <= 7) {
      this.pages = Array.from({ length: total }, (_, i) => i + 1);
      return;
    }

    const result: number[] = [1];
    if (cur > 3) result.push(-1);
    const start = Math.max(2, cur - 1);
    const end   = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (cur < total - 2) result.push(-1);
    result.push(total);
    this.pages = result;
  }
}
