/**
 * RendD Scan Service
 * 
 * Servicio especializado para procesamiento de facturas desde:
 * - Archivos PDF (con extracción de QR)
 * - URLs del SIAT
 * - Escaneo de QR
 * - Procesamiento batch de múltiples PDFs
 */

import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import QrScanner from 'qr-scanner';
import { FacturaService, FacturaSiat, FacturaResult } from '../../../services/factura.service';
import { Documento } from '../../../models/documento.model';
import { CreateRendDPayload } from '../../../models/rend-d.model';

export type PdfBatchStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface PdfBatchItem {
  id: string;
  file: File;
  status: PdfBatchStatus;
  progress: number;
  result?: FacturaResult;
  error?: string;
  qrUrl?: string;
  cuf?: string;
}

export interface BatchStats {
  total: number;
  completed: number;
  errors: number;
  processing: number;
  pending: number;
}

export interface ScanResult {
  success: boolean;
  factura?: FacturaSiat;
  error?: string;
  source: 'siat' | 'ai' | 'manual';
}

@Injectable({ providedIn: 'root' })
export class RendDScanService {
  
  private pdfjsLib: any = null;

  constructor(private facturaSvc: FacturaService) {}

  // ═══════════════════════════════════════════════════════════════════
  // PROCESAMIENTO DE URL SIAT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Procesa una URL del SIAT y retorna la factura
   */
  procesarUrlSiat(url: string): Observable<ScanResult> {
    return this.facturaSvc.getFromSiat(url).pipe(
      map((factura: FacturaSiat) => ({
        success: true,
        factura,
        source: 'siat' as const
      })),
      catchError((err) => of({
        success: false,
        error: err?.error?.message ?? 'No se pudo obtener la factura del SIAT',
        source: 'siat' as const
      }))
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROCESAMIENTO DE PDFs
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Inicializa el procesamiento batch de PDFs
   */
  inicializarBatch(files: File[]): PdfBatchItem[] {
    return files.map((file, index) => ({
      id: `pdf-${Date.now()}-${index}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));
  }

  /**
   * Procesa un único PDF del batch
   */
  async procesarPdfItem(
    item: PdfBatchItem, 
    updateProgress: (progress: number) => void
  ): Promise<void> {
    try {
      // Cargar pdf.js si es necesario
      const pdfjsLib = await this._loadPdfJs();
      
      item.status = 'processing';
      updateProgress(10);

      // 1. Leer PDF
      const arrayBuffer = await item.file.arrayBuffer();
      updateProgress(30);

      // 2. Renderizar primera página
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      updateProgress(50);

      // 3. Escanear QR
      let qrUrl: string | undefined;
      let cuf: string | undefined;
      try {
        const result = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
        qrUrl = result?.data;
        if (qrUrl) {
          cuf = this._extractCufFromQrUrl(qrUrl);
        }
      } catch {
        // No QR found - continue anyway
      }
      
      item.qrUrl = qrUrl;
      item.cuf = cuf;
      updateProgress(70);

      // 4. Procesar con servicio (SIAT primero, luego IA)
      await this._procesarConServicio(item, updateProgress);

    } catch (err: any) {
      item.status = 'error';
      item.error = err?.message ?? 'Error al procesar el PDF';
      item.progress = 100;
    }
  }

  /**
   * Reprocesa un item del batch
   */
  async reprocesarItem(item: PdfBatchItem): Promise<void> {
    item.status = 'processing';
    item.progress = 50;
    item.error = undefined;

    return new Promise((resolve) => {
      this.facturaSvc.processFacturaPdf(item.file, item.qrUrl, item.cuf).subscribe({
        next: (result) => {
          item.status = result.success ? 'completed' : 'error';
          item.result = result;
          item.error = result.error;
          if (item.cuf && result.success && result.data) {
            (result.data as any).cuf = item.cuf;
          }
          item.progress = 100;
          resolve();
        },
        error: (err) => {
          item.status = 'error';
          item.error = err?.message ?? 'Error al reprocesar';
          item.progress = 100;
          resolve();
        }
      });
    });
  }

  private _procesarConServicio(
    item: PdfBatchItem, 
    updateProgress: (p: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      this.facturaSvc.processFacturaPdf(item.file, item.qrUrl, item.cuf).subscribe({
        next: (result) => {
          item.status = result.success ? 'completed' : 'error';
          item.result = result;
          item.error = result.error;
          if (item.cuf && result.success && result.data) {
            (result.data as any).cuf = item.cuf;
          }
          item.progress = 100;
          updateProgress(100);
          resolve();
        },
        error: (err) => {
          item.status = 'error';
          item.error = err?.message ?? 'Error al procesar';
          item.progress = 100;
          updateProgress(100);
          resolve();
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS PARA TEMPLATES
  // ═══════════════════════════════════════════════════════════════════

  getItemNit(item: PdfBatchItem): string {
    return (item.result?.data as any)?.nit || '—';
  }

  getItemRazonSocial(item: PdfBatchItem): string {
    const data = item.result?.data as any;
    return data?.razonSocial || data?.companyName || '—';
  }

  getItemNumeroFactura(item: PdfBatchItem): string {
    const data = item.result?.data as any;
    return data?.numeroFactura || data?.invoiceNumber || '—';
  }

  getItemFecha(item: PdfBatchItem): string {
    const data = item.result?.data as any;
    return data?.fecha || data?.datetime || '';
  }

  getItemMonto(item: PdfBatchItem): number {
    const data = item.result?.data as any;
    return data?.monto || data?.total || 0;
  }

  getItemCuf(item: PdfBatchItem): string {
    return item.cuf || (item.result?.data as any)?.cuf || '';
  }

  calcularBatchStats(items: PdfBatchItem[]): BatchStats {
    return {
      total: items.length,
      completed: items.filter(i => i.status === 'completed').length,
      errors: items.filter(i => i.status === 'error').length,
      processing: items.filter(i => i.status === 'processing').length,
      pending: items.filter(i => i.status === 'pending').length
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CREACIÓN DE DOCUMENTOS DESDE FACTURAS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Crea un payload para documento desde datos de factura
   */
  crearPayloadDesdeFactura(
    factura: FacturaSiat,
    config: Documento | null,
    auth: { fijarNr: boolean; nr1: string; nr2: string; nr3: string }
  ): CreateRendDPayload | null {
    
    if (!config) return null;

    const fecha = factura.datetime 
      ? factura.datetime.substring(0, 10) 
      : new Date().toISOString().substring(0, 10);

    const importe = factura.total || 0;
    const idTipoDoc = Number(config.U_IdTipoDoc ?? 1);
    const esRecibo = idTipoDoc === 4 || idTipoDoc === 10;
    const tipoCalc = String(config.U_TipoCalc ?? '1');

    // Calcular impuestos
    let montoIVA = 0, montoIT = 0, montoIUE = 0, montoRCIVA = 0;

    if (idTipoDoc === 1) {
      // Factura normal
      montoIVA = this._calcImpuestoSimple(importe, config.U_IVApercent);
      montoIT = this._calcImpuestoSimple(importe, config.U_ITpercent);
      montoIUE = this._calcImpuestoSimple(importe, config.U_IUEpercent);
      montoRCIVA = this._calcImpuestoSimple(importe, config.U_RCIVApercent);
    } else if (esRecibo) {
      if (tipoCalc === '1') {
        // Grossing Down
        montoIT = this._calcImpuestoSimple(importe, config.U_ITpercent);
        montoRCIVA = this._calcImpuestoSimple(importe, config.U_RCIVApercent);
        montoIVA = this._calcImpuestoSimple(importe, config.U_IVApercent);
        montoIUE = this._calcImpuestoSimple(importe, config.U_IUEpercent);
      } else {
        // Grossing Up
        const tasaIUE = (Number(config.U_IUEpercent) || 0) / 100;
        const tasaIT = (Number(config.U_ITpercent) || 0) / 100;
        const tasaRCIVA = (Number(config.U_RCIVApercent) || 0) / 100;
        const tasaIVA = (Number(config.U_IVApercent) || 0) / 100;
        const sumaTasas = tasaIUE + tasaIT + tasaRCIVA + tasaIVA;
        
        const bruto = sumaTasas > 0 && sumaTasas < 1
          ? Math.round((importe / (1 - sumaTasas)) * 100) / 100
          : importe;
        
        montoIUE = Math.round(bruto * tasaIUE * 100) / 100;
        montoIT = Math.round(bruto * tasaIT * 100) / 100;
        montoRCIVA = Math.round(bruto * tasaRCIVA * 100) / 100;
        montoIVA = Math.round(bruto * tasaIVA * 100) / 100;
      }
    }

    const impRet = Math.round((montoIVA + montoIT + montoIUE + montoRCIVA) * 100) / 100;
    const total = esRecibo && tipoCalc === '0'
      ? Math.round((importe + impRet) * 100) / 100
      : Math.round((importe - impRet) * 100) / 100;

    const conceptoUsuario = (factura as any).concepto?.trim();
    const conceptoFinal = conceptoUsuario 
      ? conceptoUsuario.substring(0, 200)
      : `Compra según factura N° ${factura.invoiceNumber}`.substring(0, 200);

    return {
      cuenta: '',
      nombreCuenta: '',
      concepto: conceptoFinal,
      fecha,
      idTipoDoc: config.U_IdTipoDoc ?? 1,
      tipoDoc: Number(config.U_IdDocumento ?? 1),
      tipoDocName: config.U_TipDoc ?? 'FACTURA',
      numDocumento: factura.invoiceNumber || '',
      nit: factura.nit || '0',
      prov: factura.companyName || '',
      codProv: '',
      importe,
      descuento: 0,
      exento: 0,
      tasaCero: 0,
      ice: 0,
      tasa: Number(config.U_TASA) === -1 ? 0 : (Number(config.U_TASA) ?? 0),
      giftCard: 0,
      montoIVA,
      montoIT,
      montoIUE,
      montoRCIVA,
      impRet,
      total,
      cuf: factura.cuf || '',
      nroAutor: '',
      ctrl: '',
      proyecto: '',
      n1: auth.fijarNr ? auth.nr1 : '',
      n2: auth.fijarNr ? auth.nr2 : '',
      n3: auth.fijarNr ? auth.nr3 : '',
      ctaExento: config.U_CTAEXENTO || '',
      importeBs: importe,
      exentoBs: 0,
      desctoBs: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private _calcImpuestoSimple(base: number, pct: number | null | undefined): number {
    if (!pct || pct <= 0) return 0;
    return Math.round(base * (pct / 100) * 100) / 100;
  }

  private _extractCufFromQrUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      const cuf = urlObj.searchParams.get('cuf');
      if (cuf) return cuf;
      
      const match = url.match(/QR\/([A-F0-9]{32,})/i);
      if (match) return match[1];
      
      return undefined;
    } catch {
      return undefined;
    }
  }

  private _loadPdfJs(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.pdfjsLib) {
        this.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(this.pdfjsLib);
        return;
      }

      if ((window as any).pdfjsLib) {
        this.pdfjsLib = (window as any).pdfjsLib;
        this.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(this.pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        this.pdfjsLib = (window as any).pdfjsLib;
        if (!this.pdfjsLib) { 
          reject(new Error('pdfjsLib no disponible')); 
          return; 
        }
        this.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(this.pdfjsLib);
      };
      script.onerror = () => reject(new Error('Error cargando PDF.js'));
      document.head.appendChild(script);
    });
  }
}
