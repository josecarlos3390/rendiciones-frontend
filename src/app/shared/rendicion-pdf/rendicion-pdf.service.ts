import { Injectable } from '@angular/core';
import { RendM } from '../../models/rend-m.model';
import { RendD } from '../../models/rend-d.model';

@Injectable({ providedIn: 'root' })
export class RendicionPdfService {

  private jsPdfLoaded = false;
  private jspdfInstance: any = null;

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
      if (this.jspdfInstance) {
        resolve();
        return;
      }
      const existing = document.getElementById('jspdf-script');
      if (existing) {
        this.jspdfInstance = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
        if (this.jspdfInstance) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => {
          this.jspdfInstance = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
          resolve();
        });
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.id = 'jspdf-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        this.jspdfInstance = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
        resolve();
      };
      script.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
      document.head.appendChild(script);
    });
  }

  async generarPDF(rend: RendM, docs: RendD[], orientation: 'portrait' | 'landscape' = 'portrait'): Promise<{ blob: Blob; url: string }> {
    await this.loadJsPdf();

    const JsPDF = this.jspdfInstance;
    const doc = new JsPDF({ orientation, unit: 'mm', format: 'a4' });

    const isLandscape = orientation === 'landscape';
    const PW = isLandscape ? 297 : 210;
    const ML = 14;
    const MR = isLandscape ? 283 : 196;
    const CW = MR - ML;

    let y = 0;

    const setF = (size: number, style = 'normal') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
    };
    const setC = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
    const setLC = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
    const setFC = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
    const txt = (t: string, x: number, yy: number, opts?: any) => doc.text(String(t ?? ''), x, yy, opts);

    const nombreResp = rend.U_NombreEmpleado?.trim() || rend.U_NomUsuario || '—';
    const cuentaFull = `${rend.U_Cuenta || ''} - ${rend.U_NombreCuenta || ''}`.trim() || '—';
    const periodo = `${this.fmtDate(rend.U_FechaIni)} al ${this.fmtDate(rend.U_FechaFinal)}`;
    const objetivo = rend.U_Objetivo || '—';
    const nombrePerfil = rend.U_NombrePerfil || '—';

    const estadoMap: Record<number, string> = { 1: 'ABIERTO', 2: 'CERRADO', 3: 'ELIMINADO', 4: 'ENVIADO', 5: 'SINCRONIZADO', 6: 'ERROR SYNC', 7: 'APROBADO' };
    const estadoTxt = estadoMap[rend.U_Estado] ?? `Estado ${rend.U_Estado}`;
    const estadoColor: Record<number, number[]> = {
      1: [59, 130, 246],
      2: [107, 114, 128],
      3: [16, 185, 129],
      4: [139, 92, 246],
      5: [5, 150, 105],
      6: [220, 38, 38]
    };
    const colorEstado = estadoColor[rend.U_Estado] || [107, 114, 128];

    // Encabezado con gradiente simulado
    setFC(30, 64, 175);
    doc.rect(0, 0, PW, 16, 'F');
    setF(14, 'bold');
    setC(255, 255, 255);
    txt('RENDICIÓN DE GASTOS', ML, 10);
    setF(10, 'bold');
    txt(`N° ${rend.U_IdRendicion}`, PW / 2, 10, { align: 'center' });

    // Badge de estado
    setFC(colorEstado[0], colorEstado[1], colorEstado[2]);
    doc.roundedRect(MR - 32, 5, 28, 6, 1, 1, 'FD');
    setF(7, 'bold');
    setC(255, 255, 255);
    txt(estadoTxt, MR - 18, 8.5, { align: 'center' });

    y = 20;

    // Sección: Responsable
    setFC(241, 245, 249);
    doc.roundedRect(ML, y, CW, 18, 2, 2, 'FD');
    setF(9, 'bold');
    setC(30, 64, 175);
    txt('RESPONSABLE', ML + 3, y + 5);
    setF(8, 'normal');
    setC(55, 65, 75);
    txt(`Nombre: ${nombreResp}`, ML + 3, y + 10);
    txt(`Perfil: ${nombrePerfil}`, ML + 3, y + 14);

    y += 22;

    // Sección: Datos de la Rendición
    setFC(241, 245, 249);
    doc.roundedRect(ML, y, CW, 22, 2, 2, 'FD');
    setF(9, 'bold');
    setC(30, 64, 175);
    txt('DATOS DE LA RENDICIÓN', ML + 3, y + 5);
    setF(8, 'normal');
    setC(55, 65, 75);
    txt(`Período: ${periodo}`, ML + 3, y + 10);
    txt(`Cuenta: ${cuentaFull}`, ML + 3, y + 14);
    txt(`Objetivo: ${objetivo.substring(0, 70)}`, ML + 3, y + 18);

    y += 26;

    // Tabla de documentos
    let cols: string[];
    let colAnchos: number[];
    
    if (isLandscape) {
      cols = ['Fecha', 'Tipo', 'N° Doc', 'Importe', 'Desc.', 'Exento', 'Tasa', 'Gift', 'ICE', 'IVA', 'IT', 'RC-IVA', 'IUE', 'Total'];
      colAnchos = [16, 30, 20, 22, 18, 18, 14, 16, 14, 18, 14, 16, 14, 26];
    } else {
      cols = ['Fecha', 'Tipo', 'N° Doc', 'Glosa', 'Importe', 'Imp/Ret', 'Total'];
      colAnchos = [16, 24, 18, 40, 20, 18, 24];
    }
    
    const colCount = cols.length;
    const totalAncho = colAnchos.reduce((a, b) => a + b, 0);
    const escala = CW / totalAncho;
    colAnchos = colAnchos.map(w => w * escala);

    // Header de tabla
    setFC(30, 64, 175);
    doc.rect(ML, y, CW, 7, 'F');
    setF(6, 'bold');
    setC(255, 255, 255);
    let xAcum = ML;
    cols.forEach((c, i) => {
      let xPos: number;
      let align: 'center' | 'left' | 'right' = 'left';
      
      if (isLandscape) {
        // Horizontal: centrado para todas las columnas de datos
        if (i === 0 || i === 1 || i === 2) {
          xPos = xAcum + colAnchos[i] / 2;
          align = 'center';
        } else if (i === cols.length - 1) {
          xPos = xAcum + colAnchos[i] / 2;
          align = 'center';
        } else if (i >= 3 && i <= 12) {
          xPos = xAcum + colAnchos[i] / 2;
          align = 'center';
        } else {
          xPos = xAcum + 2;
        }
      } else {
        // Vertical: centrado para Fecha, Tipo, N° Doc, Importe, Imp/Ret, Total
        if (i === 0 || i === 1 || i === 2 || i === 4 || i === 5 || i === 6) {
          xPos = xAcum + colAnchos[i] / 2;
          align = 'center';
        } else {
          xPos = xAcum + 2;
        }
      }
      txt(c, xPos, y + 4.5, { align });
      xAcum += colAnchos[i];
    });
    y += 7;

    let sumImporte = 0;
    let sumDescuento = 0;
    let sumIva = 0;
    let sumTotal = 0;
    let sumIT = 0;
    let sumRCIVA = 0;
    let sumIUE = 0;
    let sumExento = 0;
    let sumICE = 0;
    let sumTASA = 0;
    let sumGiftCard = 0;
    let sumImpRet = 0;

    if (!docs || docs.length === 0) {
      setF(8, 'italic');
      setC(100, 116, 139);
      txt('Sin documentos registrados', ML + CW / 2, y + 4, { align: 'center' });
      y += 8;
    } else {
      docs.forEach((d, idx) => {
        if (y > 265) { doc.addPage(); y = 14; }

        const importe = Number(d.U_RD_Importe) || 0;
        const descuento = Number(d.U_RD_Descuento) || 0;
        const iva = Number(d.U_MontoIVA) || 0;
        const total = Number(d.U_RD_Total) || (importe - descuento + iva);
        const it = Number(d.U_MontoIT) || 0;
        const rciva = Number(d.U_MontoRCIVA) || 0;
        const iue = Number(d.U_MontoIUE) || 0;
        const exento = Number(d.U_RD_Exento) || 0;
        const ice = Number(d.U_ICE) || 0;
        const tasa = Number(d.U_TASA) || 0;
        const giftCard = Number(d.U_GIFTCARD) || 0;
        const impRet = Number(d.U_RD_ImpRet) || 0;

        sumImporte += importe;
        sumDescuento += descuento;
        sumIva += iva;
        sumTotal += total;
        sumIT += it;
        sumRCIVA += rciva;
        sumIUE += iue;
        sumExento += exento;
        sumICE += ice;
        sumTASA += tasa;
        sumGiftCard += giftCard;
        sumImpRet += impRet;

        // Alternar colores de fila
        setFC(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 245);
        doc.rect(ML, y, CW, 6);
        setF(6, 'normal');
        setC(30, 41, 59);

        if (isLandscape) {
          xAcum = ML;
          txt(this.fmtDate(d.U_RD_Fecha), xAcum + colAnchos[0] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[0];
          txt((d.U_RD_TipoDoc || '—').substring(0, 20), xAcum + colAnchos[1] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[1];
          txt((d.U_RD_NumDocumento || '—').substring(0, 12), xAcum + colAnchos[2] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[2];
          txt(this.fmt(importe), xAcum + colAnchos[3] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[3];
          txt(this.fmt(descuento), xAcum + colAnchos[4] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[4];
          txt(this.fmt(exento), xAcum + colAnchos[5] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[5];
          txt(this.fmt(tasa), xAcum + colAnchos[6] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[6];
          txt(this.fmt(giftCard), xAcum + colAnchos[7] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[7];
          txt(this.fmt(ice), xAcum + colAnchos[8] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[8];
          txt(this.fmt(iva), xAcum + colAnchos[9] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[9];
          txt(this.fmt(it), xAcum + colAnchos[10] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[10];
          txt(this.fmt(rciva), xAcum + colAnchos[11] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[11];
          txt(this.fmt(iue), xAcum + colAnchos[12] / 2, y + 4, { align: 'center' });
          xAcum += colAnchos[12];
          txt(this.fmt(total), xAcum + colAnchos[13] / 2, y + 4, { align: 'center' });
        } else {
          const glosa = (d.U_RD_Concepto || '—').substring(0, 25);
          const impRet = (Number(d.U_RD_Total) || 0) - importe;
          const impRetStr = impRet > 0 ? this.fmt(impRet) : (impRet < 0 ? `-${this.fmt(Math.abs(impRet))}` : '0.00');
          txt(this.fmtDate(d.U_RD_Fecha), ML + colAnchos[0] / 2, y + 4, { align: 'center' });
          txt((d.U_RD_TipoDoc || '—').substring(0,20), ML + colAnchos[0] + colAnchos[1] / 2, y + 4, { align: 'center' });
          txt(d.U_RD_NumDocumento || '—', ML + colAnchos[0] + colAnchos[1] + colAnchos[2] / 2, y + 4, { align: 'center' });
          txt(glosa, ML + colAnchos[0] + colAnchos[1] + colAnchos[2] + 2, y + 4);
          txt(this.fmt(importe), ML + colAnchos[0] + colAnchos[1] + colAnchos[2] + colAnchos[3] + colAnchos[4] / 2, y + 4, { align: 'center' });
          txt(impRetStr, ML + colAnchos[0] + colAnchos[1] + colAnchos[2] + colAnchos[3] + colAnchos[4] + colAnchos[5] / 2, y + 4, { align: 'center' });
          txt(this.fmt(total), ML + CW - colAnchos[6] / 2, y + 4, { align: 'center' });
        }

        y += 6;
      });

      // Fila de totales
      setFC(30, 64, 175);
      doc.rect(ML, y, CW, 7, 'F');
      setF(6.5, 'bold');
      setC(255, 255, 255);
      if (isLandscape) {
        xAcum = ML;
        txt('TOTALES', xAcum + 2, y + 4.5);
        xAcum += colAnchos[0] + colAnchos[1] + colAnchos[2];
        txt(this.fmt(sumImporte), xAcum + colAnchos[3] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[3];
        txt(this.fmt(sumDescuento), xAcum + colAnchos[4] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[4];
        txt(this.fmt(sumExento), xAcum + colAnchos[5] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[5];
        txt(this.fmt(sumTASA), xAcum + colAnchos[6] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[6];
        txt(this.fmt(sumGiftCard), xAcum + colAnchos[7] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[7];
        txt(this.fmt(sumICE), xAcum + colAnchos[8] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[8];
        txt(this.fmt(sumIva), xAcum + colAnchos[9] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[9];
        txt(this.fmt(sumIT), xAcum + colAnchos[10] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[10];
        txt(this.fmt(sumRCIVA), xAcum + colAnchos[11] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[11];
        txt(this.fmt(sumIUE), xAcum + colAnchos[12] / 2, y + 4.5, { align: 'center' });
        xAcum += colAnchos[12];
        txt(this.fmt(sumTotal), xAcum + colAnchos[13] / 2, y + 4.5, { align: 'center' });
      } else {
        const sumImpRet = sumTotal - sumImporte;
        const sumImpRetStr = sumImpRet > 0 ? this.fmt(sumImpRet) : (sumImpRet < 0 ? `-${this.fmt(Math.abs(sumImpRet))}` : '0.00');
        txt('TOTALES', ML + 2, y + 4.5);
        txt(this.fmt(sumImporte), ML + colAnchos[0] + colAnchos[1] + colAnchos[2] + colAnchos[3] + colAnchos[4] / 2, y + 4.5, { align: 'center' });
        txt(sumImpRetStr, ML + colAnchos[0] + colAnchos[1] + colAnchos[2] + colAnchos[3] + colAnchos[4] + colAnchos[5] / 2, y + 4.5, { align: 'center' });
        txt(this.fmt(sumTotal), ML + CW - colAnchos[6] / 2, y + 4.5, { align: 'center' });
      }
      y += 10;
    }

    // Resumen de retenciones e impuestos
    if (y > 230) { doc.addPage(); y = 14; }
    
    const hasIVA = sumIva > 0;
    const hasExento = sumExento > 0;
    const hasICE = sumICE > 0;
    const hasTASA = sumTASA > 0;
    const hasGiftCard = sumGiftCard > 0;
    const hasOther = hasExento || hasICE || hasTASA || hasGiftCard;
    
    if (isLandscape) {
      // Horizontal: retenciones + IVA en la misma línea
      setFC(239, 246, 255);
      const boxHeight = 14;
      doc.roundedRect(ML, y, CW, boxHeight, 2, 2, 'FD');
      setF(8, 'bold');
      setC(30, 64, 175);
      txt('RESUMEN DE RETENCIONES E IMPUESTOS', ML + 3, y + 5);
      
      setF(6.5, 'normal');
      setC(55, 65, 75);
      txt(`IT: ${this.fmt(sumIT)}  |  RC-IVA: ${this.fmt(sumRCIVA)}  |  IUE: ${this.fmt(sumIUE)}  |  IVA: ${this.fmt(sumIva)}`, ML + 3, y + 10);
      y += boxHeight + 4;
    } else {
      // Vertical: retenciones + impuestos adicionales
      setFC(239, 246, 255);
      const rowsRet = 1;
      const rowsImp = hasIVA || hasOther ? 1 : 0;
      const boxHeight = 8 + (rowsRet + rowsImp) * 5;
      doc.roundedRect(ML, y, CW, boxHeight, 2, 2, 'FD');
      
      let yy = y;
      setF(8, 'bold');
      setC(30, 64, 175);
      txt('RESUMEN', ML + 3, yy + 5);
      
      setF(7, 'normal');
      setC(55, 65, 75);
      yy += 5;
      txt(`IT: ${this.fmt(sumIT)}  |  RC-IVA: ${this.fmt(sumRCIVA)}  |  IUE: ${this.fmt(sumIUE)}`, ML + 3, yy + 4);
      
      if (hasIVA || hasOther) {
        yy += 5;
        let impTxt = '';
        if (hasIVA) impTxt += `IVA: ${this.fmt(sumIva)}`;
        if (hasIVA && hasOther) impTxt += '  |  ';
        if (hasExento) impTxt += `Exento: ${this.fmt(sumExento)}`;
        if ((hasExento && hasICE) || (hasExento && hasTASA) || (hasExento && hasGiftCard)) impTxt += '  |  ';
        if (hasICE) impTxt += `ICE: ${this.fmt(sumICE)}`;
        if (hasICE && hasTASA) impTxt += '  |  ';
        if (hasTASA) impTxt += `Tasa: ${this.fmt(sumTASA)}`;
        if (hasTASA && hasGiftCard) impTxt += '  |  ';
        if (hasGiftCard) impTxt += `GiftCard: ${this.fmt(sumGiftCard)}`;
        txt(impTxt, ML + 3, yy + 4);
      }
      
      y += boxHeight + 3;
    }

    // Resumen según orientación
    if (isLandscape) {
      // Formato horizontal: siempre mostrar todos los campos
      if (y > 180) { doc.addPage(); y = 14; }
      setFC(229, 246, 229);
      doc.roundedRect(ML, y, CW, 48, 2, 2, 'FD');
      setF(9, 'bold');
      setC(30, 64, 175);
      txt('RESUMEN FINANCIERO', ML + 3, y + 5);
      
      setF(7, 'normal');
      setC(55, 65, 75);
      
      let ly = 12;
      txt(`Total Documentos:`, ML + 3, y + ly);
      txt(this.fmt(sumImporte), ML + 50, y + ly, { align: 'right' });
      ly += 5;
      
      if (sumDescuento > 0) {
        txt(`Descuento:`, ML + 3, y + ly);
        txt(`-${this.fmt(sumDescuento)}`, ML + 50, y + ly, { align: 'right' });
        ly += 5;
      }
      
      txt(`IVA:`, ML + 3, y + ly);
      txt(this.fmt(sumIva), ML + 50, y + ly, { align: 'right' });
      ly += 5;
      
      if (sumExento > 0) {
        txt(`Exento:`, ML + 3, y + ly);
        txt(this.fmt(sumExento), ML + 50, y + ly, { align: 'right' });
        ly += 5;
      }
      if (sumICE > 0) {
        txt(`ICE:`, ML + 3, y + ly);
        txt(this.fmt(sumICE), ML + 50, y + ly, { align: 'right' });
        ly += 5;
      }
      if (sumTASA > 0) {
        txt(`Tasa:`, ML + 3, y + ly);
        txt(this.fmt(sumTASA), ML + 50, y + ly, { align: 'right' });
        ly += 5;
      }
      if (sumGiftCard > 0) {
        txt(`GiftCard:`, ML + 3, y + ly);
        txt(this.fmt(sumGiftCard), ML + 50, y + ly, { align: 'right' });
        ly += 5;
      }
      
      ly += 1;
      txt(`IT:`, ML + 3, y + ly);
      txt(this.fmt(sumIT), ML + 50, y + ly, { align: 'right' });
      ly += 5;
      
      txt(`RC-IVA:`, ML + 3, y + ly);
      txt(this.fmt(sumRCIVA), ML + 50, y + ly, { align: 'right' });
      ly += 5;
      
      txt(`IUE:`, ML + 3, y + ly);
      txt(this.fmt(sumIUE), ML + 50, y + ly, { align: 'right' });
      ly += 5;
      
      setLC(30, 64, 175);
      doc.line(ML + 3, y + ly + 1, ML + CW - 3, y + ly + 1);
      ly += 4;
      
      setF(9, 'bold');
      setC(5, 150, 105);
      txt(`Total Rendido: Bs ${this.fmt(sumTotal)}`, ML + 3, y + ly + 3);
      
      y += 54;
    } else {
      // Formato vertical: solo lo que el usuario conoce
      if (y > 200) { doc.addPage(); y = 14; }
      setFC(229, 246, 229);
      doc.roundedRect(ML, y, CW, 36, 2, 2, 'FD');
      setF(9, 'bold');
      setC(30, 64, 175);
      txt('RESUMEN DE RENDICIÓN', ML + 3, y + 5);
      
      const montoEntregado = Number(rend.U_Monto) || 0;
      
      setF(8, 'normal');
      setC(55, 65, 75);
      txt(`Monto Registrado:`, ML + 3, y + 12);
      setF(10, 'bold');
      setC(55, 65, 75);
      txt(`Bs ${this.fmt(montoEntregado)}`, ML + CW - 3, y + 12, { align: 'right' });
      
      setF(8, 'normal');
      setC(55, 65, 75);
      txt(`Total Documentos:`, ML + 3, y + 18);
      setF(10, 'bold');
      setC(5, 150, 105);
      txt(`Bs ${this.fmt(sumImporte)}`, ML + CW - 3, y + 18, { align: 'right' });

      y += 40;

      // Diferencia de rendición
      const diferencia = montoEntregado - sumImporte;
      
      if (y > 220) { doc.addPage(); y = 14; }
      if (diferencia !== 0) {
        const esSaldoReintegrar = diferencia > 0;
        setFC(esSaldoReintegrar ? 254 : 249, esSaldoReintegrar ? 226 : 235, esSaldoReintegrar ? 226 : 209);
        doc.roundedRect(ML, y, CW, 22, 2, 2, 'FD');
        setF(9, 'bold');
        setC(esSaldoReintegrar ? 180 : 30, esSaldoReintegrar ? 83 : 64, esSaldoReintegrar ? 83 : 175);
        const labelDiff = esSaldoReintegrar ? 'SALDO POR REINTEGRAR' : 'SALDO A DEVOLVER';
        txt(labelDiff, ML + 3, y + 7);
        setF(11, 'bold');
        setC(esSaldoReintegrar ? 180 : 30, esSaldoReintegrar ? 83 : 64, esSaldoReintegrar ? 83 : 175);
        txt(`Bs ${this.fmt(Math.abs(diferencia))}`, ML + CW - 3, y + 16, { align: 'right' });
        y += 26;
      }
    }

    // Firmas
    if (y > 240) { doc.addPage(); y = 14; }
    setFC(248, 250, 252);
    doc.roundedRect(ML, y, CW, 28, 2, 2, 'FD');
    setF(9, 'bold');
    setC(30, 64, 175);
    txt('FIRMAS DE CONFORMIDAD', ML + 3, y + 5);

    const fw = (CW - 10) / 3;
    setF(8, 'normal');
    setC(100, 116, 139);
    
    setLC(180, 190, 200);
    doc.line(ML + 5, y + 22, ML + 5 + fw - 5, y + 22);
    txt('RESPONSABLE', ML + 5 + (fw - 5) / 2, y + 18, { align: 'center' });
    txt(nombreResp, ML + 5 + (fw - 5) / 2, y + 25, { align: 'center' });
    
    doc.line(ML + 10 + fw, y + 22, ML + 10 + fw * 2 - 5, y + 22);
    txt('JEFE INMEDIATO', ML + 10 + fw + (fw - 5) / 2, y + 18, { align: 'center' });
    txt('________________', ML + 10 + fw + (fw - 5) / 2, y + 25, { align: 'center' });
    
    doc.line(ML + 15 + fw * 2, y + 22, ML + 15 + fw * 3 - 10, y + 22);
    txt('CONTABILIDAD', ML + 15 + fw * 2 + (fw - 5) / 2, y + 18, { align: 'center' });
    txt('________________', ML + 15 + fw * 2 + (fw - 5) / 2, y + 25, { align: 'center' });

    // Pie de página
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      setFC(30, 64, 175);
      doc.rect(0, 287, PW, 10, 'F');
      setF(7, 'normal');
      setC(200, 205, 220);
      txt(`Rendición N° ${rend.U_IdRendicion} | ${nombrePerfil} | Período: ${periodo}`, ML, 292);
      txt(`Página ${i} de ${pages}`, MR, 292, { align: 'right' });
    }

    const blob = doc.output('blob') as Blob;
    const url = URL.createObjectURL(blob);
    return { blob, url };
  }

  descargar(blob: Blob, rend: RendM): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rendicion_${rend.U_IdRendicion}_${(rend.U_NomUsuario || '').replace(/\s+/g, '_')}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}