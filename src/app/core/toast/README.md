# Sistema de Notificaciones Toast

Sistema de notificaciones toast moderno y elegante para la aplicación de Rendiciones.

## Características

- ✅ 4 tipos: `success`, `error`, `warning`, `info`
- ✅ Animaciones suaves de entrada
- ✅ Barra de progreso animada
- ✅ Auto-cierre después de duración configurada
- ✅ Diseño responsive (mobile-friendly)
- ✅ Colores distintivos por tipo
- ✅ Click para cerrar manualmente
- ✅ Soporte para múltiples toasts simultáneos

## Uso

### Inyección del servicio

```typescript
import { Component, inject } from '@angular/core';
import { ToastService } from '@core/toast';

@Component({...})
export class MiComponente {
  private toast = inject(ToastService);
  
  guardar() {
    this.toast.exito('Datos guardados correctamente');
  }
  
  eliminar() {
    this.toast.error('No se pudo eliminar el registro');
  }
  
  advertir() {
    this.toast.advertencia('Revise los campos antes de continuar');
  }
  
  informar() {
    this.toast.info('Sincronizando con SAP...', 5000);
  }
}
```

### Métodos disponibles

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `exito(mensaje, duracion?)` | `string`, `number=3000` | Toast verde de éxito |
| `error(mensaje, duracion?)` | `string`, `number=5000` | Toast rojo de error |
| `advertencia(mensaje, duracion?)` | `string`, `number=4000` | Toast amarillo de advertencia |
| `info(mensaje, duracion?)` | `string`, `number=3000` | Toast azul informativo |
| `mostrar(mensaje, tipo, duracion)` | `string`, `ToastType`, `number` | Toast genérico |
| `eliminar(id)` | `string` | Cierra un toast específico |
| `limpiar()` | - | Cierra todos los toasts |

### Duraciones por defecto

- **Éxito**: 3 segundos
- **Error**: 5 segundos
- **Advertencia**: 4 segundos
- **Info**: 3 segundos

## Ejemplos de uso común

```typescript
// Operación exitosa
this.http.post('/api/datos', datos).subscribe({
  next: () => this.toast.exito('Registro creado exitosamente'),
  error: (err) => this.toast.error(err.message)
});

// Confirmación con advertencia
if (!formularioValido) {
  this.toast.advertencia('Complete todos los campos obligatorios');
  return;
}

// Proceso largo
this.toast.info('Procesando documentos...', 10000);
this.procesarDocumentos().then(() => {
  this.toast.exito('Proceso completado');
});
```

## Integración en el layout

El componente `<app-toast></app-toast>` ya está incluido en `layout.component.html` y está disponible globalmente en toda la aplicación.

## Diseño

- Posición: Esquina superior derecha
- Máximo ancho: 400px
- En móvil: Ocupa todo el ancho disponible
- Colores:
  - Éxito: Verde (`#10b981`)
  - Error: Rojo (`#ef4444`)
  - Advertencia: Amarillo (`#f59e0b`)
  - Info: Azul (`#3b82f6`)
