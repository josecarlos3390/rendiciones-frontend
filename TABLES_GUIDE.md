# Guía de Tablas Responsive

## Sistema de Tablas Premium

El sistema de tablas está diseñado para funcionar perfectamente en desktop y transformarse automáticamente en cards apiladas en móvil.

---

## Estructura Básica

```html
<div class="table-wrapper">
  <div class="table-scroll-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-id">ID</th>
          <th class="col-nombre">Nombre</th>
          <th class="col-email col-hide-mobile">Email</th>
          <th class="col-monto">Monto</th>
          <th class="col-acciones">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let item of items">
          <td class="col-id col-mobile-2" data-label="ID">{{ item.id }}</td>
          <td class="col-nombre col-mobile-full" data-label="Nombre">{{ item.nombre }}</td>
          <td class="col-email col-hide-mobile" data-label="Email">{{ item.email }}</td>
          <td class="col-monto col-mobile-3" data-label="Monto">{{ item.monto | number }}</td>
          <td class="col-acciones" data-label="Acciones">
            <app-action-menu [actions]="actions" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## Atributos Importantes

### `data-label` (Obligatorio)
Cada celda (`<td>`) debe tener un `data-label` que coincida con el header de la columna. Esto se muestra como etiqueta en móvil.

```html
<td data-label="Nombre">Juan Pérez</td>
```

### Clases de Orden (`col-mobile-N`)
Controlan el orden de las columnas en el grid de móvil:

```html
<td class="col-mobile-1">Primero</td>
<td class="col-mobile-2">Segundo</td>
<td class="col-mobile-full">Toda la fila</td>
```

| Clase | Descripción |
|-------|-------------|
| `col-mobile-1` a `col-mobile-8` | Orden en el grid (1-8) |
| `col-mobile-full` | Ocupa toda la fila (grid-column: 1 / -1) |
| `col-mobile-primary` | Sin etiqueta, estilo de título |

### Clases de Visibilidad

| Clase | Desktop | Tablet | Mobile |
|-------|---------|--------|--------|
| (sin clase) | ✓ | ✓ | ✓ |
| `col-hide-tablet` | ✓ | ✗ | ✗ |
| `col-hide-mobile` | ✓ | ✓ | ✗ |
| `col-show-mobile` | ✗ | ✗ | ✓ |

---

## Diseño Recomendado por Columna

### Columna Principal (Nombre, Objetivo, Descripción)
```html
<td class="col-mobile-full" data-label="Nombre">
  {{ item.nombre }}
</td>
```
- Usa `col-mobile-full` para que ocupe toda la fila
- Es el primer elemento visual en móvil (`order: 0`)

### IDs y Códigos
```html
<td class="col-mobile-2 col-hide-mobile" data-label="ID">
  {{ item.id }}
</td>
```
- Ocultar en móvil si no es crítico
- O mostrar como `col-mobile-2` si es importante

### Montos y Números
```html
<td class="col-monto col-mobile-4" data-label="Monto">
  {{ item.monto | number:'1.2-2' }}
</td>
```
- Usar fuente monoespaciada en el CSS
- Alinear a la derecha

### Estados (Badges)
```html
<td class="col-estado col-mobile-5" data-label="Estado">
  <span class="badge" [class]="getEstadoClass(item.estado)">
    {{ item.estado }}
  </span>
</td>
```

### Acciones
```html
<td class="col-acciones" data-label="Acciones">
  <app-action-menu [actions]="actions" />
</td>
```
- Siempre al final (order: 99)
- Línea completa con borde superior

---

## Ejemplos Completos

### Tabla de Rendiciones
```html
<table class="data-table">
  <thead>
    <tr>
      <th class="col-id">N°</th>
      <th class="col-objetivo">Objetivo</th>
      <th class="col-cuenta">Cuenta</th>
      <th class="col-empleado col-hide-mobile">Empleado</th>
      <th class="col-monto">Monto</th>
      <th class="col-estado">Estado</th>
      <th class="col-acciones"></th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let r of rendiciones">
      <td class="col-id col-mobile-2" data-label="N°">{{ r.id }}</td>
      <td class="col-objetivo col-mobile-full" data-label="Objetivo">{{ r.objetivo }}</td>
      <td class="col-cuenta col-mobile-3" data-label="Cuenta">{{ r.cuenta }}</td>
      <td class="col-empleado col-hide-mobile" data-label="Empleado">{{ r.empleado }}</td>
      <td class="col-monto col-mobile-4" data-label="Monto">{{ r.monto | number }}</td>
      <td class="col-estado col-mobile-5" data-label="Estado">
        <span class="badge">{{ r.estado }}</span>
      </td>
      <td class="col-acciones" data-label="Acciones">
        <app-action-menu [actions]="actions" />
      </td>
    </tr>
  </tbody>
</table>
```

### Tabla de Usuarios
```html
<table class="data-table">
  <thead>
    <tr>
      <th class="col-nombre">Nombre</th>
      <th class="col-email col-hide-mobile">Email</th>
      <th class="col-rol">Rol</th>
      <th class="col-estado">Estado</th>
      <th class="col-acciones"></th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let u of usuarios">
      <td class="col-nombre col-mobile-full" data-label="Nombre">{{ u.nombre }}</td>
      <td class="col-email col-hide-mobile" data-label="Email">{{ u.email }}</td>
      <td class="col-rol col-mobile-2" data-label="Rol">{{ u.rol }}</td>
      <td class="col-estado col-mobile-3" data-label="Estado">
        <span class="badge">{{ u.estado }}</span>
      </td>
      <td class="col-acciones" data-label="Acciones">
        <app-action-menu [actions]="actions" />
      </td>
    </tr>
  </tbody>
</table>
```

---

## CSS Adicional por Tabla

Cada tabla puede tener estilos específicos en su archivo `.component.scss`:

```scss
// En tu-componente.component.scss

.data-table {
  // Estilos específicos de columnas
  .col-monto {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
    font-weight: var(--weight-semibold);
  }

  .col-estado .badge {
    // Tus estilos de badge
  }
}

// Responsive específico
@media (max-width: 640px) {
  .data-table {
    .col-monto {
      font-size: var(--text-lg);
      color: var(--color-primary);
    }
  }
}
```

---

## Checklist de Implementación

- [ ] Todas las celdas (`<td>`) tienen `data-label`
- [ ] Las columnas principales usan `col-mobile-full`
- [ ] Las columnas secundarias están ocultas (`col-hide-mobile`) o tienen orden (`col-mobile-N`)
- [ ] La columna de acciones está al final
- [ ] Se usa `col-hide-tablet` para columnas no críticas en tablet
- [ ] El CSS tiene estilos específicos para móvil si es necesario
- [ ] Se probó en modo oscuro y claro

---

## Archivos del Sistema

| Archivo | Descripción |
|---------|-------------|
| `src/styles/_tables.scss` | Estilos base de tablas (desktop) |
| `src/styles/_tables-mobile.scss` | Transformación a cards en móvil |
| `src/styles/_index.scss` | Importa ambos archivos |

---

## Breakpoints

- **Desktop**: > 768px — Tabla normal
- **Tablet**: 641px - 768px — Tabla con scroll horizontal
- **Mobile**: ≤ 640px — Cards apiladas
- **Mobile XS**: ≤ 360px — Cards en 1 columna
