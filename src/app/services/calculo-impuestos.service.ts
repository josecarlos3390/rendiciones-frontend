import { Injectable } from '@angular/core';
import { Documento } from '@models/documento.model';

export interface ValoresFormulario {
  importe: number;
  exento: number;
  tasa: number;
  tasaCero: number;
  giftCard: number;
  ice: number;
}

export interface ResultadoCalculoImpuestos {
  exento: number;
  ice: number;
  baseImponible: number;
  montoIVA: number;
  montoIT: number;
  montoIUE: number;
  montoRCIVA: number;
  impRet: number;
  total: number;
}

/**
 * Servicio puro de cálculo de impuestos para documentos de rendición.
 *
 * No modifica formularios ni estado de UI; solo recibe la configuración
 * del tipo de documento y los valores del formulario, y devuelve los
 * montos calculados.
 */
@Injectable({ providedIn: 'root' })
export class CalculoImpuestosService {

  /**
   * Calcula los impuestos y totales según el tipo de documento SAP.
   *
   * - Tipo 1 (Factura): cálculo normal sobre base imponible.
   * - Tipo 4 / 10 (Recibo/Alquiler) con TipoCalc = '1': Grossing Down.
   * - Tipo 4 / 10 (Recibo/Alquiler) con TipoCalc = '0': Grossing Up.
   *
   * @param documento Configuración del tipo de documento (REND_CTA)
   * @param valores Valores actuales del formulario
   * @returns Resultado del cálculo fiscal, o null si el documento no requiere cálculo
   */
  calcular(documento: Documento | null, valores: ValoresFormulario): ResultadoCalculoImpuestos | null {
    if (!documento) return null;

    const idTipoDoc = Number(documento.U_IdTipoDoc);
    if (![1, 4, 10].includes(idTipoDoc)) return null;

    const importe = this._n(valores.importe);

    // ── Exento ────────────────────────────────────────────────────
    const exentoPct = Number(documento.U_EXENTOpercent);
    const exento = exentoPct === -1
      ? this._n(valores.exento)
      : exentoPct > 0
        ? this._round(importe * (exentoPct / 100))
        : 0;

    // ── Tasa y ICE ────────────────────────────────────────────────
    const tasa = Number(documento.U_TASA) === -1 ? this._n(valores.tasa) : Number(documento.U_TASA);
    const icePct = Number(documento.U_ICE);
    const ice = icePct === -1
      ? this._n(valores.ice)
      : icePct > 0
        ? this._round(importe * (icePct / 100))
        : 0;

    const tasaCero = this._n(valores.tasaCero);
    const giftCard = this._n(valores.giftCard);

    // ── Base imponible ────────────────────────────────────────────
    const baseImponible = Math.max(0, importe - exento - ice - tasa - tasaCero - giftCard);

    let montoIVA = 0;
    let montoIT = 0;
    let montoIUE = 0;
    let montoRCIVA = 0;

    const tipoCalc = String(documento.U_TipoCalc);
    const esRecibo = idTipoDoc === 4 || idTipoDoc === 10;

    if (idTipoDoc === 1) {
      // ── Factura: cálculo normal sobre base imponible ──────────
      montoIVA   = this._calcImpuesto(baseImponible, documento.U_IVApercent);
      montoIT    = this._calcImpuesto(baseImponible, documento.U_ITpercent);
      montoIUE   = this._calcImpuesto(baseImponible, documento.U_IUEpercent);
      montoRCIVA = this._calcImpuesto(baseImponible, documento.U_RCIVApercent);

    } else if (esRecibo && tipoCalc === '1') {
      // ── Grossing Down: impuestos sobre importe ────────────────
      montoIT    = this._calcImpuesto(importe, documento.U_ITpercent);
      montoRCIVA = this._calcImpuesto(importe, documento.U_RCIVApercent);
      montoIVA   = this._calcImpuesto(importe, documento.U_IVApercent);
      montoIUE   = this._calcImpuesto(importe, documento.U_IUEpercent);

    } else if (esRecibo && tipoCalc === '0') {
      // ── Grossing Up: calcular bruto ───────────────────────────
      const tasaIUE   = (Number(documento.U_IUEpercent)  || 0) / 100;
      const tasaIT    = (Number(documento.U_ITpercent)    || 0) / 100;
      const tasaRCIVA = (Number(documento.U_RCIVApercent) || 0) / 100;
      const tasaIVA   = (Number(documento.U_IVApercent)   || 0) / 100;
      const sumaTasas = tasaIUE + tasaIT + tasaRCIVA + tasaIVA;

      const bruto = sumaTasas > 0 && sumaTasas < 1
        ? this._round(importe / (1 - sumaTasas))
        : importe;

      montoIUE   = this._round(bruto * tasaIUE);
      montoIT    = this._round(bruto * tasaIT);
      montoRCIVA = this._round(bruto * tasaRCIVA);
      montoIVA   = this._round(bruto * tasaIVA);
    }

    const impRet = this._round(montoIVA + montoIT + montoIUE + montoRCIVA);
    const total  = esRecibo && tipoCalc === '0'
      ? this._round(importe + impRet)
      : this._round(importe - impRet);

    return {
      exento: this._round(exento),
      ice: this._round(ice),
      baseImponible,
      montoIVA: this._round(montoIVA),
      montoIT: this._round(montoIT),
      montoIUE: this._round(montoIUE),
      montoRCIVA: this._round(montoRCIVA),
      impRet,
      total,
    };
  }

  /** Calcula un impuesto: si pct es 0 o null → 0; si pct > 0 → base × pct / 100 */
  private _calcImpuesto(base: number, pct: number | null | undefined): number {
    if (!pct || pct <= 0) return 0;
    return base * (pct / 100);
  }

  /** Convierte a número seguro */
  private _n(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  /** Redondea a 2 decimales */
  private _round(v: number): number {
    return Math.round(v * 100) / 100;
  }
}
