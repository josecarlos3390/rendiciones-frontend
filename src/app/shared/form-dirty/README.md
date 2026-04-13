# FormDirtyService

Servicio para gestionar el estado "dirty" (cambios sin guardar) de formularios de forma centralizada y reutilizable.

## Problema que resuelve

Antes, cada componente duplicaba esta lógica:

```typescript
// Esto se repetía en ~15 componentes diferentes
get isDirty(): boolean {
  if (!this.editingItem) return true;
  if (!this.initialValues) return false;
  const curr = this.form.getRawValue();
  return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
}
```

Ahora es una línea:

```typescript
get isDirty(): boolean {
  return this.dirtyService.isDirty(this.form, this.initialValues);
}
```

## Uso

### Inyección

```typescript
import { FormDirtyService } from '../shared/form-dirty';

@Component({...})
export class MiComponente {
  constructor(private dirtyService: FormDirtyService) {}
}
```

### Verificar si hay cambios

```typescript
export class MiComponente {
  form!: FormGroup;
  initialValues: any = null;
  editingItem: any = null;

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  openEdit(item: any) {
    this.editingItem = item;
    this.form.patchValue(item);
    // Crear snapshot de valores iniciales
    this.initialValues = this.dirtyService.createSnapshot(this.form);
  }
}
```

### Verificar campo específico

```typescript
fieldChanged(fieldName: string): boolean {
  return this.dirtyService.fieldChanged(
    this.form.get(fieldName),
    this.initialValues?.[fieldName]
  );
}
```

### Configuración avanzada

```typescript
get isDirty(): boolean {
  return this.dirtyService.isDirty(this.form, this.initialValues, {
    // Excluir campos de la comparación
    excludeFields: ['fechaCreacion', 'usuarioModificacion'],
    
    // O solo incluir ciertos campos
    includeFields: ['nombre', 'descripcion', 'activo'],
    
    // Comparación personalizada
    compareFn: (current, initial) => {
      // Lógica de comparación custom
      return current !== initial;
    }
  });
}
```

## API

### Métodos

#### `isDirty(form, initialValues, config?)`

Compara el formulario actual con los valores iniciales.

**Parámetros:**
- `form: FormGroup | null | undefined` - Formulario a comparar
- `initialValues: any` - Valores iniciales (snapshot)
- `config?: DirtyCheckConfig` - Configuración opcional

**Retorna:** `boolean` - `true` si hay cambios

#### `fieldChanged(control, initialValue)`

Verifica si un campo específico fue modificado.

**Parámetros:**
- `control: AbstractControl | null | undefined` - Control del formulario
- `initialValue: any` - Valor inicial del campo

**Retorna:** `boolean` - `true` si el campo cambió

#### `createSnapshot(form)`

Crea una copia profunda de los valores actuales del formulario.

**Parámetros:**
- `form: FormGroup | null | undefined`

**Retorna:** `any` - Snapshot de los valores

**Uso típico:**
```typescript
openEdit(item: any) {
  this.form.patchValue(item);
  this.initialValues = this.dirtyService.createSnapshot(this.form);
}
```

#### `resetDirty(form)`

Actualiza los valores iniciales para "resetear" el estado dirty.
Útil después de guardar exitosamente.

**Parámetros:**
- `form: FormGroup | null | undefined`

**Retorna:** `any` - Nuevos valores iniciales

**Uso típico:**
```typescript
save() {
  this.service.save(this.form.value).subscribe(() => {
    // Resetear el estado dirty
    this.initialValues = this.dirtyService.resetDirty(this.form);
    this.toast.success('Guardado');
  });
}
```

#### `getChangedFields(form, initialValues)`

Obtiene la lista de campos que fueron modificados.

**Retorna:** `string[]` - Nombres de los campos modificados

**Uso:**
```typescript
const cambios = this.dirtyService.getChangedFields(this.form, this.initialValues);
console.log('Campos modificados:', cambios); // ['nombre', 'descripcion']
```

#### `getChangesSummary(form, initialValues)`

Obtiene un resumen detallado de los cambios (para debugging).

**Retorna:** `Record<string, { from: any, to: any }>`

**Uso:**
```typescript
const summary = this.dirtyService.getChangesSummary(this.form, this.initialValues);
console.log(summary);
// {
//   nombre: { from: 'Juan', to: 'Pedro' },
//   edad: { from: 25, to: 26 }
// }
```

## Configuración (DirtyCheckConfig)

```typescript
interface DirtyCheckConfig {
  /** Campos a excluir de la comparación */
  excludeFields?: string[];
  
  /** Campos a incluir (si se especifica, solo estos se comparan) */
  includeFields?: string[];
  
  /** Función de comparación personalizada */
  compareFn?: (current: any, initial: any) => boolean;
}
```

## Patrones Comunes

### Formulario de Creación

En modo creación, siempre queremos permitir guardar:

```typescript
get isDirty(): boolean {
  // Si no hay item en edición, siempre es "dirty" (permite crear)
  if (!this.editingItem) return true;
  return this.dirtyService.isDirty(this.form, this.initialValues);
}
```

### Deshabilitar botón Guardar

```typescript
get canSave(): boolean {
  return this.form.valid && this.isDirty && !this.isSaving;
}
```

### Mostrar indicador de cambio por campo

```html
<app-form-field 
  label="Nombre"
  [showChanged]="fieldChanged('nombre')">
  <input formControlName="nombre" />
</app-form-field>
```

```typescript
fieldChanged(field: string): boolean {
  return this.dirtyService.fieldChanged(
    this.form.get(field),
    this.initialValues?.[field]
  );
}
```

### Guardar solo campos modificados (PATCH)

```typescript
save() {
  const cambios = this.dirtyService.getChangedFields(this.form, this.initialValues);
  
  // Crear payload solo con campos modificados
  const payload = cambios.reduce((acc, field) => {
    acc[field] = this.form.get(field)?.value;
    return acc;
  }, {});
  
  this.service.patch(this.id, payload).subscribe(() => {
    this.initialValues = this.dirtyService.resetDirty(this.form);
  });
}
```

## Migración desde lógica inline

### Antes:
```typescript
export class NormasComponent {
  private initialValues: any = null;

  get isDirty(): boolean {
    if (!this.editingNorma) return true;
    if (!this.initialValues) return false;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
  }

  fieldChanged(field: string): boolean {
    if (!this.editingNorma || !this.initialValues) return false;
    return this.form.get(field)?.value !== this.initialValues[field];
  }
}
```

### Después:
```typescript
export class NormasComponent {
  private initialValues: any = null;

  constructor(private dirtyService: FormDirtyService) {}

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  fieldChanged(field: string): boolean {
    return this.dirtyService.fieldChanged(
      this.form.get(field),
      this.initialValues?.[field]
    );
  }
}
```

**Ventajas:**
- ✅ Menos código duplicado
- ✅ Lógica centralizada y testeable
- ✅ Configuración flexible (exclude/include fields)
- ✅ Debugging mejorado (getChangesSummary)
