# 📋 Auditoría de Estandarización - Frontend Angular

**Fecha:** 11 de abril de 2026  
**Proyecto:** Sistema de Rendiciones  
**Ruta analizada:** `src/app/pages/`

---

## 📊 Resumen Ejecutivo

| Categoría | Hallazgos | Prioridad |
|-----------|-----------|-----------|
| Modales inline (sin FormModalComponent) | 1 componente | Media |
| Tablas duplicadas (sin componentes compartidos) | 17 componentes | Alta |
| Change Detection Default | 0 componentes | - |
| Imports no utilizados | Varios detectados | Baja |
| Código duplicado entre componentes | Patrones repetidos | Media |

---

## 1️⃣ Componentes que NECESITAN migración a FormModalComponent

### 🔴 Encontrados: 1 componente

| Componente | Ubicación | Descripción | Prioridad |
|------------|-----------|-------------|-----------|
| **rend-m.component** | `src/app/pages/rend-m/rend-m.component.html` | Modal de selector de perfil (`showPerfilPicker`) usa `modal-backdrop` inline en línea 24 | Media |

### ✅ Componentes que YA usan FormModalComponent (correctamente):

- `aprobaciones.component` ✅
- `coa.component` ✅
- `cuentas-cabecera.component` ✅
- `cuentas-lista.component` ✅
- `dimensiones.component` ✅
- `documentos.component` ✅
- `integracion.component` ✅
- `normas.component` ✅
- `perfiles.component` ✅
- `proyectos.component` ✅
- `rend-cmp.component` ✅
- `rend-d.component` ✅
- `tipo-cambio.component` ✅
- `tipo-doc-sap.component` ✅
- `offline-cuentas.component` ✅
- `offline-dimensiones.component` ✅
- `offline-entidades.component` ✅
- `offline-normas.component` ✅

**Nota:** El componente `permisos.component` no tiene modal de formulario (solo selector de usuario y tabla).

---

## 2️⃣ Componentes que NECESITAN migración de tablas

### 🔴 Tablas inline con `class="data-table"` (deberían usar componentes compartidos):

| # | Componente | Archivo | Tabla |
|---|------------|---------|-------|
| 1 | **aprobaciones** | `aprobaciones.component.html` | Tabla de pendientes |
| 2 | **cuentas-lista** | `cuentas-lista.component.html` | Tabla de cuentas |
| 3 | **cuentas-cabecera** | `cuentas-cabecera.component.html` | Tabla de cuentas |
| 4 | **dimensiones** | `dimensiones.component.html` | Tabla de dimensiones |
| 5 | **documentos** | `documentos.component.html` | Tabla de documentos + cards mobile |
| 6 | **integracion** | `integracion.component.html` | 2 tablas (admin + user) |
| 7 | **normas** | `normas.component.html` | Tabla de normas |
| 8 | **perfiles** | `perfiles.component.html` | Tabla de perfiles |
| 9 | **permisos** | `permisos.component.html` | Tabla de permisos |
| 10 | **proyectos** | `proyectos.component.html` | Tabla de proyectos |
| 11 | **rend-m** | `rend-m.component.html` | 2 tablas (propias + subordinados) |
| 12 | **rend-cmp** | `rend-cmp.component.html` | Tabla de campos SAP |
| 13 | **tipo-cambio** | `tipo-cambio.component.html` | Tabla de tasas |
| 14 | **tipo-doc-sap** | `tipo-doc-sap.component.html` | Tabla de tipos |
| 15 | **users** | `users.component.html` | Tabla de usuarios |
| 16 | **coa** | `coa.component.html` | Tabla de cuentas COA |
| 17 | **offline-cuentas** | `offline/cuentas/offline-cuentas.component.html` | Tabla de cuentas offline |
| 18 | **offline-dimensiones** | `offline/dimensiones/offline-dimensiones.component.html` | Tabla de dimensiones |
| 19 | **offline-entidades** | `offline/entidades/offline-entidades.component.html` | Tabla de entidades |
| 20 | **offline-normas** | `offline/normas/offline-normas.component.html` | Tabla de normas offline |

### ✅ Componentes que YA usan componentes de tabla compartidos:

| Componente | Componentes de tabla usados |
|------------|----------------------------|
| **rend-d.component** | `DocumentTableComponent`, `VirtualTableBodyComponent` ✅ |

### 📋 Excepciones justificadas:

| Componente | Justificación |
|------------|---------------|
| **documentos.component** | Tabla con layout fiscal específico (tax-col, tax-cell) que no existe en componentes compartidos |
| **dashboard.component** | No tiene tabla, solo cards de estadísticas |
| **prctj.component** | Componente vacío (placeholder) |

---

## 3️⃣ Componentes sin ChangeDetectionStrategy.OnPush

### ✅ Resultado: Todos los componentes analizados usan OnPush

No se encontraron componentes usando `ChangeDetectionStrategy.Default`.

