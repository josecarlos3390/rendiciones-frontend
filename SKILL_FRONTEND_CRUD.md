# Skill: Angular CRUD Frontend Pattern

> Patrón de arquitectura frontend para aplicaciones Angular con listados CRUD. Basado en la experiencia del proyecto **Rendiciones**.

---

## 1. Visión general

Este patrún resuelve el problema de la **duplicación de código en listados CRUD** mediante:

- **Una tabla genérica** (`app-data-table`) que se configura por declaración.
- **Un store signal-based** (`CrudListStore`) que maneja estado de forma reactiva.
- **Una clase base** (`AbstractCrudListComponent`) que centraliza paginación, búsqueda y filtros.
- **Componentes standalone** siguiendo el patrón Smart/Dumb.

**Resultado:** Cada nueva página CRUD se implementa en ~50 líneas de TypeScript en lugar de ~200+, sin lógica duplicada.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Angular 21+ (standalone components) |
| Estado | Angular Signals (`signal`, `computed`) |
| Estilos | SCSS modular por componente + variables CSS globales |
| Testing | Vitest vía `@angular/build:unit-test` |

---

## 3. Estructura de carpetas

```
src/app/
├── core/
│   ├── crud-list-store.ts              # Store signal-based
│   ├── abstract-crud-list.component.ts # Clase base CRUD
│   ├── toast/
│   ├── confirm-dialog/
│   └── layout/                         # Header, Sidebar, Layout
├── shared/
│   ├── data-table/                     # Tabla genérica
│   ├── paginator/
│   ├── action-menu/
│   ├── status-badge/
│   ├── empty-state/
│   ├── skeleton-loader/
│   ├── crud-page-header/
│   └── crud-empty-state/
├── pages/
│   └── {feature}/
│       ├── {feature}.component.ts      # Smart component
│       ├── {feature}.component.html
│       ├── {feature}.component.scss
│       └── components/                 # Dumb components
│           ├── index.ts
│           └── {feature}-filters.component.ts
├── services/
│   └── {feature}.service.ts
└── models/
    └── {feature}.model.ts
```

---

## 4. Los 3 pilares

### 4.1 CrudListStore — Estado reactivo

Clase pura de TypeScript (no depende de Angular). Usa signals para estado reactivo.

```typescript
import { CrudListStore } from '@core/crud-list-store';

// Crear store
readonly store = new CrudListStore<MiModelo>({
  limit: 10,
  searchFields: ['nombre', 'codigo'], // campos para búsqueda global
});

// Cargar datos
this.store.load(this.miService.getAll(), () => this.cdr.markForCheck());

// Acceder a señales computadas
this.store.items();      // Todos los items cargados
this.store.filtered();   // Items filtrados por búsqueda + custom filters
this.store.paged();      // Items de la página actual
this.store.loading();    // boolean
this.store.loadError();  // boolean
this.store.page();       // número de página actual
this.store.limit();      // items por página
this.store.totalPages(); // total de páginas

// Acciones
this.store.setSearch('texto');
this.store.setPage(2);
this.store.setLimit(20);
this.store.setCustomFilter('estado', (item) => item.activo === true);
this.store.setCustomFilter('estado', null); // quitar filtro
this.store.setItems([...]); // setear manualmente (feedback optimista)
```

**Reglas del store:**
- `load()` maneja `loading`/`loadError` internamente.
- Cada cambio de búsqueda, filtro o límite resetea la página a 1.
- `filtered` aplica búsqueda textual + todos los `customFilters` activos.
- `paged` hace `slice()` sobre `filtered`.

---

### 4.2 AbstractCrudListComponent — Clase base

```typescript
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';

export class MiPaginaComponent extends AbstractCrudListComponent<MiModelo> {
  readonly store = new CrudListStore<MiModelo>({ limit: 10, searchFields: ['nombre'] });

  // Opcional: filtro de activo/inactivo
  protected override getActiva(item: MiModelo): boolean {
    return item.activa;
  }
}
```

