# Roadmap de Mejoras Pendientes

> Lista priorizada de mejoras técnicas para el frontend.

---

## 🚨 Prioridad Alta (Impacto inmediato)

### 1. Refactorizar Rend-DComponent (Deuda Técnica Crítica)

**Problema:** Componente de ~2300 líneas, viola SRP, difícil de mantener y testear.

**Sugerencia de división:**
```
rend-d/
├── rend-d.component.ts           # Solo orquestación
├── rend-d-list.component.ts      # Tabla de documentos
├── rend-d-form/
│   ├── rend-d-form.component.ts  # Formulario principal
│   ├── tabs/
│   │   ├── tab-identificacion.component.ts
│   │   ├── tab-montos.component.ts
│   │   └── tab-impuestos.component.ts
│   └── rend-d-form.service.ts    # Lógica de cálculos
└── modals/                       # Modales específicos
    ├── pdf-batch-modal.component.ts
    ├── qr-scanner-modal.component.ts
    └── ...
```

**Impacto:**
- ✅ Mantenibilidad: Cada archivo < 400 líneas
- ✅ Testeabilidad: Componentes aislados
- ✅ Performance: Lazy loading por tabs
- ✅ Developer Experience: Múltiples devs pueden trabajar en paralelo

**Estimación:** 3-4 días

---

### 2. Implementar Interceptor de Errores HTTP Global

**Problema:** Cada componente maneja errores diferente:
```typescript
// Algunos hacen esto:
this.service.save().subscribe({
  next: () => this.toast.success('Guardado'),
  error: (err) => {
    const msg = err?.error?.message || 'Error al guardar';
    this.toast.error(msg);
  }
});

// Otros no manejan errores
this.service.save().subscribe(() => this.load());
```

**Solución:** Crear `HttpErrorInterceptor`:
```typescript
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError(error => {
        // Manejar 401, 403, 500, etc.
        // Mostrar toast automático
        // Loggear errores
        return throwError(() => error);
      })
    );
  }
}
```

**Impacto:**
- ✅ UX consistente en errores
- ✅ No más código repetido de manejo de errores
- ✅ Centralizar lógica de reintentos
- ✅ Métricas de errores

**Estimación:** 1 día

---

## 🟡 Prioridad Media (Mejora continua)

### 3. Cambiar Change Detection a OnPush

**Problema:** Todos los componentes usan `ChangeDetectionStrategy.Default`, causando detecciones innecesarias.

**Solución:** Migrar a `OnPush`:
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NormasComponent {
  // Usar signals o inmutabilidad
  readonly normas = signal<Norma[]>([]);
}
```

**Componentes prioritarios:**
1. Tablas grandes (Rend-D, Integracion)
2. Formularios complejos (UserForm)
3. Componentes con muchos inputs

**Impacto:**
- ✅ Menos ciclos de detección de cambios
- ✅ Mejor performance en tablas grandes
- ✅ Código más predecible

**Estimación:** 2-3 días (progresivo)

---

### 4. Crear Componentes de Loading State Estandarizados

**Problema:** Inconsistencia en estados de carga:
```html
<!-- Algunos usan: -->
<div *ngIf="loading">Cargando...</div>

<!-- Otros: -->
<app-skeleton-loader>

<!-- Otros: -->
<div class="loading">⏳ Cargando datos...</div>
```

**Solución:** Extender `LoadingStateComponent` para todos los casos:
```typescript
interface LoadingStateConfig {
  variant: 'table' | 'cards' | 'form' | 'inline';
  rows?: number;
  message?: string;
  showRetry?: boolean;
}
```

**Impacto:**
- ✅ UX consistente durante carga
- ✅ Menos código repetido
- ✅ Mejor manejo de estados error/empty

**Estimación:** 1-2 días

---

### 5. Implementar Virtual Scrolling para Tablas Grandes

**Problema:** Tablas con >100 filas renderizan todo el DOM, lento.

**Solución:** Usar `@angular/cdk/scrolling`:
```html
<cdk-virtual-scroll-viewport itemSize="50" class="table-viewport">
  <table>
    <tbody>
      <tr *cdkVirtualFor="let item of items">
        <!-- filas -->
      </tr>
    </tbody>
  </table>
