# 📱 Guía de UX/UI para Tablas Móvil

## 🎯 Principio de Diseño

> **"El usuario debe encontrar lo importante en 2 segundos"**

---

## 📐 Patrón Visual Estándar

Todas las tablas móviles deben seguir este patrón de tarjeta:

```
┌─────────────────────────────────────┐
│ 🔷 CONCEPTO / TÍTULO PRINCIPAL      │  ← col-mobile-primary
│    (ID + Descripción)               │
├─────────────────────────────────────┤
│  📅 FECHA        💼 TIPO DOC        │
│  12/01/2024      Factura            │
├─────────────────────────────────────┤
│  🏢 PROVEEDOR                       │
│  Empresa XYZ S.A.                   │
├─────────────────────────────────────┤
│  💰 IMPORTE      ➖ DESCUENTOS      │
│  $ 1,234.56      $ 100.00           │
├─────────────────────────────────────┤
│  📊 BASE IMP.    💵 TOTAL           │  ← col-mobile-total
│  $ 1,134.56      $ 1,250.00         │
├─────────────────────────────────────┤
│  [🟡 Pendiente]         [⚙️ Acciones]│  ← Badge + Acciones
└─────────────────────────────────────┘
```

---

## 📝 Orden de Campos Estándar

### 1. IDENTIFICACIÓN (Primero - Full Width)
```html
<td class="col-mobile-primary" data-label="Documento">
  #{{id}} - {{concepto}}
</td>
```

### 2. METADATOS (Segunda fila - 2 columnas)
```html
<td data-label="Fecha">{{fecha}}</td>
<td data-label="Tipo">{{tipo}}</td>
```

### 3. ENTIDAD (Tercera fila - Full Width si es largo)
```html
<td class="col-mobile-full" data-label="Proveedor">
  {{proveedor}}
</td>
```

### 4. VALORES (Cuarta fila - 2 columnas)
```html
<td class="col-mobile-money" data-label="Importe">
  {{importe | currency}}
</td>
<td class="col-mobile-money" data-label="Descuento">
  {{descuento | currency}}
</td>
```

### 5. TOTAL (Quinta fila - destacado)
```html
<td class="col-mobile-full col-mobile-total col-mobile-right" data-label="Total">
  {{total | currency}}
</td>
```

### 6. ESTADO Y ACCIONES (Última fila)
```html
<td class="col-mobile-badge" data-label="Estado">
  <span class="badge">{{estado}}</span>
</td>
<td data-label="Acciones">
  <app-action-menu>...</app-action-menu>
</td>
```

---

## 🎨 Jerarquía Visual

### Prioridad de Información

| Prioridad | Tipo de Dato | Clase CSS | Ejemplo |
|-----------|--------------|-----------|---------|
| 1 🔴 | Identificación | `col-mobile-primary` | #123 - Compra de insumos |
| 2 🟠 | Valores principales | `col-mobile-total` | $ 1,500.00 |
| 3 🟡 | Valores secundarios | `col-mobile-money` | $ 1,234.56 |
| 4 🟢 | Metadatos | (default) | Fecha, Tipo, N° Doc |
| 5 🔵 | Estado | `col-mobile-badge` | [Pendiente] |
| 6 ⚪ | Acciones | `data-label="Acciones"` | [⚙️] |

### Reglas de Espaciado

```css
/* Card base */
border-radius: 16px;
padding: 16px;
gap: 12px;

/* Separadores lógicos */
col-mobile-primary     → border-bottom + padding-bottom
Acciones               → border-top + padding-top (separado del contenido)
```

---

## 🚫 Qué NO hacer en Móvil

| ❌ Mal | ✅ Bien |
|--------|---------|
| 14 columnas visibles | Máximo 6-8 datos relevantes |
| Acciones al principio | Acciones al final |
| Todos los impuestos separados | Solo Total destacado, detalles colapsados |
| Datos técnicos primero | Concepto/Título primero |
| Múltiples números pequeños | 2-3 valores monetarios clave |
| Códigos sin contexto | Código + Nombre |

---

## 📋 Plantillas por Tipo de Tabla

### Tipo A: Rendiciones/Cabeceras
```
┌─────────────────────────────────────┐
│ #123 - Viaje a Santa Cruz           │
├────────────────┬────────────────────┤
│ Fecha: 12/01   │ Cuenta: 1101-001   │
├────────────────┼────────────────────┤
│ Empleado: Juan │ Estado: [Pendiente]│
├────────────────┴────────────────────┤
│ 💵 TOTAL: $ 2,500.00                │
├─────────────────────────────────────┤
│                      [⚙️ Acciones]  │
└─────────────────────────────────────┘
```