**Métodos heredados:**
| Método | Descripción |
|--------|-------------|
| `onPageChange(p)` | `store.setPage(p)` |
| `onLimitChange(l)` | `store.setLimit(l)` |
| `onSearchChange(v)` | `store.setSearch(v)` |
| `onSearchCleared()` | `store.setSearch('')` |
| `onFilterActivaChange(v)` | Aplica filtro activas/inactivas vía `customFilter` |

---

### 4.3 app-data-table — Tabla genérica

```typescript
import { DataTableComponent, DataTableConfig } from '@shared/data-table';

@ViewChild('nombreCol', { static: true }) nombreCol!: TemplateRef<any>;

tableConfig: DataTableConfig = {
  columns: [
    { key: 'id', header: 'ID', align: 'center' },
    { key: 'nombre', header: 'Nombre', cellTemplate: this.nombreCol },
    { key: 'fecha', header: 'Fecha', align: 'center', mobile: { hide: true } },
    { key: 'monto', header: 'Monto', align: 'right' },
  ],
  showActions: true,
  actions: [
    { id: 'editar', label: 'Editar', icon: ICON_EDIT },
    { id: 'eliminar', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'text-danger' },
  ],
  striped: true,
  hoverable: true,
};
```

```html
<ng-template #nombreCol let-item>
  <a [routerLink]="['/detalle', item.id]">{{ item.nombre }}</a>
</ng-template>

<app-data-table
  [items]="store.paged()"
  [config]="tableConfig"
  [page]="store.page()"
  [limit]="store.limit()"
  [total]="store.filtered().length"
  [totalPages]="store.totalPages()"
  (pageChange)="onPageChange($event)"
  (limitChange)="onLimitChange($event)"
  (action)="onTableAction($event)">
</app-data-table>
```

**Configuración de columnas (`DataTableColumn`):**
| Propiedad | Uso |
|-----------|-----|
| `key` | Campo del objeto a mostrar (o identificador si usa `cellTemplate`) |
| `header` | Texto del encabezado |
| `align` | `'left'` \| `'center'` \| `'right'` |
| `cellTemplate` | TemplateRef para renderizado custom |
| `mobile.hide` | Ocultar en móvil |
| `mobile.primary` | Resaltar como columna principal en móvil |

**Acciones (`DataTableAction`):**
| Propiedad | Uso |
|-----------|-----|
| `id` | Identificador para el evento `(action)` |
| `label` | Texto del menú |
| `icon` | SVG string |
| `cssClass` | Clase CSS para el ítem del menú |
| `condition` | `(item) => boolean` para mostrar/ocultar la acción |

---

## 5. Patrón Smart/Dumb

### Smart Component (Container)
- Maneja estado, lógica de negocio, llamadas a servicios.
- Orquesta dumb components vía `@Input()` / `@Output()`.
- Contiene `CrudListStore`, `DataTableConfig`, modales.

### Dumb Components (Presentational)
- Solo reciben datos vía `@Input()`.
- Emiten eventos vía `@Output()`.
- No llaman servicios ni acceden a estado global.
- Viven en `components/` dentro de cada página.

**Ejemplo de dumb component:**
```typescript
@Component({
  selector: 'app-mi-filtro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class MiFiltroComponent {
  @Input() search = '';
  @Input() count = 0;
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();
}
```

---

## 6. Path Aliases (tsconfig)

```json
{
  "compilerOptions": {
    "paths": {
      "@common": ["./src/app/common"],
      "@common/*": ["./src/app/common/*"],
      "@core": ["./src/app/core"],
      "@core/*": ["./src/app/core/*"],
      "@auth": ["./src/app/auth"],
      "@auth/*": ["./src/app/auth/*"],
      "@shared": ["./src/app/shared"],
      "@shared/*": ["./src/app/shared/*"],
      "@services": ["./src/app/services"],
      "@services/*": ["./src/app/services/*"],
      "@models": ["./src/app/models"],
      "@models/*": ["./src/app/models/*"],
      "@env": ["./src/environments/environment"]
    }
  }
}
```

