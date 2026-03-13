# Estándares de desarrollo — Frontend Angular

## Change Detection — REGLAS ABSOLUTAS

Todos los componentes del proyecto (páginas Y shared) deben declarar:

```typescript
changeDetection: ChangeDetectionStrategy.OnPush
```

### ✅ Patrón correcto

```typescript
import {
  Component, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiComponente implements OnInit {

  constructor(private cdr: ChangeDetectorRef) {}

  load() {
    this.service.getAll().subscribe({
      next: (data) => {
        this.items   = data;
        this.loading = false;
        this.cdr.markForCheck(); // ✅ único método permitido
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
        this.cdr.markForCheck(); // ✅ también en error
      },
    });
  }
}
```

### ❌ Patrones prohibidos

```typescript
// ❌ detectChanges() — causa loops y no funciona bien con OnPush
this.cdr.detectChanges();

// ❌ NgZone — workaround incorrecto, oculta el problema real
import { NgZone } from '@angular/core';
this.zone.run(() => { this.items = data; });

// ❌ setTimeout() para forzar renders — anti-patrón
setTimeout(() => {
  this.items = data;
  this.cdr.detectChanges();
});

// ❌ Componente de página sin OnPush
@Component({
  // sin changeDetection → Default implícito → BUG
})
```

---

## Por qué es obligatorio

Los componentes shared del proyecto usan `OnPush`:

- `app-perfil-select`
- `app-cuenta-search`
- `app-empleado-search`
- `app-select`
- `app-paginator`

Si un componente **padre** usa `Default` y un hijo usa `OnPush`, Angular
no propaga los cambios correctamente cuando el hijo emite un evento.
La vista del padre no refresca hasta el próximo evento del usuario
(un click, hover, etc.), lo que hace parecer que los datos "no cargan"
hasta que se interactúa con algo.

La solución es que **padre e hijos usen siempre `OnPush`**.

---

## Cuándo usar `markForCheck()`

| Situación | ¿markForCheck()? |
|---|---|
| Después de `.subscribe({ next })` | ✅ Sí |
| Después de `.subscribe({ error })` | ✅ Sí |
| En callbacks de hijos que no llaman a `load()` | ✅ Sí |
| En `applyFilter()` llamado desde el template | ✅ Sí |
| En `openNew()`, `openEdit()`, `closeForm()` | ❌ No (síncronos) |
| En `onDialogConfirm()`, `onDialogCancel()` | ❌ No (síncronos) |
| En `updatePaging()` | ❌ No (lo llama quien ya hizo markForCheck) |

---

## Cómo crear un formulario nuevo

1. Copiar la plantilla de `plantillas-formulario/`
2. Renombrar todos los archivos y referencias:
   - `mi-entidad` → `nombre-real` (kebab-case)
   - `MiEntidad`  → `NombreReal`  (PascalCase)
   - `miEntidad`  → `nombreReal`  (camelCase)
3. Colocar los archivos en:
   - Componente + servicio → `src/app/pages/nombre-real/`
   - Modelo               → `src/app/models/nombre-real.model.ts`
4. Ajustar los campos marcados con `// TODO:` en cada archivo
5. Registrar la ruta en `app.routes.ts`

### Instrucción para Claude al crear un formulario nuevo

Pegar esto al inicio del chat antes de pedir cualquier componente:

```
Estoy trabajando en un proyecto Angular standalone con los siguientes
estándares obligatorios que SIEMPRE debes respetar:

## Change Detection — REGLAS ABSOLUTAS
- Todos los componentes (páginas Y shared) deben usar:
  changeDetection: ChangeDetectionStrategy.OnPush
- Después de cualquier cambio async (Observable, Promise) usar SOLO:
  this.cdr.markForCheck()
- NUNCA usar: this.cdr.detectChanges()
- NUNCA usar: NgZone / zone.run()
- NUNCA usar: setTimeout() para forzar renders

## Estructura de un componente de página
- Siempre inyectar ChangeDetectorRef en el constructor
- NUNCA inyectar NgZone
- Patrón obligatorio en todo subscribe():
  next: (data) => { this.datos = data; this.cdr.markForCheck(); }
  error: ()     => { this.loading = false; this.cdr.markForCheck(); }

## Razón
Los componentes shared del proyecto (app-perfil-select, app-cuenta-search,
app-empleado-search, app-select, app-paginator) usan OnPush. Si un componente
padre usa Default, Angular no propaga los cambios correctamente y la vista
no refresca hasta el próximo evento del usuario.
```
