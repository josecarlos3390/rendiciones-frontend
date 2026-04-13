# AGENTS.md - Rendiciones Frontend

> Guía para agentes de código trabajando en el frontend Angular.

---

## Arquitectura de Componentes Compartidos

### FormModalComponent

Componente reutilizable para modales de formulario con soporte para tabs y navegación. Documentación completa en:
📄 `src/app/shared/form-modal/README.md`

**Uso básico:**
```typescript
import { FormModalComponent } from './shared/form-modal';

@Component({
  imports: [FormModalComponent],
  template: `
    <app-form-modal
      [title]="'Norma'"
      [isOpen]="showForm"
      [isEditing]="editingItem !== null"
      [isDirty]="isDirty"
      (save)="save()"
      (cancel)="closeForm()">
      <ng-template #formContent>
        <form [formGroup]="form">...</form>
      </ng-template>
    </app-form-modal>
  `
})
```

**Uso con Tabs y Navegación:**
```typescript
@Component({
  template: `
    <app-form-modal
      [title]="'Documento'"
      [tabs]="tabs"
      [activeTab]="activeTab"
      [showTabNav]="true"
      (tabChange)="setTab($event)"
      (save)="save()"
      (cancel)="closeForm()">
      <ng-template #formContent>
        <form [formGroup]="form">
          <div class="tab-panel" [class.active]="activeTab === 'doc'">...</div>
          <div class="tab-panel" [class.active]="activeTab === 'montos'">...</div>
        </form>
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

  setTab(tabId: string) {
    this.activeTab = tabId;
  }
}
```

**Características del modo Tabs:**
- Tabs visuales en la parte superior del modal
- Botones "← Anterior" / "Siguiente →" en el footer (cuando `showTabNav="true"`)
- Navegación automática deshabilitada en primer/último tab
- Evento `tabChange` emite el ID del tab seleccionado

### StatusBadgeComponent

Badges de estado unificados para toda la aplicación.

**Uso:**
```html
<app-status-badge [type]="'success'" [dot]="true">Activo</app-status-badge>
<app-status-badge [type]="item.activa ? 'success' : 'neutral'">
  {{ item.activa ? 'Activa' : 'Inactiva' }}
</app-status-badge>
```

**Tipos disponibles:**
- `'success'` - Verde (activo, completado, éxito)
- `'danger'` - Rojo (error, eliminado, rechazado)
- `'warning'` - Naranja (advertencia, pendiente)
- `'info'` - Azul (información, enviado)
- `'neutral'` - Gris (inactivo, default)
- `'open'` / `'closed'` - Estados específicos
- `'sync'` - Sincronización

### ActionMenuComponent

Menú de acciones con posicionamiento fijo para tablas.

**Uso:**
```html
<app-action-menu
  [actions]="menuItems"
  [itemLabel]="item.nombre"
  (actionClick)="onAction($event, item)">
</app-action-menu>
```

### FormFieldComponent

Campo de formulario estandarizado con validación automática, hints y errores.

**Uso:**
```html
<app-form-field 
  label="Nombre" 
  [required]="true"
  controlName="nombre"
  hint="Máximo 100 caracteres">
  <input type="text" formControlName="nombre" />
</app-form-field>
```

**Documentación:** 📄 `src/app/shared/form-field/README.md`

### FormDirtyService

Servicio para gestionar estado "dirty" (cambios sin guardar) de formularios.

**Uso:**
```typescript
constructor(private dirtyService: FormDirtyService) {}

get isDirty(): boolean {
  return this.dirtyService.isDirty(this.form, this.initialValues);
}

// Crear snapshot al abrir formulario
this.initialValues = this.dirtyService.createSnapshot(this.form);