**Regla de oro:** Nunca usar rutas relativas largas (`../../../`). Siempre aliases.

---

## 7. Cómo crear una nueva página CRUD (paso a paso)

### Paso 1: Modelo
```typescript
// src/app/models/mi-feature.model.ts
export interface MiFeature {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
}
```

### Paso 2: Servicio
```typescript
// src/app/services/mi-feature.service.ts
@Injectable({ providedIn: 'root' })
export class MiFeatureService {
  private http = inject(HttpClient);

  getAll(): Observable<MiFeature[]> {
    return this.http.get<MiFeature[]>('/api/v1/mi-feature');
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/mi-feature/${id}`);
  }
}
```

### Paso 3: Smart Component
```typescript
// src/app/pages/mi-feature/mi-feature.component.ts
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state';
import { MiFeatureService } from '@services/mi-feature.service';
import { MiFeature } from '@models/mi-feature.model';
import { ToastService } from '@core/toast/toast.service';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

@Component({
  selector: 'app-mi-feature',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DataTableComponent, CrudPageHeaderComponent, CrudEmptyStateComponent],
  templateUrl: './mi-feature.component.html',
  styleUrl: './mi-feature.component.scss',
})
export class MiFeatureComponent extends AbstractCrudListComponent<MiFeature> implements OnInit {
  readonly store = new CrudListStore<MiFeature>({
    limit: 10,
    searchFields: ['nombre', 'codigo'],
  });

  @ViewChild('nombreCol', { static: true }) nombreCol!: TemplateRef<any>;

  tableConfig!: DataTableConfig;

  constructor(
    private svc: MiFeatureService,
    private toast: ToastService,
    protected override cdr: ChangeDetectorRef,
  ) {
    super();
  }

  ngOnInit() {
    this.buildTableConfig();
    this.load();
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'id', header: 'ID', align: 'center' },
        { key: 'nombre', header: 'Nombre', cellTemplate: this.nombreCol },
        { key: 'codigo', header: 'Código', mobile: { hide: true } },
      ],
      showActions: true,
      actions: [
        { id: 'editar', label: 'Editar', icon: ICON_EDIT },
        { id: 'eliminar', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'text-danger' },
      ],
      striped: true,
      hoverable: true,
    };
  }

  load() {
    this.store.load(this.svc.getAll(), () => this.cdr.markForCheck());
  }

  onTableAction(event: { action: string; item: MiFeature }): void {
    switch (event.action) {
      case 'editar':
        // abrir modal de edición
        break;
      case 'eliminar':
        this.svc.remove(event.item.id).subscribe(() => {
          this.toast.exito('Eliminado');
          this.load();
        });
        break;
    }
  }

  // Filtro activo/inactivo (opcional)
  protected override getActiva(item: MiFeature): boolean {
    return item.activo;
  }
}
```

### Paso 4: Template
```html
<app-crud-page-header
  title="Mi Feature"
  subtitle="Gestión de features"
  actionLabel="+ Nuevo"
  (actionClick)="openCreate()">
</app-crud-page-header>

<!-- Filtros (opcional) -->
<div class="filter-bar" *ngIf="estadoOptions.length > 0">
  <app-select [options]="estadoOptions" [value]="filterActiva" (valueChange)="onFilterActivaChange($event)">
  </app-select>
</div>

<app-crud-empty-state
  [loading]="store.loading()"
  [error]="store.loadError()"
  [empty]="!store.loading() && !store.loadError() && store.filtered().length === 0"
  (retry)="load()">
</app-crud-empty-state>

<ng-template #nombreCol let-item>
  <strong>{{ item.nombre }}</strong>
</ng-template>

<app-data-table
  *ngIf="!store.loading() && store.filtered().length > 0"
  [items]="store.paged()"
  [config]="tableConfig"
  [page]="store.page()"
  [limit]="store.limit()"
  [total]="store.filtered().length"
  [totalPages]="store.totalPages()"
  (pageChange)="onPageChange($event)"
  (limitChange)="onLimitChange($event)"
  (action)="onTableAction($event)">
