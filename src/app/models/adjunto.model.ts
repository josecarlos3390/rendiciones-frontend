/**
 * Modelo de Adjunto para archivos de rendiciones
 */

export interface Adjunto {
  id: number;
  idRendicion: number;
  idRD: number;
  nombre: string;
  tipo: string;
  tamano: number;
  descripcion?: string;
  fecha: Date | string;
}

/**
 * Payload para crear adjunto
 */
export interface CreateAdjuntoPayload {
  descripcion?: string;
}

/**
 * Tamaño formateado para mostrar (ej: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Icono según tipo MIME
 */
export function getFileIcon(tipo: string): string {
  if (tipo.includes('pdf')) return '📄';
  if (tipo.includes('image')) return '🖼️';
  if (tipo.includes('word') || tipo.includes('document')) return '📝';
  if (tipo.includes('excel') || tipo.includes('sheet')) return '📊';
  if (tipo.includes('powerpoint') || tipo.includes('presentation')) return '📽️';
  if (tipo.includes('zip') || tipo.includes('compressed')) return '📦';
  return '📎';
}

/**
 * Verifica si el tipo es previewable (imagen o PDF)
 */
export function isPreviewable(tipo: string): boolean {
  return tipo.includes('image') || tipo.includes('pdf');
}
