# FormModalComponent

Componente reutilizable para modales de formulario (creación/edición) con diseño consistente y funcionalidades avanzadas.

## Características

- ✅ **Diseño consistente** en todos los formularios CRUD
- ✅ **Indicador de cambios sin guardar** (dirty state)
- ✅ **Atajos de teclado** (ESC para cerrar, Ctrl+Enter para guardar)
- ✅ **Bloqueo de scroll** del body cuando está abierto
- ✅ **Footer personalizable** o uso del footer por defecto
- ✅ **Soporte para layouts complejos** (2 columnas, etc.)
- ✅ **Navegación por tabs integrada** con botones Anterior/Siguiente

## Uso Básico

```typescript
import { FormModalComponent } from './shared/form-modal';

@Component({
  standalone: true,
  imports: [FormModalComponent, /* ... */],
  template: `
    <app-form-modal
      [title]="'Norma'"
      [subtitle]="editingItem?.code ?? null"
      [isOpen]="showForm"
      [loading]="isSaving"
      [isEditing]="editingItem !== null"
      [isDirty]="isDirty"
      [submitDisabled]="form.invalid || !isDirty"
      (save)="save()"
      (cancel)="closeForm()">
      
      <ng-template #formContent>
        <form [formGroup]="form" (ngSubmit)="save()">
          <!-- Campos del formulario -->
        </form>
      </ng-template>
    </app-form-modal>
  `
})
```

## Uso con Tabs (Navegación)

```typescript
@Component({
  template: `
    <app-form-modal
      [title]="'Documento'"
      [tabs]="tabs"
      [activeTab]="activeTab"
      [showTabNav]="true"
      (tabChange)="onTabChange($event)"
      (save)="save()"
      (cancel)="closeForm()">
      
      <ng-template #formContent>
        <!-- Contenido del formulario -->
      </ng-template>
    </app-form-modal>
  `
})
export class MyComponent {
  tabs = [
    { id: 'doc', label: 'Identificación' },
    { id: 'montos', label: 'Montos y Normas' },
    { id: 'impuestos', label: 'Cálculo Impuestos' }
  ];
  activeTab = 'doc';

  onTabChange(tabId: string) {
    this.activeTab = tabId;
  }
}
```

## API de Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `title` | `string` | `''` | Título del formulario (ej: 'Norma', 'Usuario') |
| `subtitle` | `string \| null` | `null` | Subtítulo opcional (ej: código del item en edición) |
| `isOpen` | `boolean` | `false` | Controla visibilidad del modal |
| `loading` | `boolean` | `false` | Estado de carga (deshabilita botones) |
| `isEditing` | `boolean` | `false` | Modo edición vs creación |
| `isDirty` | `boolean` | `false` | Muestra indicador ● cuando hay cambios sin guardar |
| `wide` | `boolean` | `false` | Ancho extendido (720px vs 560px) |
| `submitDisabled` | `boolean` | `false` | Deshabilita botón de guardar |
| `loadingText` | `string` | `'Guardando...'` | Texto durante carga |
| `tabs` | `FormModalTab[]` | `[]` | Array de tabs para navegación |
| `activeTab` | `string` | `''` | ID del tab activo |
| `showTabNav` | `boolean` | `false` | Muestra botones Anterior/Siguiente en footer |

### Interface FormModalTab

```typescript
interface FormModalTab {
  id: string;    // Identificador único del tab
  label: string; // Texto mostrado en el tab
}
```

## API de Outputs

| Output | Tipo | Descripción |
|--------|------|-------------|
| `save` | `EventEmitter<void>` | Emitido al hacer clic en guardar |
| `cancel` | `EventEmitter<void>` | Emitido al cerrar o cancelar |
| `tabChange` | `EventEmitter<string>` | Emitido cuando cambia el tab activo (emite el ID) |

## Content Projection (Templates)

### `#formContent` (Obligatorio)
Contiene el formulario con sus campos:

```html
<ng-template #formContent>
  <form [formGroup]="form" (ngSubmit)="save()">
    <div class="form-field">
      <label>Nombre</label>
      <input formControlName="nombre" />
    </div>
  </form>
</ng-template>
```

### `#formFooter` (Opcional)
Footer personalizado. Si no se provee, se usa el footer por defecto:

```html
<ng-template #formFooter>
  <button class="btn btn-ghost" (click)="cancel()">Cancelar</button>
  <button class="btn btn-primary" (click)="save()">Guardar</button>
</ng-template>
```

**Nota:** Si usas `showTabNav=true`, los botones Anterior/Siguiente aparecen automáticamente en el footer por defecto.

## Patrones de Uso

### 1. Formulario Simple
```html
<app-form-modal
  [title]="'Dimensión'"
  [isOpen]="showForm"
  [isEditing]="editingItem !== null"
  (save)="save()"
  (cancel)="close()">
  <ng-template #formContent>
    <form [formGroup]="form">
      <!-- campos -->
    </form>
  </ng-template>
</app-form-modal>
```

