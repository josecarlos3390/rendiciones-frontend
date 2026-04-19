/**
 * Barrel export para componentes de Rend-D
 * Facilita la importación de componentes refactorizados
 */

// Header de página
export { PageHeaderComponent } from './page-header/page-header.component';

// Paneles
export { MaestrosPanelComponent } from './maestros-panel/maestros-panel.component';
export { SaldoPanelComponent } from './saldo-panel/saldo-panel.component';

// Tabla
export { DocumentTableComponent } from './document-table/document-table.component';

// Formulario
export { DocFormComponent } from './doc-form/doc-form.component';
export type { DocFormConfig, NormaSlotConfig } from './doc-form/doc-form.model';

// Modales
export { ModeSelectorModalComponent } from './modals/mode-selector/mode-selector.component';
export { UrlImportModalComponent } from './modals/url-import/url-import.component';
export { QrScannerModalComponent } from './modals/qr-scanner/qr-scanner.component';
export { PdfBatchResultsModalComponent } from './modals/pdf-batch-results/pdf-batch-results.component';
export type { BatchStats } from './modals/pdf-batch-results/pdf-batch-results.component';
export { ProvEventualModalComponent } from './modals/prov-eventual/prov-eventual.component';
