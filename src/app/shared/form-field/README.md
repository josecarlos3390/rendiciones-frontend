# FormFieldComponent

Componente reutilizable para campos de formulario estandarizados con validación automática, hints y manejo de errores.

## Características

- ✅ **Validación automática** - Detecta errores del FormControl y muestra mensajes
- ✅ **Mensajes de error inteligentes** - Mapea errores comunes (required, minlength, etc.) a mensajes en español
- ✅ **Hint/ayuda** - Texto descriptivo debajo del campo
- ✅ **Estado modificado** - Visualización cuando el campo cambió (modo edición)
- ✅ **Deshabilitado** - Soporte visual para campos deshabilitados
- ✅ **Flexible** - Funciona con cualquier input nativo o componente personalizado

## Uso Básico

```typescript
import { FormFieldComponent } from '../shared/form-field';

@Component({
  imports: [FormFieldComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <app-form-field 
        label="Nombre" 
        [required]="true"
        controlName="nombre"
        hint="Máximo 100 caracteres">
        <input type="text" formControlName="nombre" />
      </app-form-field>
    </form>
  `
})
```

## API de Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Label del campo |
| `required` | `boolean` | `false` | Muestra indicador * de requerido |
| `showOptional` | `boolean` | `false` | Muestra texto (opcional) si no es requerido |
| `hint` | `string` | `''` | Texto de ayuda debajo del campo |
| `errorMessage` | `string` | `''` | Mensaje de error personalizado (sobrescribe los automáticos) |
| `control` | `AbstractControl` | `null` | Control de formulario (alternativa a controlName) |
| `controlName` | `string` | `''` | Nombre del control en el FormGroup padre |
| `showChanged` | `boolean` | `false` | Resalta el campo cuando fue modificado |
| `initialValue` | `any` | `null` | Valor inicial para comparar cambios |
| `showStatusIcon` | `boolean` | `false` | Muestra icono de error en el input |
| `disabled` | `boolean` | `false` | Deshabilita visualmente el campo |

## Ejemplos

### Campo requerido con hint

```html
<app-form-field 
  label="Código" 
  [required]="true"
  controlName="codigo"
  hint="Código único de 3-5 caracteres">
  <input type="text" formControlName="codigo" maxlength="5" />
</app-form-field>
```

### Campo opcional

```html
<app-form-field 
  label="Descripción" 
  [showOptional]="true"
  controlName="descripcion">
  <textarea formControlName="descripcion" rows="3"></textarea>
</app-form-field>
```

### Error personalizado

```html
<app-form-field 
  label="Email" 
  [required]="true"
  controlName="email"
  errorMessage="Por favor ingrese un email válido de la empresa">
  <input type="email" formControlName="email" />
</app-form-field>
```

### Indicador de cambio (modo edición)

```html
<app-form-field 
  label="Nombre" 
  [required]="true"
  controlName="nombre"
  [showChanged]="true"
  [initialValue]="initialValues?.nombre">
  <input type="text" formControlName="nombre" />
</app-form-field>
```

### Con componente personalizado (AppSelect)

```html
<app-form-field 
  label="Tipo Documento" 
  [required]="true"
  controlName="tipoDoc">
  <app-select
    [options]="tipoDocOptions"
    [value]="form.get('tipoDoc')?.value"
    (valueChange)="form.get('tipoDoc')?.setValue($event)">
  </app-select>
</app-form-field>
```

## Mensajes de Error Automáticos

El componente mapea automáticamente los errores de Angular a mensajes:

| Error de Validador | Mensaje Mostrado |
|-------------------|------------------|
| `required` | "Este campo es obligatorio" |
| `minlength` | "Mínimo X caracteres" |
| `maxlength` | "Máximo X caracteres" |
| `min` | "Valor demasiado bajo" |
| `max` | "Valor demasiado alto" |
| `email` | "Email inválido" |
| `pattern` | "Formato inválido" |

Para sobrescribir, usa el input `errorMessage`.

## CSS Custom Properties

El componente usa las variables CSS del tema:

```css
--text-sm          /* Tamaño label */
--text-xs          /* Tamaño hint/error */
--text-heading     /* Color label */
--text-muted       /* Color hint */
--color-danger     /* Color error y requerido */
--color-primary    /* Color borde campo modificado */
--color-danger-bg  /* Fondo campo inválido */
```

## Migración desde HTML manual

### Antes:
```html
<div class="form-field">
  <label>Nombre <span class="required">*</span></label>
  <input type="text" formControlName="nombre" />
  <span class="field-hint">Máximo 100 caracteres</span>
  <span class="field-error" 
    *ngIf="form.get('nombre')?.invalid && form.get('nombre')?.touched">
    El nombre es obligatorio
  </span>
</div>
```

### Después:
```html
<app-form-field 
  label="Nombre" 
  [required]="true"
  controlName="nombre"
  hint="Máximo 100 caracteres">
  <input type="text" formControlName="nombre" />
</app-form-field>
```

**Reducción de código: ~60% menos líneas por campo**
