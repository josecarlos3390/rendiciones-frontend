/**
 * Utilidades de cálculo de precios — Frontend
 *
 * REGLA: El precio registrado en el sistema es el Precio de Venta (SIN IVA).
 *
 * ── Modo estándar (useSinTaxCalculation = false) ───────────────
 *   IVA = PrecioVenta × (13/87) ≈ 14.9425%
 *   Ejemplo: Precio 800 Bs → IVA 119.54 Bs → Total 919.54 Bs
 *
 * ── Modo SIN (useSinTaxCalculation = true) ────────────────────
 *   IVA = PrecioVenta × 13%
 *   Ejemplo: Precio 100 Bs → IVA 13 Bs → Total 113 Bs
 *
 * ── Sin factura (invoiced = false) ───────────────────────────
 *   IVA = 0. Total = PrecioVenta.
 */

/** Tasa estándar: 13/87 ≈ 14.9425% */
export const TAX_RATE_STANDARD = 13 / 87;

/** Tasa SIN: 13% directo */
export const TAX_RATE_SIN = 13 / 100;

/** @deprecated Usar TAX_RATE_STANDARD */
export const TAX_RATE         = TAX_RATE_STANDARD;
export const SALES_TAX_RATE   = TAX_RATE_STANDARD;
export const PURCHASE_TAX_RATE = TAX_RATE_STANDARD;

/** Devuelve la tasa según la configuración */
export function getTaxRate(useSin: boolean): number {
  return useSin ? TAX_RATE_SIN : TAX_RATE_STANDARD;
}

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface LineCalc {
  priceBase:     number;
  discountTotal: number;
  priceNet:      number;
  lineNet:       number;
  taxLine:       number;
  lineFinal:     number;
}

export interface DocTotals {
  subtotal:      number;
  tax:           number;
  total:         number;
  totalDiscount: number;
}

// ─────────────────────────────────────────────
// calcLine
// ─────────────────────────────────────────────

export function calcLine(
  price:        number,
  quantity:     number,
  invoiced:     boolean,
  discountPct?: number | null,
  discountAmt?: number | null,
  useSinTaxCalculation = false,
): LineCalc {
  const priceBase = price * quantity;

  let discountTotal = 0;
  if (discountPct != null && discountPct > 0) {
    discountTotal = priceBase * (discountPct / 100);
  } else if (discountAmt != null && discountAmt > 0) {
    discountTotal = Math.min(discountAmt, priceBase);
  }

  const lineNet   = priceBase - discountTotal;
  const taxRate   = getTaxRate(useSinTaxCalculation);
  const taxLine   = invoiced ? lineNet * taxRate : 0;
  const lineFinal = lineNet + taxLine;
  const priceNet  = quantity > 0 ? lineNet / quantity : 0;

  return { priceBase, discountTotal, priceNet, lineNet, taxLine, lineFinal };
}

// ─────────────────────────────────────────────
// calcDocTotalsFromLines  (modo 'line')
// ─────────────────────────────────────────────

export function calcDocTotalsFromLines(lines: LineCalc[]): DocTotals {
  return {
    subtotal:      lines.reduce((s, l) => s + l.lineNet,       0),
    tax:           lines.reduce((s, l) => s + l.taxLine,       0),
    total:         lines.reduce((s, l) => s + l.lineFinal,     0),
    totalDiscount: lines.reduce((s, l) => s + l.discountTotal, 0),
  };
}

// ─────────────────────────────────────────────
// calcDocTotalsWithHeader  (modo 'header')
// ─────────────────────────────────────────────

export function calcDocTotalsWithHeader(
  lines:                LineCalc[],
  invoiced:             boolean,
  headerDiscountPct?:   number | null,
  headerDiscountAmt?:   number | null,
  useSinTaxCalculation = false,
): DocTotals {
  const grossNet = lines.reduce((s, l) => s + l.lineNet, 0);

  let headerDiscount = 0;
  if (headerDiscountPct != null && headerDiscountPct > 0) {
    headerDiscount = grossNet * (headerDiscountPct / 100);
  } else if (headerDiscountAmt != null && headerDiscountAmt > 0) {
    headerDiscount = Math.min(headerDiscountAmt, grossNet);
  }

  const subtotal = grossNet - headerDiscount;
  const taxRate  = getTaxRate(useSinTaxCalculation);
  const tax      = invoiced ? subtotal * taxRate : 0;
  const total    = subtotal + tax;

  return { subtotal, tax, total, totalDiscount: headerDiscount };
}