### Tipo B: Documentos/Detalle
```
┌─────────────────────────────────────┐
│ Factura - Compra de insumos         │
├────────────────┬────────────────────┤
│ Fecha: 12/01   │ N°: 001-001-1234   │
├────────────────┴────────────────────┤
│ Proveedor: Empresa XYZ S.A.         │
├────────────────┬────────────────────┤
│ Importe: $1000 │ Desc: $100         │
├────────────────┼────────────────────┤
│ Base: $900     │ TOTAL: $1,130      │
├────────────────┴────────────────────┤
│ [Aprobado]            [⚙️ Acciones] │
└─────────────────────────────────────┘
```

### Tipo C: Configuración/Maestros
```
┌─────────────────────────────────────┐
│ Factura - Compra Local              │
├────────────────┬────────────────────┤
│ Código: 1      │ SAP: FAC_LOC       │
├────────────────┼────────────────────┤
│ IVA: 13%       │ IT: 3%             │
├────────────────┴────────────────────┤
│                      [⚙️ Acciones]  │
└─────────────────────────────────────┘
```

---

## 🔧 Implementación Rápida

### Paso 1: Identificar datos relevantes
```typescript
// Móvil: Solo lo esencial
const datosMovil = {
  id: documento.id,           // Siempre visible
  concepto: documento.nombre, // Título
  fecha: documento.fecha,     // Metadato
  entidad: documento.prov,    // Quién
  monto: documento.importe,   // Cuánto
  total: documento.total,     // Total
  estado: documento.estado    // Estado
};
```

### Paso 2: Aplicar clases en orden
```html
<tr>
  <!-- 1. TÍTULO -->
  <td class="col-mobile-primary" data-label="Documento">
    #{{d.id}} - {{d.concepto}}
  </td>
  
  <!-- 2. METADATOS -->
  <td data-label="Fecha">{{d.fecha | date}}</td>
  <td data-label="N°">{{d.numero}}</td>
  
  <!-- 3. ENTIDAD -->
  <td class="col-mobile-full" data-label="Proveedor">
    {{d.proveedor}}
  </td>
  
  <!-- 4. MONTOS -->
  <td class="col-mobile-money" data-label="Importe">{{d.importe | currency}}</td>
  <td class="col-mobile-total col-mobile-right" data-label="Total">{{d.total | currency}}</td>
  
  <!-- 5. ESTADO -->
  <td class="col-mobile-badge" data-label="Estado">
    <span class="badge">{{d.estado}}</span>
  </td>
  
  <!-- 6. ACCIONES -->
  <td data-label="Acciones">
    <app-action-menu>...</app-action-menu>
  </td>
</tr>
```

---

## 📊 Comparación Antes vs Después

### ❌ ANTES (Confuso)
```
┌─────────────────────────────────────┐
│ ⚙️ [Acciones]                       │  ← Primero? No!
├────────────────┬────────────────────┤
│ N° Doc: 001    │ Fecha: 12/01       │
├────────────────┼────────────────────┤
│ IVA: $13       │ IT: $3             │  ← Impuestos primero?
├────────────────┼────────────────────┤
│ ICE: $0        │ Tasa: $0           │
├────────────────┼────────────────────┤
│ ... 10 campos más ...               │
├────────────────┴────────────────────┤
│ Concepto: Compra de insumos         │  ← Título al final!
└─────────────────────────────────────┘
```

### ✅ DESPUÉS (Claro)
```
┌─────────────────────────────────────┐
│ Compra de insumos                   │  ← Título primero
├────────────────┬────────────────────┤
│ Fecha: 12/01   │ N°: 001-001-1234   │
├────────────────┼────────────────────┤
│ Importe: $100  │ TOTAL: $1,130      │  ← Total destacado
├────────────────┴────────────────────┤
│ [Aprobado]            [⚙️ Acciones] │  ← Estado + Acciones
└─────────────────────────────────────┘
```

---

## ✅ Checklist de Revisión

- [ ] ¿El título/concepto es lo primero que se ve?
- [ ] ¿Los valores monetarios importantes están destacados?
- [ ] ¿Las acciones están al final?
- [ ] ¿Hay máximo 6-8 campos visibles?
- [ ] ¿El orden tiene sentido lógico?
- [ ] ¿Se usa `col-mobile-primary` para el título?
- [ ] ¿Se usa `col-mobile-total` para el total?
- [ ] ¿Se usa `col-mobile-money` para montos?
- [ ] ¿El estado tiene badge visual?
- [ ] ¿Hay suficiente espacio entre cards?