// Resetear después de guardar
this.initialValues = this.dirtyService.resetDirty(this.form);
```

**Documentación:** 📄 `src/app/shared/form-dirty/README.md`

---

## Convenciones de Migración

### Migrando de Modal Inline a FormModalComponent

1. **Agregar imports:**
   ```typescript
   import { FormModalComponent } from '../../shared/form-modal';
   import { StatusBadgeComponent } from '../../shared/status-badge';
   ```

2. **Reemplazar estructura del modal:**
   ```html
   <!-- ANTES -->
   <div class="modal-backdrop" *ngIf="showForm">...</div>
   
   <!-- DESPUÉS -->
   <app-form-modal [isOpen]="showForm" ...>...</app-form-modal>
   ```

3. **Preservar:**
   - Lógica de `isDirty`
   - Validaciones de formulario
   - Comportamiento de campos deshabilitados en edición
   - Footer personalizado si tiene lógica especial

4. **Actualizar badges de estado en tablas:**
   ```html
   <!-- ANTES -->
   <span class="status-badge" [class.active]="item.activa">...</span>
   
   <!-- DESPUÉS -->
   <app-status-badge [type]="item.activa ? 'success' : 'neutral'" [dot]="true">
     ...
   </app-status-badge>
   ```

---

## Estandarización Completada ✅

### Migración a ChangeDetectionStrategy.OnPush

**Estado: COMPLETADO** - Todos los componentes del sistema usan `OnPush`:

| Área | Componentes | Estado |
|------|-------------|--------|
| **Pages** | 27/27 | ✅ 100% |
| **Shared** | 35/35 | ✅ 100% |
| **Core** | 7/7 | ✅ 100% |
| **Total** | **69/69** | ✅ **100%** |

**Cambios aplicados:**
- ✅ Eliminados todos los `detectChanges()` → reemplazados por `markForCheck()`
- ✅ Eliminados `NgZone` y `ApplicationRef.tick()` innecesarios
- ✅ Todos los componentes con operaciones async usan `markForCheck()`

**Nota sobre VirtualTableBodyComponent:**
El componente `virtual-table-body` fue simplificado temporalmente (eliminado CDK Virtual Scroll) para resolver problemas de compatibilidad con OnPush. Usa `ngFor` simple mientras se investiga una solución robusta con virtual scroll. Ver el TODO en el componente.

### Migración de Modales a FormModalComponent

- ✅ **19 componentes** migrados
- ✅ **28+ modales** estandarizados
- ✅ **UI consistente** en toda la aplicación
- ✅ **Navegación por tabs integrada** - Tabs con botones Anterior/Siguiente

### Próximos Pasos Sugeridos

1. **Refactorizar Rend-D** - Separar en sub-componentes (componente monolítico ~1,800 líneas)
2. **Tests unitarios** - Agregar tests para componentes compartidos
3. **Mejorar accesibilidad (A11y)** - aria-labels, skip links, focus trap

---

## Estructura de Carpetas

```
src/app/
├── shared/                    # Componentes reutilizables
│   ├── form-modal/           # Modal de formularios
│   ├── status-badge/         # Badges de estado
│   ├── action-menu/          # Menú de acciones
│   ├── paginator/            # Paginación
│   ├── search-input/         # Búsqueda con debounce
│   └── ...
├── core/                     # Servicios globales, layout, toast
├── pages/                    # Componentes de página
└── models/                   # Interfaces TypeScript
```

---

## Build y Desarrollo

```bash
# Desarrollo
npm run start

# Build producción
npm run build

# Testing
npm run test
```

---

## Change Detection - Guía Rápida

Todos los componentes usan `ChangeDetectionStrategy.OnPush`. Patrón obligatorio:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiComponente {
  constructor(private cdr: ChangeDetectorRef) {}

  loadData() {
    this.loading = true;
    this.cdr.markForCheck(); // ✅ Notificar antes del async
    
    this.service.getData().subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
        this.cdr.markForCheck(); // ✅ Notificar después de cambios
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck(); // ✅ También en error
      }
    });
  }
}
```

### Reglas Importantes

| ✅ DO | ❌ DON'T |
|-------|----------|
| `cdr.markForCheck()` después de cambios async | `NgZone.run()` |
| `cdr.markForCheck()` en callbacks de errores | `setTimeout(() => cdr.detectChanges())` |
| Inyectar `ChangeDetectorRef` en constructor | Usar `detectChanges()` en múltiples lugares |

### Cuándo usar `detectChanges()` (excepciones)

En la mayoría de los casos usar `markForCheck()`, pero hay excepciones:

**Usar `detectChanges()` cuando:**
- La carga inicial de datos no actualiza la vista (ej: `rend-d.component.ts`)
- El componente usa virtual scrolling (`*cdkVirtualFor`)
- Hay componentes hijos con OnPush que no reciben el evento de cambio

```typescript
// Ejemplo: Carga inicial en componente complejo
loadData() {
  this.loading = true;
  this.cdr.markForCheck();
  
  this.service.getData().subscribe({
    next: (data) => {
      this.data = data;
      this.loading = false;
      // Para carga inicial con virtual scroll, usar detectChanges()
      this.cdr.detectChanges();
    },
    error: () => {
      this.loading = false;
      this.cdr.markForCheck(); // Error puede usar markForCheck
    }
  });
}
```

---

## Notas Técnicas

- **Angular 21** con componentes standalone
- **SCSS** con variables CSS para theming
- **FormModalComponent** bloquea scroll del body automáticamente
- **Atajos de teclado:** ESC (cerrar), Ctrl+Enter (guardar)
- **Virtual Scrolling** con `@angular/cdk/scrolling` en tablas grandes