</cdk-virtual-scroll-viewport>
```

**Tablas candidatas:**
- Rend-D (puede tener muchos documentos)
- Integracion (historial de sincronizaciones)
- Offline módulos

**Impacto:**
- ✅ Renderizado de solo elementos visibles
- ✅ Mejor performance con grandes datasets
- ✅ Menor uso de memoria

**Estimación:** 1-2 días

---

## 🟢 Prioridad Baja (Nice to have)

### 6. Agregar Tests Unitarios

**Problema:** No hay tests para los nuevos componentes compartidos.

**Prioridad de testing:**
1. **FormDirtyService** - Lógica crítica, fácil de testear
2. **FormFieldComponent** - Renderizado y validación
3. **FormModalComponent** - Interacciones de usuario
4. **ActionMenuComponent** - Eventos y posicionamiento

**Ejemplo de test para FormDirtyService:**
```typescript
describe('FormDirtyService', () => {
  it('should detect simple changes', () => {
    const form = new FormGroup({ name: new FormControl('John') });
    const initial = { name: 'Jane' };
    expect(service.isDirty(form, initial)).toBe(true);
  });
  
  it('should ignore excluded fields', () => {
    const form = new FormGroup({ 
      name: new FormControl('John'),
      timestamp: new FormControl(Date.now())
    });
    const initial = { name: 'John', timestamp: Date.now() - 1000 };
    expect(service.isDirty(form, initial, { excludeFields: ['timestamp'] })).toBe(false);
  });
});
```

**Impacto:**
- ✅ Prevención de regresiones
- ✅ Documentación viva
- ✅ Confianza para refactorizar

**Estimación:** 2-3 días

---

### 7. Mejorar Accesibilidad (A11y)

**Problemas detectados:**
- Faltan `aria-label` en botones de iconos
- No hay skip links
- Contraste de colores no verificado
- Modales sin focus trap completo

**Soluciones:**
```html
<!-- Botones con iconos -->
<button aria-label="Editar norma {{ norma.factorCode }}">
  <svg>...</svg>
</button>

<!-- Skip link -->
<a href="#main-content" class="skip-link">Saltar al contenido</a>
<main id="main-content">

<!-- Focus trap en modales mejorado -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
```

**Impacto:**
- ✅ Cumplimiento WCAG 2.1
- ✅ Mejor experiencia para usuarios con discapacidad
- ✅ SEO mejorado

**Estimación:** 2 días

---

## 📊 Resumen de Prioridades

| # | Mejora | Impacto UX | Impacto Dev | Esfuerzo | Prioridad |
|---|--------|-----------|-------------|----------|-----------|
| 1 | Refactor Rend-D | 🟡 Medio | 🔴 Alto | 4 días | 🔴 Alta |
| 2 | Interceptor Errores | 🔴 Alto | 🟢 Bajo | 1 día | 🔴 Alta |
| 3 | OnPush Change Detection | 🔴 Alto | 🟡 Medio | 3 días | 🟡 Media |
| 4 | Loading States | 🟡 Medio | 🟢 Bajo | 2 días | 🟡 Media |
| 5 | Virtual Scrolling | 🔴 Alto | 🟡 Medio | 2 días | 🟡 Media |
| 6 | Tests Unitarios | 🟢 Bajo | 🔴 Alto | 3 días | 🟢 Baja |
| 7 | Accesibilidad | 🔴 Alto | 🟡 Medio | 2 días | 🟢 Baja |

---

## 🎯 Mi Recomendación

Si quieres continuar, sugiero este orden:

1. **Interceptor de Errores HTTP** (1 día) - Impacto inmediato, esfuerzo bajo
2. **Refactor de Rend-D** (4 días) - Deuda técnica crítica
3. **Tests para FormDirtyService** (1 día) - Base para confianza

¿Con cuál quieres comenzar?
