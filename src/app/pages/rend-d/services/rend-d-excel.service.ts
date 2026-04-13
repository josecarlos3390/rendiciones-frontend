/**
 * RendD Excel Service
 * 
 * Servicio especializado para importación y exportación de documentos
 * desde/hacia archivos Excel en el módulo de Rendiciones Detalle.
 */

import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { RendD, CreateRendDPayload } from '../../../models/rend-d.model';
import { Documento } from '../../../models/documento.model';

export interface ExcelExportRow {
  'N°': number;
  'Fecha': string;
  'Tipo Doc': string;
  'N° Documento': string;
  'NIT': string;
  'Proveedor': string;
  'Concepto': string;
  'Cuenta': string;
  'Nombre Cuenta': string;
  'Importe': number;
  'Exento': number;
  'ICE': number;
  'Tasas': number;
  'Tasa Cero': number;
  'Gift Card': number;
  'Imp/Ret': number;
  'Total': number;
  'CUF': string;
}

export interface ExcelImportRow {
  'Fecha': string | Date;
  'Tipo Doc'?: string;
  'N° Documento'?: string;
  'NIT'?: string;
  'Proveedor'?: string;
  'Concepto'?: string;
  'Cuenta'?: string;
  'Importe': number;
  'Exento'?: number;
  'ICE'?: number;
  'Tasas'?: number;
  'Tasa Cero'?: number;
  'Gift Card'?: number;
  'CUF'?: string;
}

export interface ImportResult {
  success: boolean;
  count: number;
  error?: string;
  rows: CreateRendDPayload[];
}

@Injectable({ providedIn: 'root' })
export class RendDExcelService {

  /**
   * Exporta documentos a archivo Excel
   */
  exportarDocumentos(
    documentos: RendD[],
    getTipoDocName: (id: string) => string | undefined,
    idRendicion: number
  ): { blob: Blob; filename: string } {
    const rows: ExcelExportRow[] = documentos.map(d => ({
      'N°': d.U_RD_IdRD,
      'Fecha': d.U_RD_Fecha ?? '',
      'Tipo Doc': getTipoDocName(d.U_RD_TipoDoc) ?? '',
      'N° Documento': d.U_RD_NumDocumento ?? '',
      'NIT': d.U_RD_NIT ?? '',
      'Proveedor': d.U_RD_Prov ?? '',
      'Concepto': d.U_RD_Concepto ?? '',
      'Cuenta': d.U_RD_Cuenta ?? '',
      'Nombre Cuenta': d.U_RD_NombreCuenta ?? '',
      'Importe': d.U_RD_Importe ?? 0,
      'Exento': d.U_RD_Exento ?? 0,
      'ICE': d.U_ICE ?? 0,
      'Tasas': d.U_TASA ?? 0,
      'Tasa Cero': d.U_RD_TasaCero ?? 0,
      'Gift Card': d.U_GIFTCARD ?? 0,
      'Imp/Ret': d.U_RD_ImpRet ?? 0,
      'Total': d.U_RD_Total ?? 0,
      'CUF': d.U_CUF ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Ancho de columnas optimizado
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
      { wch: 28 }, { wch: 35 }, { wch: 14 }, { wch: 28 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 32 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Documentos');

    // Generar blob en lugar de descargar directamente
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const filename = `Rendicion_${idRendicion}_Documentos.xlsx`;

    return { blob, filename };
  }

  /**
   * Descarga el formato de importación vacío
   */
  descargarFormato(): { blob: Blob; filename: string } {
    const ejemplo: ExcelImportRow[] = [{
      'Fecha': '2026-03-23',
      'Tipo Doc': 'FACTURA',
      'N° Documento': '1234',
      'NIT': '1234567890',
      'Proveedor': 'Empresa S.R.L.',
      'Concepto': 'Descripción del gasto',
      'Cuenta': '51105001',
      'Importe': 100.00,
      'Exento': 0,
      'ICE': 0,
      'Tasas': 0,
      'Tasa Cero': 0,
      'Gift Card': 0,
      'CUF': '',
    }];

    const ws = XLSX.utils.json_to_sheet(ejemplo);
    ws['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 28 },
      { wch: 35 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 32 },
    ];

    // Fila de instrucciones
    XLSX.utils.sheet_add_aoa(ws, [
      ['INSTRUCCIONES: Complete los campos y elimine esta fila antes de importar.'],
    ], { origin: 'A3' });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Importar');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    return { blob, filename: 'Formato_Importacion_Documentos.xlsx' };
  }

  /**
   * Parsea un archivo Excel y retorna las filas válidas
   */
  async parsearArchivo(file: File): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

          if (!rows.length) {
            resolve({ success: false, count: 0, error: 'El archivo está vacío', rows: [] });
            return;
          }

          // Filtrar filas de instrucciones y vacías
          const datos = rows.filter(r =>
            r['Fecha'] && 
            r['Importe'] !== '' && 
            !String(r['Fecha']).startsWith('INSTRUCCIONES')
          );

          if (!datos.length) {
            resolve({ 
              success: false, 
              count: 0, 
              error: 'No se encontraron filas válidas', 
              rows: [] 
            });
            return;
          }

          const payloads = datos.map(r => this.rowToPayload(r));
          resolve({ success: true, count: payloads.length, rows: payloads });

        } catch (err: any) {
          resolve({ 
            success: false, 
            count: 0, 
            error: `Error al leer: ${err?.message ?? 'formato inválido'}`, 
            rows: [] 
          });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, count: 0, error: 'Error al leer el archivo', rows: [] });
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convierte una fila del Excel a payload de creación
   */
  private rowToPayload(row: any, tipoDocDefault?: any): CreateRendDPayload {
    const fecha = row['Fecha'] instanceof Date
      ? row['Fecha'].toISOString().substring(0, 10)
      : String(row['Fecha'] ?? '').substring(0, 10);

    return {
      fecha,
      tipoDoc: Number(tipoDocDefault?.U_IdDocumento ?? row['Tipo Doc'] ?? 0),
      tipoDocName: tipoDocDefault?.U_TipDoc ?? row['Tipo Doc'] ?? '',
      idTipoDoc: tipoDocDefault?.U_IdTipoDoc ?? 1,
      numDocumento: String(row['N° Documento'] ?? ''),
      nit: String(row['NIT'] ?? ''),
      prov: row['Proveedor'] || '',
      concepto: row['Concepto'] || '',
      cuenta: String(row['Cuenta'] ?? ''),
      nombreCuenta: '',
      importe: Number(row['Importe']) || 0,
      descuento: 0,
      exento: Number(row['Exento']) || 0,
      ice: Number(row['ICE']) || 0,
      tasa: Number(row['Tasas']) || 0,
      tasaCero: Number(row['Tasa Cero']) || 0,
      giftCard: Number(row['Gift Card']) || 0,
      cuf: String(row['CUF'] ?? ''),
      // Impuestos calculados por backend
      montoIVA: 0, montoIT: 0, montoIUE: 0, montoRCIVA: 0, impRet: 0, total: 0,
      // Campos adicionales requeridos
      ctaExento: '',
      importeBs: 0, exentoBs: 0, desctoBs: 0,
    };
  }

  /**
   * Descarga un blob como archivo
   */
  descargarArchivo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