### 2. Formulario con Tabs y Navegación
```html
<app-form-modal
  [title]="'Documento'"
  [isOpen]="showForm"
  [isEditing]="editingDoc !== null"
  [tabs]="[
    { id: 'doc', label: 'Identificación' },
    { id: 'montos', label: 'Montos y Normas' },
    { id: 'impuestos', label: 'Cálculo Impuestos' }
  ]"
  [activeTab]="activeTab"
  [showTabNav]="true"
  [wide]="true"
  (tabChange)="setTab($event)"
  (save)="save()"
  (cancel)="closeForm()">
  
  <ng-template #formContent>
    <form [formGroup]="form">
      <!-- Tab 1 -->
      <div class="tab-panel" [class.active]="activeTab === 'doc'">
        <!-- campos identificación -->
      </div>
      
      <!-- Tab 2 -->
      <div class="tab-panel" [class.active]="activeTab === 'montos'">
        <!-- campos montos -->
      </div>
      
      <!-- Tab 3 -->
      <div class="tab-panel" [class.active]="activeTab === 'impuestos'">
        <!-- campos impuestos -->
      </div>
    </form>
  </ng-template>
</app-form-modal>
```

### 3. Formulario con Dirty State
```typescript
get isDirty(): boolean {
  if (!this.editingItem) return true; // Siempre dirty en modo creación
  return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.initialValues);
}
```

```html
<app-form-modal
  [isDirty]="isDirty"
  [submitDisabled]="form.invalid || !isDirty">
```

### 4. Layout de 2 Columnas (wide)
```html
<app-form-modal
  [wide]="true"
  [title]="'Usuario'">
  <ng-template #formContent>
    <form [formGroup]="form" class="modal-2col-layout">
      <div class="modal-col"><!-- izquierda --></div>
      <div class="modal-col"><!-- derecha --></div>
    </form>
  </ng-template>
</app-form-modal>
```

```scss
.modal-2col-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
```

### 5. Footer Personalizado con Lógica Condicional
```html
<ng-template #formFooter>
  <ng-container *ngIf="isDirty; else noChanges">
    <button class="btn btn-ghost" (click)="cancel()">Cancelar</button>
    <button class="btn btn-primary" (click)="save()">Guardar Cambios</button>
  </ng-container>
  <ng-template #noChanges>
    <button class="btn btn-ghost" (click)="cancel()">Cerrar</button>
  </ng-template>
</ng-template>
```

### 6. Tabs con Contenido Externo (control manual)
Si necesitas controlar el contenido de los tabs desde el componente padre:

```html
<app-form-modal
  [title]="'Documento'"
  [tabs]="tabs"
  [activeTab]="activeTab"
  (tabChange)="onTabChange($event)">
  
  <ng-template #formContent>
    <!-- Los tabs controlan qué se muestra -->
    <ng-container [ngSwitch]="activeTab">
      <app-identificacion-tab *ngSwitchCase="'doc'" />
      <app-montos-tab *ngSwitchCase="'montos'" />
      <app-impuestos-tab *ngSwitchCase="'impuestos'" />
    </ng-container>
  </ng-template>
</app-form-modal>
```

## Accesibilidad

- **ESC**: Cierra el modal (si no está cargando)
- **Ctrl+Enter**: Guarda el formulario (si es válido)
- **Scroll lock**: Previene scroll del body
- **Focus**: El modal tiene `tabindex="-1"` para recibir focus

## Componentes Relacionados

- `StatusBadgeComponent`: Para badges de estado en tablas
- `ActionMenuComponent`: Para menú de acciones en tablas

## Migración desde Modal Inline

### Antes:
```html
<div class="modal-backdrop" *ngIf="showForm">
  <div class="modal-card">
    <div class="modal-header">
      <h3>{{ editing ? 'Editar' : 'Nuevo' }}</h3>
      <button (click)="close()">✕</button>
    </div>
    <form>...</form>
    <div class="modal-footer">...</div>
  </div>
</div>
```

### Después:
```html
<app-form-modal
  [title]="'Item'"
  [isOpen]="showForm"
  [isEditing]="editing !== null"
  (save)="save()"
  (cancel)="close()">
  <ng-template #formContent>
    <form>...</form>
  </ng-template>
</app-form-modal>
```

## Notas de Implementación

1. **Siempre usar `#formContent`** con `<form>` dentro
2. **Preservar validaciones** existentes del formulario
3. **Mantener `isDirty`** para mejor UX
4. **Usar `[wide]="true"`** solo para formularios complejos
5. **Usar `showTabNav="true"`** para navegación con tabs integrada
6. **Los tabs se renderizan automáticamente** cuando se proporciona el array `tabs`
