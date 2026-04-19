/**
 * Componentes de rend-m
 * 
 * Todos son standalone y pueden importarse directamente.
 */

// Formulario de creación/edición
export { RendicionFormComponent } from './rendicion-form/rendicion-form.component';
export type { RendicionFormData } from './rendicion-form/rendicion-form.component';

// Filtros
export { RendicionFiltersComponent } from './rendicion-filters/rendicion-filters.component';
export type { VerFiltro, EstadoFiltro } from './rendicion-filters/rendicion-filters.component';

// Tabla
export { RendicionTableComponent } from './rendicion-table/rendicion-table.component';
export type { RendicionAction } from './rendicion-table/rendicion-table.component';

// Selector de perfil
export { PerfilSelectorComponent } from './perfil-selector/perfil-selector.component';

// Tabla de subordinados
export { SubordinadosTableComponent } from './subordinados-table/subordinados-table.component';
