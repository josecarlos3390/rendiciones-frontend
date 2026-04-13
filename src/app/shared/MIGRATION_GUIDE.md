# Guía de Migración - Componentes Reutilizables

## 1. FormModalComponent

### Antes (modal inline en cada componente)
```html
<!-- documentos.component.html -->
<div class="modal-backdrop" *ngIf="showForm">
  <div class="doc-modal" role="dialog">
    <div class="modal-header">
      <h3>{{ isEditing ? 'Editar' : 'Nuevo' }} Documento</h3>
      <button class="modal-close" (click)="closeForm()">✕</button>
    </div>
    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="modal-body">
        <!-- campos del formulario -->
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" (click)="closeForm()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="form.invalid">Guardar</button>
      </div>
    </form>
  </div>
</div>
```

### Después (usando FormModalComponent)
```html
<!-- documentos.component.html -->
<app-form-modal
  [title]="'Documento'"
  [subtitle]="selectedPerfil?.U_NombrePerfil"
  [isOpen]="showForm"
  [loading]="isSaving"
  [isEditing]="editingId !== null"
  [submitDisabled]="form.invalid"
  (save)="save()"
  (cancel)="closeForm()">
  
  <ng-template formContent>
    <form [formGroup]="form" (ngSubmit)="save()">
      <!-- campos del formulario -->
    </form>
  </ng-template>
</app-form-modal>
```

### Importar y usar
```typescript
// documentos.component.ts
import { FormModalComponent } from '../../shared/form-modal';

@Component({
  imports: [FormModalComponent, /* otros imports */],
  // ...
})
```

---

## 2. StatusBadgeComponent

### Antes (múltiples implementaciones)
```html
<!-- Variante 1: badge-calc -->
<span class="badge-calc" [class.grossing-up]="isGU">{{ label }}</span>

<!-- Variante 2: status-badge -->
<span class="status-badge" [class.active]="isActive">{{ label }}</span>

<!-- Variante 3: badge-primary -->
<span class="badge badge-primary">{{ label }}</span>
```

### Después (componente unificado)
```html
<!-- Badge de estado abierto -->
<app-status-badge type="open" dot>Abierto</app-status-badge>

<!-- Badge de éxito -->
<app-status-badge type="success" icon="✓">Sincronizado</app-status-badge>

<!-- Badge de error -->
<app-status-badge type="danger">Error</app-status-badge>

<!-- Badge de warning -->
<app-status-badge type="warning" pill>pendiente</app-status-badge>

<!-- Badge con tipo de cálculo (reemplaza badge-calc) -->
<app-status-badge type="info">GU</app-status-badge>
<app-status-badge type="neutral">GD</app-status-badge>
```

### Tipos disponibles
- `primary` - Color primario
- `success` / `closed` / `sync` - Verde/éxito
- `warning` / `pending` - Amarillo/pendiente
- `danger` / `error` - Rojo/error
- `info` - Azul/informativo
- `neutral` / `open` - Gris/neutro

### Props adicionales
- `pill` - Bordes redondeados máximo (default: true)
- `dot` - Mostrar punto indicador
- `icon` - Emoji o carácter antes del texto
- `size` - `sm`, `md` (default), `lg`

---

## 3. Beneficios

### Mantenibilidad
- Un solo lugar para cambiar estilos de badges
- Modal consistente en todos los formularios
- Menos código duplicado

### UX consistente
- Todos los modales se comportan igual
- Badges con mismos colores y estilos
- Responsive manejado centralmente

### Desarrollo más rápido
- No hay que recrear el modal en cada formulario
- Solo importar y configurar inputs
- Templates reutilizables

---

## 4. Próximos pasos sugeridos

### Migrar formularios progresivamente
1. Empezar por formularios simples (Normas, Proyectos)
2. Luego formularios medianos (Perfiles, Dimensiones)
3. Finalmente formularios complejos (Documentos con tax-grid)

### Unificar badges en tablas
- Reemplazar todas las clases `badge-*` existentes
- Usar `StatusBadgeComponent` en columnas de estado
- Mantener consistencia visual

### Estandarizar filtros
- Crear `FilterBarComponent` reutilizable
- Unificar patrones de búsqueda y selectores
- Consistente en todos los listados
