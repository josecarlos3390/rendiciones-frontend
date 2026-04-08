# Patrones de Diseño Centralizados - Sistema de Rendiciones

Este documento define los patrones estándar que deben seguir TODOS los componentes del sistema para mantener consistencia visual.

## 📋 Índice

1. [Estructura de Página](#estructura-de-página)
2. [Filtros](#filtros)
3. [Tablas](#tablas)
4. [Modales](#modales)
5. [Formularios](#formularios)
6. [Botones](#botones)
7. [Badges](#badges)
8. [Toggles](#toggles)
9. [Estados de Carga y Vacío](#estados-de-carga-y-vacío)

---

## Estructura de Página

```html
<!-- Header de página -->
<div class="page-header">
  <div class="page-title-group">
    <h2>Título de la Página</h2>
    <p class="page-subtitle">Descripción opcional de la página.</p>
  </div>
  <button class="btn btn-primary btn-sm" (click)="openNew()">+ Nuevo</button>
</div>
```

**Clases disponibles:**
- `.page-header` - Contenedor del header
- `.page-title-group` - Grupo de título + subtítulo
- `.page-subtitle` - Subtítulo descriptivo (opcional)

---

## Filtros

```html
<div class="filter-bar">
  <div class="filter-left">
    <div class="filter-field">
      <label>Campo</label>
      <input type="text" class="search-input" />
      <!-- o -->
      <select class="filter-select">
        <option>Opción</option>
      </select>
    </div>
    <button class="btn btn-ghost btn-sm">Limpiar</button>
  </div>
  <span class="filter-count">{{ filtered.length }} resultado(s)</span>
</div>
```

**Clases disponibles:**
- `.filter-bar` - Contenedor principal
- `.filter-left` - Grupo de filtros a la izquierda
- `.filter-field` - Campo individual con label
- `.filter-select` - Select estilizado
- `.filter-date` - Input de fecha
- `.filter-count` - Contador de resultados

---

## Tablas

```html
<div class="table-wrapper" *ngIf="!loading && !loadError && filtered.length > 0">
  <table class="data-table">
    <thead>
      <tr>
        <th>Columna 1</th>
        <th class="text-center">Columna 2</th>
        <th class="text-right">Columna 3</th>
        <th class="actions">Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let item of paged">
        <td data-label="Columna 1">{{ item.valor }}</td>
        <td class="text-center" data-label="Columna 2">{{ item.valor2 }}</td>
        <td class="text-right col-mono" data-label="Columna 3">{{ item.valor3 }}</td>
        <td class="actions">
          <button class="btn btn-icon btn-sm btn-ghost" title="Editar">
            <svg>...</svg>
          </button>
          <button class="btn btn-icon btn-sm btn-danger-soft" title="Eliminar">
            <svg>...</svg>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Paginador -->
<app-paginator
  *ngIf="!loading && !loadError && filtered.length > 0"
  [page]="page"
  [limit]="limit"
  [total]="filtered.length"
  [totalPages]="totalPages"
  (pageChange)="onPageChange($event)"
  (limitChange)="onLimitChange($event)">
</app-paginator>
```

**Clases disponibles:**
- `.table-wrapper` - Contenedor con scroll horizontal
- `.data-table` - Tabla estilizada
- `.col-mono` - Columna con fuente monoespaciada
- `.text-center` - Alineación centrada
- `.text-right` - Alineación derecha
- `.actions` - Celda de acciones
- `data-label` - Label para vista mobile

---

## Modales

```html
<div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
  <div class="modal-card" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
    
    <div class="modal-header">
      <h3>{{ editing ? 'Editar' : 'Nuevo' }} Item</h3>
      <button class="modal-close" type="button" (click)="closeModal()">✕</button>
    </div>

    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="modal-body">
        <!-- Contenido del formulario -->
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" (click)="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="saving || form.invalid">
          {{ saving ? 'Guardando...' : (editing ? '💾 Guardar cambios' : 'Crear') }}
        </button>
      </div>
    </form>
    
  </div>
</div>
```

**Clases disponibles:**
- `.modal-backdrop` - Fondo oscuro semitransparente
- `.modal-card` - Contenedor del modal
- `.modal-header` - Header con título y botón cerrar
- `.modal-body` - Cuerpo del modal
- `.modal-footer` - Footer con botones de acción
- `.modal-close` - Botón de cierre (✕)

**Variantes de tamaño:**
- `.modal-card--sm` - 360px máximo
- `.modal-card--lg` - 720px máximo
- `.modal-card--xl` - 960px máximo

---

## Formularios

```html
<div class="form-field">
  <label>Campo <span class="required">*</span></label>
  <input 
    type="text"
    formControlName="campo"
    placeholder="Placeholder"
    [class.input-error]="form.get('campo')?.touched && form.get('campo')?.errors"
  />
  <span class="field-hint">Texto de ayuda opcional</span>
  <span class="field-error" *ngIf="form.get('campo')?.touched && form.get('campo')?.errors">
    Mensaje de error
  </span>
</div>

<!-- Toggle -->
<div class="form-field form-field-toggle">
  <label>Activo</label>
  <div class="toggle-wrapper">
    <label class="u-toggle">
      <input type="checkbox" formControlName="activo" />
      <span class="u-toggle-slider"></span>
    </label>
    <span class="toggle-status" [class.active]="form.get('activa')?.value">
      {{ form.get('activa')?.value ? 'ACTIVO' : 'INACTIVO' }}
    </span>
  </div>
</div>
```

**Clases disponibles:**
- `.form-field` - Contenedor de campo
- `.form-field-toggle` - Variante para toggles
- `.required` - Indicador de campo obligatorio (*)
- `.field-hint` - Texto de ayuda
- `.field-error` - Mensaje de error
- `.input-error` - Estilo de input con error

---

## Botones

```html
<!-- Primario -->
<button class="btn btn-primary">Guardar</button>
<button class="btn btn-primary btn-sm">+ Nuevo</button>

<!-- Secundario/Ghost -->
<button class="btn btn-ghost">Cancelar</button>
<button class="btn btn-ghost btn-sm">Limpiar</button>

<!-- Peligro -->
<button class="btn btn-danger-soft">Eliminar</button>

<!-- Icono -->
<button class="btn btn-icon btn-sm btn-ghost" title="Editar">
  <svg>...</svg>
</button>
```

**Clases disponibles:**
- `.btn` - Base
- `.btn-primary` - Acción principal
- `.btn-ghost` - Acción secundaria
- `.btn-danger-soft` - Acción de eliminación
- `.btn-icon` - Solo icono
- `.btn-sm` - Tamaño pequeño

---

## Badges

```html
<!-- Estados -->
<span class="badge badge-success">Activo</span>
<span class="badge badge-secondary">Inactivo</span>
<span class="badge badge-warning">Pendiente</span>
<span class="badge badge-danger">Error</span>
<span class="badge badge-info">Info</span>
<span class="badge badge-primary">Primary</span>

<!-- Códigos/Monedas -->
<span class="code-tag">USD</span>
<span class="code-tag">CC-001</span>
```

**Clases disponibles:**
- `.badge` - Base
- `.badge-success` / `.badge-activo` - Verde
- `.badge-secondary` / `.badge-inactivo` - Gris
- `.badge-warning` - Amarillo
- `.badge-danger` - Rojo
- `.badge-info` - Azul
- `.badge-primary` - Color primario
- `.code-tag` - Para códigos y monedas

---

## Toggles

```html
<!-- Básico -->
<label class="u-toggle">
  <input type="checkbox" [(ngModel)]="activo" />
  <span class="u-toggle-slider"></span>
</label>

<!-- Con label -->
<div class="toggle-wrapper">
  <label class="u-toggle">
    <input type="checkbox" [(ngModel)]="activo" />
    <span class="u-toggle-slider"></span>
  </label>
  <span class="toggle-status" [class.active]="activo">
    {{ activo ? 'ACTIVO' : 'INACTIVO' }}
  </span>
</div>

<!-- Tamaños -->
<label class="u-toggle u-toggle--sm">...</label>
<label class="u-toggle u-toggle--lg">...</label>
```

**Clases disponibles:**
- `.u-toggle` - Toggle base
- `.u-toggle-slider` - Slider del toggle
- `.u-toggle--sm` - Pequeño
- `.u-toggle--lg` - Grande
- `.toggle-wrapper` - Contenedor con label
- `.toggle-status` - Texto de estado

---

## Estados de Carga y Vacío

```html
<!-- Loading -->
<div *ngIf="loading" class="empty-state">Cargando...</div>

<!-- Error -->
<div *ngIf="!loading && loadError" class="empty-state">
  Error al cargar los datos.
  <a (click)="load()">Reintentar</a>
</div>

<!-- Vacío -->
<div *ngIf="!loading && !loadError && filtered.length === 0" class="empty-state">
  No hay registros.
  <a (click)="openNew()">Crear el primero</a>
</div>
```

**Clases disponibles:**
- `.empty-state` - Estado vacío/carga/error

---

## Variables CSS del Tema

Siempre usar estas variables en lugar de valores hardcodeados:

### Colores de fondo
- `--bg-page` - Fondo de página
- `--bg-surface` - Superficies (cards, modales)
- `--bg-faint` - Fondo sutil
- `--bg-subtle` - Fondo ligeramente marcado

### Colores de texto
- `--text-body` - Texto principal
- `--text-heading` - Títulos
- `--text-muted` - Texto secundario
- `--text-faint` - Texto muy sutil

### Colores de estado
- `--color-primary` - Color principal
- `--color-primary-bg` - Fondo primario sutil
- `--color-primary-text` - Texto primario
- `--color-primary-border` - Borde primario

### Estados
- `--status-open-*` - Abierto/pendiente (azul)
- `--status-closed-*` - Cerrado/éxito (verde)
- `--status-cancelled-*` - Cancelado/error (rojo)
- `--status-sent-*` - Enviado (naranja)

### Bordes y sombras
- `--border-color` - Borde estándar
- `--border-soft` - Borde sutil
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` - Radios
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-modal` - Sombras

---

## ❌ Qué NO hacer

1. **NO usar colores hardcodeados** como `#1976d2`, `#ccc`, `#333`
2. **NO crear clases propias** para modales (`.mi-modal`, `.modal-especial`)
3. **NO crear toggles personalizados** - Usar `.u-toggle`
4. **NO crear badges con colores fijos** - Usar las clases `.badge-*`
5. **NO redefinir estilos** de componentes globales en archivos locales

---

## ✅ Checklist para Nuevos Componentes

- [ ] Usa `.page-header` con `.page-title-group`
- [ ] Usa `.filter-bar` para filtros
- [ ] Usa `.table-wrapper` + `.data-table` para tablas
- [ ] Usa `.modal-backdrop` + `.modal-card` para modales
- [ ] Usa `.btn`, `.btn-primary`, `.btn-ghost` para botones
- [ ] Usa `.badge-*` para estados
- [ ] Usa `.u-toggle` para switches
- [ ] Usa variables CSS del tema
- [ ] NO hay colores hardcodeados
- [ ] NO hay clases CSS propias duplicando funcionalidad global

---

## 🆘 Ayuda

Si necesitas un patrón que no está documentado aquí:
1. Revisa los componentes existentes que sí siguen el patrón (ej: `normas`, `tipo-cambio`, `cuentas-cabecera`)
2. Consulta los archivos en `src/styles/_*.scss`
3. Pregunta al equipo antes de crear algo nuevo
