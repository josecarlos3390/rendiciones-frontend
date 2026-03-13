// ═══════════════════════════════════════════════════════════════════════════
//  PLANTILLA ESTÁNDAR — Modelo de entidad
//
//  Renombrar: MiEntidad → NombreReal (PascalCase)
//             mi-entidad → nombre-real (kebab-case)
// ═══════════════════════════════════════════════════════════════════════════

// ── Interfaz principal (espeja los campos del backend) ────────────────────
export interface MiEntidad {
  // TODO: reemplazar por los campos reales que devuelve el backend
  id:          number;
  nombre:      string;
  descripcion: string | null;
  activo:      string | null;   // '1' = activo, '0' = inactivo
  createdAt?:  string;
  updatedAt?:  string;
}

// ── Payload para creación ─────────────────────────────────────────────────
export interface CreateMiEntidadPayload {
  nombre:      string;
  descripcion?: string;
  activo?:      string;
}

// ── Payload para actualización (todos los campos opcionales) ──────────────
export type UpdateMiEntidadPayload = Partial<CreateMiEntidadPayload>;

// ── Constantes para <app-select> (agregar las que necesites) ──────────────
// export const ESTADO_OPTIONS = [
//   { value: '1', label: 'Activo',   icon: '✅' },
//   { value: '0', label: 'Inactivo', icon: '⛔' },
// ];
