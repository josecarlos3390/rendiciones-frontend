# 📋 Guía de Estandarización de Tablas Móvil

## Principio Fundamental

**TODAS las tablas deben verse IGUALES en móvil.** No más CSS personalizado por tabla.

---

## 🎯 Reglas de Oro

1. **Usar clases CSS globales** → No escribir SCSS personalizado
2. **data-label en TODAS las celdas** → Requerido para móvil
3. **col-mobile-primary en el título principal** → Siempre primero
4. **col-mobile-money en valores monetarios** → Consistencia visual
5. **Acciones siempre al final** → Automático con `data-label="Acciones"`

---

## 📦 Clases Disponibles

### Layout
```
col-mobile-full      → Ocupa todo el ancho
```

### Destacado
```
col-mobile-primary   → Título principal (full width, sin label)
col-mobile-money     → Valor monetario (color primario)
col-mobile-total     → Total destacado (más grande)
col-mobile-small     → Valor pequeño (impuestos)
col-mobile-muted     → Texto atenuado
```

### Alineación
```
col-mobile-left      → Alineado izquierda
col-mobile-center    → Centrado
col-mobile-right     → Alineado derecha (útil para fechas/montos)
```

### Badges
```
col-mobile-badge     → Centrado (para badges de estado)
```

### Separadores
```
col-mobile-border-top/bottom       → Separador sutil
col-mobile-separator-top           → Separador fuerte
```

### Semántica (colores)
```
col-mobile-success   → Verde (aprobado, positivo)
col-mobile-danger    → Rojo (rechazado, negativo)
col-mobile-warning   → Amarillo (pendiente)
col-mobile-info      → Azul (informativo)
```

### Densidad
```
col-mobile-compact   → Menos espacio vertical
col-mobile-expanded  → Más espacio vertical
```

### Ocultamiento
```
col-hide-mobile      → Oculta en móvil
```

---

## 💡 Ejemplos de Tablas Estándar

### Ejemplo 1: Tabla Simple (Rendiciones)

```html
<table class="data-table">
  <tbody>
    <tr *ngFor="let item of items">
      <!-- Título principal -->
      <td class="col-mobile-primary" data-label="Objetivo">
        {{ item.objetivo }}
      </td>
      
      <!-- Cuenta -->
      <td data-label="Cuenta">
        {{ item.cuenta }}
      </td>
      
      <!-- Monto destacado -->
      <td class="col-mobile-money" data-label="Monto">
        {{ item.monto | currency }}
      </td>
      
      <!-- Estado con badge -->
      <td class="col-mobile-badge" data-label="Estado">
        <span class="badge" [ngClass]="item.estado">{{ item.estado }}</span>
      </td>
      
      <!-- Fecha alineada derecha -->
      <td class="col-mobile-right" data-label="Fecha">
        {{ item.fecha | date }}
      </td>
      
      <!-- Acciones (siempre al final, automático) -->
      <td data-label="Acciones">
        <button>...</button>
      </td>
    </tr>
  </tbody>
</table>
```

### Ejemplo 2: Tabla de Documentos

```html
<table class="data-table">
  <tbody>
    <tr *ngFor="let doc of documentos">
      <!-- Concepto como título -->
      <td class="col-mobile-primary" data-label="Concepto">
        {{ doc.concepto }}
      </td>
      
      <!-- Fecha -->
      <td data-label="Fecha">
        {{ doc.fecha | date:'dd/MM/yyyy' }}
      </td>
      
      <!-- Número de documento -->
      <td data-label="Nro. Doc">
        {{ doc.numero }}
      </td>
      
      <!-- Importe base -->
      <td class="col-mobile-money" data-label="Importe">
        {{ doc.importe | currency }}
      </td>
      
      <!-- Total alineado derecha -->
      <td class="col-mobile-total col-mobile-right" data-label="Total">
        {{ doc.total | currency }}
      </td>
      
      <!-- Acciones -->
      <td data-label="Acciones">
        <app-action-menu></app-action-menu>
      </td>
    </tr>
  </tbody>
</table>
```

### Ejemplo 3: Tabla de Usuarios

