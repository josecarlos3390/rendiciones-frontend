import { Injectable } from '@angular/core';
import { RendM } from '../../models/rend-m.model';
import { RendD } from '../../models/rend-d.model';

@Injectable({ providedIn: 'root' })
export class RendicionPdfService {

  private jsPdfLoaded = false;

  private fmt(n: number | null | undefined, dec = 2): string {
    if (n === null || n === undefined) return '0.00';
    return Number(n).toLocaleString('es-BO', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  }

  private fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    const s = String(d).substring(0, 10);
    const parts = s.split('-');
    if (parts.length !== 3) return s;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private loadJsPdf(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ya cargado
      if (this.jsPdfLoaded && (window as any).jspdf?.jsPDF) {
        resolve();
        return;
      }
      // Verificar si ya está en el DOM
      const existing = document.getElementById('jspdf-script');
      if (existing) {
        // El script existe pero quizás aún no terminó de cargar
        existing.addEventListener('load', () => { this.jsPdfLoaded = true; resolve(); });
        existing.addEventListener('error', reject);
        // Si ya estaba cargado cuando llegamos
        if ((window as any).jspdf?.jsPDF) { this.jsPdfLoaded = true; resolve(); }
        return;
      }
      const script    = document.createElement('script');
      script.id       = 'jspdf-script';
      script.src      = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload   = () => { this.jsPdfLoaded = true; resolve(); };
      script.onerror  = () => reject(new Error('No se pudo cargar jsPDF'));
      document.head.appendChild(script);
    });
  }

  private getJsPDF(): any {
    // jsPDF UMD expone: window.jspdf.jsPDF
    const w = window as any;
    if (w.jspdf?.jsPDF)  return w.jspdf.jsPDF;
    if (w.jsPDF)         return w.jsPDF;
    throw new Error('jsPDF no está disponible');
  }

  async generarPDF(rend: RendM, docs: RendD[]): Promise<{ blob: Blob; url: string }> {
    await this.loadJsPdf();

    const JsPDF = this.getJsPDF();
    const doc   = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PW = 210;
    const ML = 14;
    const MR = 196;
    const CW = MR - ML;

    let y = 0;

    // ── Helpers ────────────────────────────────────────────────────────
    const setF = (size: number, style = 'normal') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
    };
    const setC  = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
    const setLC = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
    const setFC = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
    const txt   = (t: string, x: number, yy: number, opts?: any) =>
      doc.text(String(t ?? ''), x, yy, opts);

    // ── BANDA SUPERIOR ──────────────────────────────────────────────────
    setFC(30, 64, 175);
    doc.rect(0, 0, PW, 12, 'F');

    setF(13, 'bold');
    setC(255, 255, 255);
    txt('RENDICIÓN DE FONDOS', ML, 8.5);

    setF(9, 'normal');
    txt(`N° ${rend.U_IdRendicion}`, MR, 8.5, { align: 'right' });

    // Estado badge
    const estadoMap: Record<number, string> = {
      1: 'ABIERTO', 2: 'CERRADO', 3: 'APROBADO',
      4: 'ENVIADO', 5: 'SINCRONIZADO', 6: 'ERROR SYNC',
    };
    const estadoTxt = estadoMap[rend.U_Estado] ?? `Estado ${rend.U_Estado}`;
    setFC(219, 234, 254); setLC(147, 197, 253);
    doc.roundedRect(MR - 34, 13.5, 38, 6.5, 1, 1, 'FD');
    setF(6.5, 'bold'); setC(30, 64, 175);
    txt(estadoTxt, MR - 15, 17.5, { align: 'center' });

    // ── INFO GENERAL ────────────────────────────────────────────────────
    y = 24;
    setFC(248, 250, 252); setLC(203, 213, 225);
    doc.rect(ML, y, CW, 32, 'FD');

    // Col izquierda
    setF(6.5, 'bold'); setC(100, 116, 139);
    txt('EMPLEADO / RESPONSABLE', ML + 3, y + 5.5);
    setF(9, 'bold'); setC(15, 23, 42);
    txt(rend.U_NombreEmpleado?.trim() || rend.U_NomUsuario || '—', ML + 3, y + 10.5);

    setF(6.5, 'bold'); setC(100, 116, 139);
    txt('PERFIL', ML + 3, y + 17);
    setF(8, 'normal'); setC(15, 23, 42);
    txt(rend.U_NombrePerfil || '—', ML + 3, y + 22);

    setF(6.5, 'bold'); setC(100, 116, 139);
    txt('OBJETIVO', ML + 3, y + 28);
    setF(8, 'normal'); setC(15, 23, 42);
    const objTxt = doc.splitTextToSize(rend.U_Objetivo || '—', 90);
    txt(objTxt[0], ML + 3, y + 33);

    // Divisor vertical
    setLC(203, 213, 225);
    doc.line(PW / 2, y, PW / 2, y + 32);

    // Col derecha
    const RX = PW / 2 + 4;
    setF(6.5, 'bold'); setC(100, 116, 139);
    txt('PERÍODO', RX, y + 5.5);
    setF(8, 'normal'); setC(15, 23, 42);
    txt(`${this.fmtDate(rend.U_FechaIni)}  al  ${this.fmtDate(rend.U_FechaFinal)}`, RX, y + 10.5);

    setF(6.5, 'bold'); setC(100, 116, 139);
    txt('CUENTA CABECERA', RX, y + 17);
    setF(8, 'normal'); setC(15, 23, 42);
    const cuentaTxt = `${rend.U_Cuenta || ''} ${rend.U_NombreCuenta || ''}`.trim() || '—';
    txt(doc.splitTextToSize(cuentaTxt, 88)[0], RX, y + 22);

    setF(6.5, 'bold'); setC(100, 116, 139);
    txt('FECHA CREACIÓN', RX, y + 28);
    setF(8, 'normal'); setC(15, 23, 42);
    txt(this.fmtDate(rend.U_FechaCreacion), RX, y + 33);

    y += 37;

    // ── TABLA DOCUMENTOS ─────────────────────────────────────────────────
    const COL = {
      fecha:    { x: ML,        w: 18 },
      tipo:     { x: ML + 18,   w: 22 },
      nro:      { x: ML + 40,   w: 18 },
      prov:     { x: ML + 58,   w: 42 },
      conc:     { x: ML + 100,  w: 38 },
      imp:      { x: ML + 138,  w: 20 },
      ret:      { x: ML + 158,  w: 18 },
      tot:      { x: ML + 176,  w: CW - 162 },
    };

    // Header
    setFC(30, 64, 175); setLC(30, 64, 175);
    doc.rect(ML, y, CW, 7, 'F');
    setF(6, 'bold'); setC(255, 255, 255);
    txt('FECHA',      COL.fecha.x + 1,  y + 4.7);
    txt('TIPO',       COL.tipo.x + 1,   y + 4.7);
    txt('N° DOC',     COL.nro.x + 1,    y + 4.7);
    txt('PROVEEDOR',  COL.prov.x + 1,   y + 4.7);
    txt('CONCEPTO',   COL.conc.x + 1,   y + 4.7);
    txt('IMPORTE',    COL.imp.x + COL.imp.w,   y + 4.7, { align: 'right' });
    txt('IMP.RET',    COL.ret.x + COL.ret.w,   y + 4.7, { align: 'right' });
    txt('TOTAL',      COL.tot.x + COL.tot.w,   y + 4.7, { align: 'right' });
    y += 7;

    let sumImp = 0, sumRet = 0, sumTot = 0;

    if (!docs || docs.length === 0) {
      setFC(255, 255, 255); setLC(226, 232, 240);
      doc.rect(ML, y, CW, 8, 'FD');
      setF(7, 'italic'); setC(100, 116, 139);
      txt('Sin documentos registrados', ML + CW / 2, y + 5, { align: 'center' });
      y += 8;
    }

    docs.forEach((d, idx) => {
      const RH = 6.5;
      if (y > 240) { doc.addPage(); y = 15; }

      setFC(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      setLC(226, 232, 240);
      doc.rect(ML, y, CW, RH, 'FD');

      const importe = Number(d.U_RD_Importe) || 0;
      const impRet  = Number(d.U_RD_ImpRet)  || 0;
      const total   = Number(d.U_RD_Total)    || (importe - impRet);
      sumImp += importe; sumRet += impRet; sumTot += total;

      const prov = d.U_RD_Prov?.trim()
        ? doc.splitTextToSize(d.U_RD_Prov, COL.prov.w - 2)[0]
        : (d.U_RD_NIT || '—');
      const conc = doc.splitTextToSize(d.U_RD_Concepto || '—', COL.conc.w - 2)[0];

      setF(6.5, 'normal'); setC(30, 41, 59);
      txt(this.fmtDate(d.U_RD_Fecha),        COL.fecha.x + 1,  y + 4.3);
      txt(d.U_RD_TipoDoc || '—',             COL.tipo.x + 1,   y + 4.3);
      txt(d.U_RD_NumDocumento || '—',         COL.nro.x + 1,    y + 4.3);
      txt(prov,                               COL.prov.x + 1,   y + 4.3);
      txt(conc,                               COL.conc.x + 1,   y + 4.3);
      txt(this.fmt(importe), COL.imp.x + COL.imp.w, y + 4.3, { align: 'right' });
      txt(this.fmt(impRet),  COL.ret.x + COL.ret.w, y + 4.3, { align: 'right' });
      setF(6.5, 'bold');
      txt(this.fmt(total),   COL.tot.x + COL.tot.w, y + 4.3, { align: 'right' });

      y += RH;
    });

    // Fila totales
    setFC(30, 64, 175); setLC(30, 64, 175);
    doc.rect(ML, y, CW, 8, 'F');
    setF(7, 'bold'); setC(255, 255, 255);
    txt('TOTALES', ML + 3, y + 5.5);
    txt(this.fmt(sumImp), COL.imp.x + COL.imp.w, y + 5.5, { align: 'right' });
    txt(this.fmt(sumRet), COL.ret.x + COL.ret.w, y + 5.5, { align: 'right' });
    setF(8, 'bold');
    txt(this.fmt(sumTot), COL.tot.x + COL.tot.w, y + 5.5, { align: 'right' });
    y += 12;

    // ── RESUMEN IMPUESTOS ────────────────────────────────────────────────
    const tIVA   = docs.reduce((s, d) => s + (Number(d.U_MontoIVA)   || 0), 0);
    const tIT    = docs.reduce((s, d) => s + (Number(d.U_MontoIT)    || 0), 0);
    const tRCIVA = docs.reduce((s, d) => s + (Number(d.U_MontoRCIVA) || 0), 0);
    const tIUE   = docs.reduce((s, d) => s + (Number(d.U_MontoIUE)   || 0), 0);

    if (tIVA + tIT + tRCIVA + tIUE > 0) {
      if (y > 245) { doc.addPage(); y = 15; }
      setFC(240, 249, 255); setLC(186, 230, 253);
      doc.rect(ML, y, CW, 9, 'FD');
      setF(6.5, 'bold'); setC(30, 64, 175);
      txt('IMPUESTOS:', ML + 3, y + 6);
      setF(6.5, 'normal'); setC(30, 41, 59);
      let tx = ML + 28;
      if (tIVA   > 0) { txt(`IVA ${this.fmt(tIVA)}`,         tx, y + 6); tx += 36; }
      if (tIT    > 0) { txt(`IT ${this.fmt(tIT)}`,           tx, y + 6); tx += 34; }
      if (tRCIVA > 0) { txt(`RC-IVA ${this.fmt(tRCIVA)}`,   tx, y + 6); tx += 38; }
      if (tIUE   > 0) { txt(`IUE ${this.fmt(tIUE)}`,         tx, y + 6); }
      y += 13;
    }

    // ── MONTO TOTAL ──────────────────────────────────────────────────────
    if (y > 248) { doc.addPage(); y = 15; }
    setFC(239, 246, 255); setLC(59, 130, 246);
    doc.roundedRect(MR - 62, y, 66, 12, 1.5, 1.5, 'FD');
    setF(6.5, 'normal'); setC(71, 85, 105);
    txt('MONTO TOTAL RENDICIÓN', MR - 29, y + 5, { align: 'center' });
    setF(11, 'bold'); setC(30, 64, 175);
    txt(`Bs ${this.fmt(rend.U_Monto)}`, MR - 29, y + 10.5, { align: 'center' });
    y += 18;

    // ── FIRMAS ───────────────────────────────────────────────────────────
    if (y > 232) { doc.addPage(); y = 15; }
    setFC(248, 250, 252); setLC(203, 213, 225);
    doc.rect(ML, y, CW, 42, 'FD');
    setF(7, 'bold'); setC(100, 116, 139);
    txt('FIRMAS Y CONFORMIDAD', ML + 4, y + 6);

    const sigW  = (CW - 16) / 3;
    const lineY = y + 35;
    const labY  = y + 38.5;
    const subY  = y + 42;

    // Firma 1 — Solicitante
    const x1 = ML + 4;
    setLC(100, 116, 139);
    doc.line(x1, lineY, x1 + sigW, lineY);
    setF(6.5, 'bold'); setC(30, 41, 59);
    txt('SOLICITANTE', x1 + sigW / 2, labY, { align: 'center' });
    setF(5.5, 'normal'); setC(100, 116, 139);
    txt(rend.U_NombreEmpleado?.trim() || rend.U_NomUsuario || '', x1 + sigW / 2, subY, { align: 'center' });

    // Firma 2 — Aprobador
    const x2 = ML + 4 + sigW + 4;
    doc.line(x2, lineY, x2 + sigW, lineY);
    setF(6.5, 'bold'); setC(30, 41, 59);
    txt('APROBADOR / JEFE INMEDIATO', x2 + sigW / 2, labY, { align: 'center' });
    setF(5.5, 'normal'); setC(100, 116, 139);
    txt('Nombre, cargo y sello', x2 + sigW / 2, subY, { align: 'center' });

    // Firma 3 — Recepción contabilidad
    const x3 = ML + 4 + (sigW + 4) * 2;
    doc.line(x3, lineY, x3 + sigW, lineY);
    setF(6.5, 'bold'); setC(30, 41, 59);
    txt('RECEPCIÓN CONTABILIDAD', x3 + sigW / 2, labY, { align: 'center' });
    setF(5.5, 'normal'); setC(100, 116, 139);
    txt('Fecha: ___/___/______', x3 + sigW / 2, subY, { align: 'center' });

    // ── PIE DE PÁGINA ────────────────────────────────────────────────────
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      setFC(30, 64, 175);
      doc.rect(0, 287, PW, 10, 'F');
      setF(6, 'normal'); setC(148, 163, 184);
      const pie = `Rendición N° ${rend.U_IdRendicion}  |  ${rend.U_NombrePerfil || ''}  |  ${this.fmtDate(rend.U_FechaIni)} – ${this.fmtDate(rend.U_FechaFinal)}`;
      txt(pie, ML, 292.5);
      txt(`Pág. ${i} / ${pages}`, MR, 292.5, { align: 'right' });
    }

    const blob = doc.output('blob') as Blob;
    const url  = URL.createObjectURL(blob);
    return { blob, url };
  }

  descargar(blob: Blob, rend: RendM): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `Rendicion_${rend.U_IdRendicion}_${(rend.U_NomUsuario || '').replace(/\s+/g, '_')}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}