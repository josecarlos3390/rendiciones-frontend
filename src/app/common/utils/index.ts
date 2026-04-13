/**
 * Utilidades y funciones helper globales
 */

import { DATE_FORMATS } from '../constants';

// ═══════════════════════════════════════════════════════════════
// NÚMEROS Y CÁLCULOS
// ═══════════════════════════════════════════════════════════════

/** Convierte cualquier valor a número, retorna 0 si es inválido */
export function toNumber(value: any): number {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

/** Redondea a 2 decimales */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formatea número como moneda (Bs) */
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Formatea número con separadores de miles */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Calcula porcentaje */
export function calcularPorcentaje(valor: number, total: number): number {
  if (total === 0) return 0;
  return round2((valor / total) * 100);
}

// ═══════════════════════════════════════════════════════════════
// FECHAS
// ═══════════════════════════════════════════════════════════════

/** Convierte fecha a formato API (YYYY-MM-DD) */
export function toApiDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/** Formatea fecha para display (DD/MM/YYYY) */
export function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-BO');
}

/** Formatea fecha y hora */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-BO');
}

/** Obtiene el primer día del mes actual */
export function getPrimerDiaMes(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Obtiene el último día del mes actual */
export function getUltimoDiaMes(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

// ═══════════════════════════════════════════════════════════════
// STRINGS
// ═══════════════════════════════════════════════════════════════

/** Trunca texto con ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
}

/** Capitaliza primera letra */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Convierte a slug (URL-friendly) */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/** Genera un ID único simple */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Sanitiza input de usuario (básico) */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// ARRAYS Y OBJETOS
// ═══════════════════════════════════════════════════════════════

/** Agrupa array por una propiedad */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const groupKey = String(item[key]);
    acc[groupKey] = acc[groupKey] || [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/** Ordena array por propiedad */
export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/** Elimina duplicados por propiedad */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

/** Busca recursivamente en objeto anidado */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES
// ═══════════════════════════════════════════════════════════════

/** Valida NIT boliviano (básico) */
export function isValidNit(nit: string): boolean {
  if (!nit) return false;
  const clean = nit.replace(/[^0-9]/g, '');
  return clean.length >= 5 && clean.length <= 15;
}

/** Valida correo electrónico */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/** Valida que string no esté vacío */
export function isNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim() !== '';
}

/** Valida que sea número positivo */
export function isPositiveNumber(value: any): boolean {
  const n = Number(value);
  return !isNaN(n) && n > 0;
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULOS DE RENDICIONES
// ═══════════════════════════════════════════════════════════════

/** Calcula total de una línea de documento */
export interface LineCalc {
  priceBase: number;
  discountTotal: number;
  priceNet: number;
  lineNet: number;
  taxLine: number;
  lineFinal: number;
}

export function calcularLinea(
  price: number,
  quantity: number,
  invoiced: boolean,
  discountPct?: number | null,
  discountAmt?: number | null,
  useSinTaxCalculation: boolean = false,
): LineCalc {
  const TAX_RATE_STANDARD = 13 / 87;
  const TAX_RATE_SIN = 0.13;
  
  const priceBase = price * quantity;

  let discountTotal = 0;
  if (discountPct != null && discountPct > 0) {
    discountTotal = priceBase * (discountPct / 100);
  } else if (discountAmt != null && discountAmt > 0) {
    discountTotal = Math.min(discountAmt, priceBase);
  }

  const lineNet = priceBase - discountTotal;
  const taxRate = useSinTaxCalculation ? TAX_RATE_SIN : TAX_RATE_STANDARD;
  const taxLine = invoiced ? lineNet * taxRate : 0;
  const lineFinal = lineNet + taxLine;
  const priceNet = quantity > 0 ? lineNet / quantity : 0;

  return { priceBase, discountTotal, priceNet, lineNet, taxLine, lineFinal };
}

/** Calcula base imponible para impuestos */
export function calcularBaseImponible(
  importe: number,
  exento: number,
  ice: number,
  tasa: number,
  tasaCero: number,
  giftCard: number
): number {
  return Math.max(0, importe - exento - ice - tasa - tasaCero - giftCard);
}
