# Plantilla estándar de formulario — Instrucciones de uso

## Archivos incluidos

```
mi-entidad.component.ts    ← Lógica del componente (CRUD + paginación + diálogo)
mi-entidad.component.html  ← Template HTML con tabla y modal
mi-entidad.component.scss  ← Estilos específicos del componente
mi-entidad.service.ts      ← Servicio HTTP con operaciones CRUD
mi-entidad.model.ts        ← Interfaces TypeScript del modelo
```

---

## Pasos para crear un formulario nuevo

### 1. Copiar y renombrar

Copiar la carpeta completa y hacer un reemplazo global de:

| Buscar       | Reemplazar por          | Dónde aplica              |
|--------------|-------------------------|---------------------------|
| `mi-entidad` | `nombre-real`           | nombres de archivo, rutas |
| `MiEntidad`  | `NombreReal` (PascalCase) | clases, interfaces        |
| `miEntidad`  | `nombreReal` (camelCase)  | variables, propiedades    |

### 2. Definir el modelo (`mi-entidad.model.ts`)

```typescript
export interface MiEntidad {
  id:     number;
  nombre: string;
  // ... tus campos reales
}

export interface CreateMiEntidadPayload {
  nombre: string;
  // ... campos para crear
}

export type UpdateMiEntidadPayload = Partial<CreateMiEntidadPayload>;
```

### 3. Ajustar el servicio (`mi-entidad.service.ts`)

Cambiar el endpoint:

```typescript
private api = `${environment.apiUrl}/mi-entidad`; // ← cambiar
```

Si necesitás filtrar por perfil, descomentar `getByPerfil()`.

### 4. Ajustar el componente (`.component.ts`)

- `buildForm()` → agregar los campos reales con sus validadores
- `openEdit()` → mapear los campos del modelo al formulario
- `save()` → construir el payload con los campos reales
- `applyFilter()` → ajustar los campos de búsqueda
- `confirmDelete()` → personalizar el mensaje

### 5. Ajustar el HTML (`.component.html`)

- Cambiar título y subtítulo del `page-header`
- Agregar/quitar campos en el formulario modal
- Agregar/quitar columnas en la tabla
- Ajustar los bindings `item.campo` a los nombres reales

### 6. Registrar la ruta

En `app.routes.ts` (o donde estén las rutas):

```typescript
{
  path: 'mi-entidad',
  loadComponent: () =>
    import('./pages/mi-entidad/mi-entidad.component')
      .then(m => m.MiEntidadComponent),
},
```

---

## Reglas de Change Detection — OBLIGATORIO

Estas reglas aplican a **todos** los componentes del proyecto, sin excepción.

### ✅ Siempre hacer

```typescript
// 1. Declarar OnPush en el decorador
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})

// 2. Usar markForCheck() después de cualquier cambio async (Observable, Promise)
this.service.getAll().subscribe({
  next: (data) => {
    this.items = data;
    this.cdr.markForCheck(); // ← SIEMPRE al final del next/error
  },
  error: () => {
    this.loadError = true;
    this.cdr.markForCheck();
  },
});

// 3. Usar markForCheck() cuando se cambia estado desde un callback de hijo
onPerfilChange(id: number | null) {
  this.selectedPerfilId = id;
  this.load();
  // load() llama markForCheck() internamente, no hace falta repetirlo aquí
}
```

### ❌ Nunca hacer

```typescript
// ❌ detectChanges() — puede causar loops y no funciona bien con OnPush
this.cdr.detectChanges();

// ❌ NgZone.run() — workaround incorrecto, oculta el problema real
this.zone.run(() => { this.items = data; });

// ❌ setTimeout() para forzar renders — anti-patrón, causa bugs de timing
setTimeout(() => {
  this.items = data;
  this.cdr.detectChanges();
});

// ❌ Mezclar Default en el padre con hijos OnPush
// Si un hijo (PerfilSelect, CuentaSearch, etc.) usa OnPush,
// el padre TAMBIÉN debe usar OnPush. De lo contrario los cambios
// emitidos por el hijo no se propagan a la vista del padre.
```

### Por qué ocurre el bug

Los componentes shared (`app-perfil-select`, `app-cuenta-search`, `app-empleado-search`)
usan `OnPush`. Cuando un componente padre usa `Default` (sin declarar estrategia),
Angular no garantiza que los cambios del padre se reflejen inmediatamente después
de que un hijo `OnPush` emite un evento. La vista solo refresca cuando algo externo
(un click, hover u otro evento del usuario) fuerza un nuevo ciclo de detección.

La solución es que **padre e hijos usen la misma estrategia: `OnPush`**.

---

## Cuándo usar `markForCheck()` vs no usarlo

| Situación | ¿markForCheck()? |
|---|---|
| Después de `.subscribe({ next })` | ✅ Sí |
| Después de `.subscribe({ error })` | ✅ Sí |
| En callbacks de componentes hijos (`(perfilChange)`, etc.) | Solo si no llama a `load()` |
| En `applyFilter()` llamado desde el template (`ngModelChange`) | ✅ Sí |
| En `updatePaging()` | ❌ No (lo llama `applyFilter` que ya hace markForCheck) |
| En `openNew()`, `openEdit()`, `closeForm()` | ❌ No (eventos síncronos del template) |
| En `onDialogConfirm()`, `onDialogCancel()` | ❌ No (eventos síncronos del template) |
