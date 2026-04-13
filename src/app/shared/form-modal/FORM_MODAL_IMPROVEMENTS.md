# Mejoras propuestas para FormModalComponent

## Mejoras de UX/UI

### 1. **Indicador de cambios sin guardar (dirty state)**
```typescript
@Input() showDirtyIndicator = false;
@Input() isDirty = false;
```
- Mostrar dot/badge naranja en el header cuando haya cambios sin guardar
- Similar al que tenía Normas: "● cambios sin guardar"

### 2. **Confirmación al cerrar con cambios pendientes**
```typescript
@Input() confirmOnClose = false;
@Output() closeAttempt = new EventEmitter<void>();
```
- Si `isDirty=true` y el usuario cierra el modal, mostrar confirmación
- Prevenir pérdida accidental de datos

### 3. **Soporte para múltiples secciones/pestañas**
```typescript
interface FormSection {
  id: string;
  label: string;
  icon?: string;
}
@Input() sections: FormSection[] = [];
@Input() activeSection = '';
@Output() sectionChange = new EventEmitter<string>();
```
- Para formularios largos (ej: Rend-M con múltiples tabs)

### 4. **Acciones de footer condicionales mejoradas**
```typescript
@Input() hideDefaultFooter = false;
@Input() primaryButtonText: string | null = null; // Override "Guardar Cambios"
@Input() secondaryButtonText: string | null = null; // Override "Cancelar"
@Input() showDeleteButton = false;
@Output() delete = new EventEmitter<void>();
```

### 5. **Validación visual inline**
```typescript
@Input() errors: Record<string, string[]> = {};
```
- Mostrar resumen de errores arriba del formulario
- Similar al ValidationSummary de ASP.NET

### 6. **Tamaños de modal**
```typescript
type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';
@Input() size: ModalSize = 'medium';
```
- `small`: 400px (confirmaciones, simples)
- `medium`: 560px (formularios estándar) ← default actual
- `large`: 720px (formularios complejos)
- `fullscreen`: 90vw/90vh (Rend-D, configuración masiva)

### 7. **Teclado accesible**
```typescript
@HostListener('keydown.escape')
onEscape(): void {
  if (!this.loading) this.onCancel();
}

@HostListener('keydown.control.enter')
onCtrlEnter(): void {
  if (!this.loading && !this.submitDisabled) this.onSave();
}
```
- ESC para cerrar
- Ctrl+Enter para guardar

---

## Mejoras técnicas

### 8. **Focus trap**
- Atrapar foco dentro del modal mientras esté abierto
- Restaurar foco al elemento que abrió el modal al cerrar

### 9. **Animaciones de entrada/salida**
```typescript
import { animate, style, transition, trigger } from '@angular/animations';
```
- Fade in/out del backdrop
- Slide up/down del modal card

### 10. **Scroll lock**
```typescript
private lockBodyScroll(): void {
  document.body.style.overflow = 'hidden';
}
private unlockBodyScroll(): void {
  document.body.style.overflow = '';
}
```
- Prevenir scroll del body cuando el modal está abierto

---

## Priorización recomendada

| Prioridad | Mejora | Impacto | Esfuerzo |
|-----------|--------|---------|----------|
| 🔴 Alta | #1 Dirty indicator | UX | 15 min |
| 🔴 Alta | #2 Confirm on close | UX | 30 min |
| 🟡 Media | #6 Modal sizes | Flexibilidad | 20 min |
| 🟡 Media | #7 Keyboard | Accesibilidad | 15 min |
| 🟡 Media | #10 Scroll lock | UX | 10 min |
| 🟢 Baja | #3 Tabs | Complejidad alta | 2h |
| 🟢 Baja | #8 Focus trap | Accesibilidad | 1h |
| 🟢 Baja | #9 Animations | Polish | 1h |

---

## Implementación inmediata sugerida

Las mejoras #1, #2, #6, #7 y #10 se pueden implementar rápidamente y agregan mucho valor. ¿Quieres que las implemente antes de continuar con las migraciones?