```html
<table class="data-table">
  <tbody>
    <tr *ngFor="let user of usuarios">
      <!-- Nombre usuario -->
      <td class="col-mobile-primary" data-label="Usuario">
        {{ user.nombre }}
      </td>
      
      <!-- Email -->
      <td class="col-mobile-full col-mobile-muted" data-label="Email">
        {{ user.email }}
      </td>
      
      <!-- Rol -->
      <td data-label="Rol">
        {{ user.rol }}
      </td>
      
      <!-- Estado con color semántico -->
      <td [class.col-mobile-success]="user.activo"
          [class.col-mobile-danger]="!user.activo" 
          data-label="Estado">
        {{ user.activo ? 'Activo' : 'Inactivo' }}
      </td>
      
      <!-- Acciones -->
      <td data-label="Acciones">
        <app-action-menu></app-action-menu>
      </td>
    </tr>
  </tbody>
</table>
```

### Ejemplo 4: Tabla de Aprobaciones (con separadores)

```html
<table class="data-table">
  <tbody>
    <tr *ngFor="let item of aprobaciones">
      <!-- Solicitante -->
      <td class="col-mobile-primary" data-label="Solicitante">
        {{ item.solicitante }}
      </td>
      
      <!-- Objetivo con separador -->
      <td class="col-mobile-full col-mobile-border-bottom" data-label="Objetivo">
        {{ item.objetivo }}
      </td>
      
      <!-- Monto -->
      <td class="col-mobile-money col-mobile-border-top" data-label="Monto">
        {{ item.monto | currency }}
      </td>
      
      <!-- Fecha solicitud -->
      <td class="col-mobile-right" data-label="Fecha">
        {{ item.fechaSolicitud | date }}
      </td>
      
      <!-- Botones de acción -->
      <td data-label="Acciones">
        <button class="btn-success">Aprobar</button>
        <button class="btn-danger">Rechazar</button>
      </td>
    </tr>
  </tbody>
</table>
```

---

## 🔧 Patrones Comunes

### Patrón 1: Título + 2 Columnas
```
┌─────────────────────────────┐
│ TITULO PRINCIPAL (primary)  │
├─────────────┬───────────────┤
│ Label A     │ Label B       │
│ Valor A     │ Valor B       │
├─────────────┼───────────────┤
│ Label C     │ Label D       │
│ Valor C     │ Valor D       │
├─────────────┴───────────────┤
│ [Acciones]                  │
└─────────────────────────────┘
```

### Patrón 2: Montos Destacados
```
┌─────────────────────────────┐
│ CONCEPTO (primary)          │
├─────────────┬───────────────┤
│ Fecha       │ Base          │
│ 01/01/24    │ $ 100.00      │
├─────────────┼───────────────┤
│ Impuesto    │ TOTAL (total) │
│ $ 13.00     │ $ 113.00      │
├─────────────┴───────────────┤
│ [Acciones]                  │
└─────────────────────────────┘
```

### Patrón 3: Con Subtítulo
```
┌─────────────────────────────┐
│ NOMBRE (primary)            │
│ email@ejemplo.com (muted)   │
├─────────────┬───────────────┤
│ Rol         │ Estado        │
│ Admin       │ Activo        │
├─────────────┴───────────────┤
│ [Acciones]                  │
└─────────────────────────────┘
```

---

## ⚠️ Qué NO Hacer

❌ **No escribir SCSS personalizado para cada tabla**  
❌ **No usar diferentes breakpoints por tabla**  
❌ **No omitir data-label**  
❌ **No usar más de 2 columnas en móvil**  
❌ **No poner acciones antes del contenido**  

✅ **Sí usar las clases globales existentes**  
✅ **Sí mantener el orden: Título → Datos → Acciones**  
✅ **Sí usar col-mobile-primary para el campo principal**  
✅ **Sí usar col-mobile-money para valores monetarios**

---

## 🚀 Beneficios

1. **Uniformidad**: Todas las tablas se ven igual
2. **Mantenibilidad**: Un solo archivo CSS para todas
3. **Velocidad**: Solo agregar clases al HTML
4. **Testing**: Predecible, un solo estilo que probar
5. **Escalabilidad**: Nuevas tablas en minutos

---

## 📱 Preview Visual

Todas las tablas móviles deben verse así:

```
┌─────────────────────────────────────┐
│  Título Principal (col-mobile-      │
│  primary)                           │
├────────────────┬────────────────────┤
│  FECHA         │  MONTO             │
│  01/01/2024    │  $ 1,234.56        │
│                │  (col-mobile-money)│
├────────────────┼────────────────────┤
│  ESTADO        │  TOTAL             │
│  [Pendiente]   │  $ 1,500.00        │
│  (badge)       │  (col-mobile-total)│
├────────────────┴────────────────────┤
│  [Editar] [Eliminar] [Ver]          │
│  (Acciones - siempre al final)      │
└─────────────────────────────────────┘
```
