import { signal, computed } from '@angular/core';
import { Observable } from 'rxjs';

export interface CrudListStoreOptions<T> {
  limit?: number;
  searchFields?: (keyof T)[];
}

export class CrudListStore<T> {
  private readonly _items = signal<T[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _loadError = signal<boolean>(false);
  private readonly _page = signal<number>(1);
  private readonly _limit = signal<number>(10);
  private readonly _search = signal<string>('');
  private readonly _customFilters = signal<Record<string, (item: T) => boolean>>({});

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly search = this._search.asReadonly();
  readonly customFilters = this._customFilters.asReadonly();

  readonly filtered = computed(() => {
    let result = this._items();
    const q = this._search().toLowerCase().trim();

    if (q && this._searchFields.length > 0) {
      result = result.filter((item) =>
        this._searchFields.some((field) => {
          const value = (item as any)[field];
          return value != null && String(value).toLowerCase().includes(q);
        }),
      );
    }

    const filters = this._customFilters();
    for (const predicate of Object.values(filters)) {
      result = result.filter(predicate);
    }

    return result;
  });

  readonly totalPages = computed(() => {
    const count = this.filtered().length;
    return Math.max(1, Math.ceil(count / this._limit()));
  });

  readonly paged = computed(() => {
    const data = this.filtered();
    const page = this._page();
    const limit = this._limit();
    const start = (page - 1) * limit;
    return data.slice(start, start + limit);
  });

  constructor(private readonly options?: CrudListStoreOptions<T>) {
    this._limit.set(this._clampLimit(options?.limit ?? 10));
  }

  private get _searchFields(): (keyof T)[] {
    return this.options?.searchFields ?? [];
  }

  private _clampLimit(value: number): number {
    return Math.max(1, value);
  }

  load(observable: Observable<T[]>, onComplete?: () => void): void {
    this._loading.set(true);
    this._loadError.set(false);

    observable.subscribe({
      next: (data) => {
        this._items.set(data);
        this._loading.set(false);
        this._page.set(1);
        onComplete?.();
      },
      error: () => {
        this._loading.set(false);
        this._loadError.set(true);
        onComplete?.();
      },
    });
  }

  setItems(data: T[]): void {
    this._items.set(data);
    this._page.set(1);
  }

  setSearch(value: string): void {
    this._search.set(value);
    this._page.set(1);
  }

  setPage(p: number): void {
    const safe = Math.max(1, p);
    const max = this.totalPages();
    this._page.set(Math.min(safe, max));
  }

  setLimit(l: number): void {
    this._limit.set(this._clampLimit(l));
    this._page.set(1);
  }

  setCustomFilter(key: string, predicate: ((item: T) => boolean) | null): void {
    this._customFilters.update((filters) => {
      const next = { ...filters };
      if (predicate) {
        next[key] = predicate;
      } else {
        delete next[key];
      }
      return next;
    });
    this._page.set(1);
  }

  refreshPaging(): void {
    const max = this.totalPages();
    if (this._page() > max) {
      this._page.set(max);
    }
  }
}