</app-data-table>
```

### Paso 5: Estilos
```scss
// mi-feature.component.scss
// Solo estilos específicos de la página.
// Los estilos de tabla vienen de app-data-table.
:host {
  display: block;
  padding: var(--spacing-md);
}
```

### Paso 6: Ruta
```typescript
// src/app/app.routes.ts
{
  path: 'mi-feature',
  loadComponent: () => import('./pages/mi-feature/mi-feature.component').then(m => m.MiFeatureComponent),
}
```

---

## 8. Convenciones de estilo

| Convención | Ejemplo |
|------------|---------|
| Idioma dominio | Español (clases, interfaces, propiedades) |
| Idioma técnico | Inglés (helpers, utilidades genéricas) |
| Selectores | `app-{feature}-{subfeature}` |
| Archivos | `{feature}.component.ts`, `{feature}.service.ts` |
| Aliases | Siempre `@services/`, `@models/`, `@shared/`, `@core/`, `@auth/`, `@common/`, `@env` |
| ChangeDetection | `OnPush` en todos los componentes |
| Standalone | Sí, sin `NgModule` tradicional |

---

## 9. Componentes compartidos reutilizables

| Componente | Uso |
|------------|-----|
| `app-data-table` | Tabla genérica configurada por `DataTableConfig` |
| `app-paginator` | Paginación standalone |
| `app-action-menu` | Menú desplegable de acciones por fila |
| `app-status-badge` | Badge de estado con variantes de color |
| `app-crud-page-header` | Header de página con título, subtítulo y botón de acción |
| `app-crud-empty-state` | Estados: loading, error, empty, search-empty |
| `app-skeleton-loader` | Skeleton para estados de carga |
| `app-form-modal` | Modal reutilizable con slots para formulario y footer |
| `app-form-field` | Wrapper de campo con label, error, hint |

---

## 10. Decisiones arquitectónicas clave

### ¿Por qué signals en lugar de RxJS para estado local?
- Signals son más simples para estado sincrónico local.
- `computed()` actualiza automáticamente dependientes.
- No necesita `async` pipes ni `BehaviorSubject` boilerplate.
- RxJS se reserva para operaciones asíncronas (HTTP, eventos).

### ¿Por qué `AbstractCrudListComponent` en lugar de composición?
- La lógica de paginación/búsqueda es idéntica en ~90% de las páginas.
- Herencia es apropiada aquí porque es un **framework interno**, no una librería pública.
- Reduce repetición sin sacrificar flexibilidad (métodos son `protected`, overrideables).

### ¿Por qué `cellTemplate` en lugar de render functions?
- Templates de Angular permiten bindings, pipes, routerLinks y componentes anidados.
- Más declarativo y familiar para desarrolladores Angular.
- Funciona con `ViewChild` en el smart component.

### ¿Por qué no NgRx/Redux?
- Para listados CRUD simples, NgRx es over-engineering.
- Signals + `CrudListStore` proveen reactivity suficiente con ~1% del boilerplate.
- Sin actions, reducers, effects, ni selectors.

---

## 11. Anti-patrones a evitar

❌ **No** usar `loading`/`loadError` manuales en el componente. Usar `store.load()`.

❌ **No** iterar `desktopColumns` en el `<thead>` de `app-data-table`. Usar `visibleColumns`.

❌ **No** usar rutas relativas largas (`../../../`). Usar aliases.

❌ **No** duplicar estilos de tabla en cada página. `app-data-table` ya los provee.

❌ **No** mezclar lógica de negocio en dumb components. Smart component = orquestador.

❌ **No** migrar tablas complejas a `app-data-table` sin evaluar:
- ¿Tiene virtual scroll?
- ¿Tiene `<tfoot>` con totales?
- ¿Tiene inputs editables en celdas?
- ¿Usa server-side pagination?

Si alguna es **sí**, la tabla custom se mantiene.