**Verificación completada en:**
- Todos los 33 componentes de `src/app/pages/`

---

## 4️⃣ Imports no utilizados detectados

### 🔴 Problemas encontrados:

| Componente | Import no utilizado | Línea |
|------------|---------------------|-------|
| **tipo-cambio.component.ts** | `AuthService` | Línea 25 (inyectado pero no usado en lógica) |
| **rend-m.component.ts** | `IntegracionService` | Verificar uso en métodos de sync |
| **rend-d.component.ts** | Múltiples imports de modal (legacy) | Revisar `PrctjModalComponent` |

### ✅ Recomendación:
Ejecutar `ng lint` con reglas de `@typescript-eslint/no-unused-vars` para detectar automáticamente.

---

## 5️⃣ Código duplicado entre componentes

### 🔴 Patrones repetidos identificados:

#### A. Lógica de CRUD estándar (repetida en ~15 componentes)
```typescript
// Patrón duplicado en:
// - dimensiones, normas, proyectos, coa, tipo-cambio, tipo-doc-sap, rend-cmp
// Métodos: load(), applyFilter(), updatePaging(), save(), openNew(), openEdit()
```

**Recomendación:** Crear clase base `CrudBaseComponent` o usar composición con servicios.

#### B. Configuración de ConfirmDialog
```typescript
// Patrón repetido en múltiples componentes:
showDialog = false;
dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
private _pendingAction: (() => void) | null = null;

openDialog(config: ConfirmDialogConfig, onConfirm: () => void) { ... }
onDialogConfirm() { ... }
onDialogCancel() { ... }
```

**Recomendación:** Usar servicio `ConfirmDialogService` con métodos estáticos.

#### C. Patrón de paginación
```typescript
// Idéntico en ~15 componentes:
page = 1;
limit = 10;
totalPages = 1;
onPageChange(p: number) { ... }
onLimitChange(l: number) { ... }
```

**Recomendación:** Crear `PaginationMixin` o componente de paginación inteligente.

#### D. Patrón de filtros
```typescript
// Búsqueda por texto repetida:
applyFilter() {
  const q = this.search.toLowerCase();
  this.filtered = this.items.filter(x => x.name.toLowerCase().includes(q));
}
```

---

## 📈 Recomendaciones de Prioridad

### 🔴 Prioridad ALTA

1. **Migrar tablas a componentes compartidos** (17 componentes)
   - Crear `DataTableComponent` genérico con configuración por columnas
   - Implementar `VirtualTableBodyComponent` para tablas grandes
   - Estimado: 2-3 días de trabajo

2. **Crear clase base para CRUD**
   - Reducirá ~40% de código duplicado
   - Estimado: 1 día

### 🟡 Prioridad MEDIA

3. **Migrar modal de rend-m a FormModalComponent**
   - Unificar experiencia de usuario
   - Estimado: 2-3 horas

4. **Implementar servicio de ConfirmDialog**
   - Eliminar código repetido en ~20 componentes
   - Estimado: 4 horas

### 🟢 Prioridad BAJA

5. **Limpiar imports no utilizados**
   - Ejecutar linter automático
   - Estimado: 1 hora

6. **Crear mixin de paginación**
   - Refactor opcional para reducir código
   - Estimado: 4 horas

---

## 📁 Archivos analizados (33 componentes)

### Componentes principales (src/app/pages/):
1. aprobaciones
2. coa
3. cuentas-cabecera
4. cuentas-lista
5. dashboard
6. dimensiones
7. documentos
8. integracion
9. normas
10. perfiles
11. permisos
12. prctj
13. profile
14. proyectos
15. rend-cmp
16. rend-d (con sub-componentes)
17. rend-m
18. tipo-cambio
19. tipo-doc-sap
20. users

### Componentes offline (src/app/pages/offline/):
21. offline-cuentas
22. offline-dimensiones
23. offline-entidades
24. offline-normas

### Sub-componentes (rend-d/components/):
25. doc-form
26. document-table
27. maestros-panel
28. mode-selector (modal)
29. prov-eventual (modal)
30. url-import (modal)
31. saldo-panel
32. prctj-modal

### Otros:
33. user-form

---

## 🎯 Conclusión

El proyecto tiene **buena cobertura de estándares** en:
- ✅ Uso de `ChangeDetectionStrategy.OnPush` (100%)
- ✅ Uso de `FormModalComponent` (~95% de modales)
- ✅ Uso de componentes standalone

**Áreas de mejora prioritarias:**
1. **Tablas**: 17 componentes usan tablas inline que podrían estandarizarse
2. **Código duplicado**: Patrones CRUD y paginación repetidos en múltiples componentes
3. **Modal en rend-m**: Un único modal inline pendiente de migración

**Estimación total de refactorización:** 3-4 días de trabajo para completar todas las mejoras de prioridad alta y media.
