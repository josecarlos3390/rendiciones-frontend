import { Injectable } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import {
  AiService,
  ClasificacionSugeridaResponse,
} from './ai.service';
import { Documento } from '@models/documento.model';
import { NormaSlotConfig } from '../pages/rend-d/components/doc-form/doc-form.model';

export interface SugerenciaPendiente {
  cuenta?: { codigo: string; nombre: string };
  tipoDoc?: { id: string; nombre: string };
  dimensiones: string[];
  confianza: number;
}

export interface PatchSugerenciaIA {
  cuenta?: string;
  nombreCuenta?: string;
  tipoDoc?: string;
  tipoDocName?: string;
  n1?: string;
  proyecto?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AiDocumentoService {
  loading = false;
  habilitada = false;
  sugerencia: ClasificacionSugeridaResponse | null = null;
  mensaje = '';
  sugerenciaPendiente: SugerenciaPendiente | null = null;

  private destroy$ = new Subject<void>();

  constructor(private aiService: AiService) {
    this.habilitada = this.aiService.estaHabilitada;
  }

  /** Inicializa suscripciones al estado de IA. Llamar desde el componente en ngOnInit. */
  init(onChange?: () => void): void {
    this.aiService.aiStatus$.pipe(takeUntil(this.destroy$)).subscribe((status) => {
      const nuevo = status?.ia?.enabled === true && status?.ia?.configured === true;
      if (this.habilitada !== nuevo) {
        this.habilitada = nuevo;
        onChange?.();
      }
    });

    if (!this.aiService.status) {
      this.aiService.cargarStatus().subscribe();
    }
  }

  dispose(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  puedeSolicitar(concepto: string): boolean {
    return this.habilitada && (concepto || '').trim().length >= 5 && !this.sugerenciaPendiente;
  }

  solicitarSugerencia(
    concepto: string,
    importe: number,
    proveedor: string,
    tiposDocs: Documento[],
    onChange?: () => void,
  ): void {
    const texto = (concepto || '').trim();
    if (texto.length < 5) return;

    this.loading = true;
    onChange?.();

    this.aiService
      .sugerirClasificacion({ concepto: texto, monto: importe, proveedor })
      .subscribe({
        next: (resp) => {
          this.loading = false;
          this.sugerencia = resp;
          if (resp) {
            this._prepararSugerencia(resp, texto, tiposDocs);
          }
          onChange?.();
        },
        error: () => {
          this.loading = false;
          onChange?.();
        },
      });
  }

  aceptarSugerencia(normaSlots: NormaSlotConfig[]): PatchSugerenciaIA | null {
    if (!this.sugerenciaPendiente) return null;

    const patch: PatchSugerenciaIA = {};

    if (this.sugerenciaPendiente.cuenta) {
      patch.cuenta = this.sugerenciaPendiente.cuenta.codigo;
      patch.nombreCuenta = this.sugerenciaPendiente.cuenta.nombre;
    }

    if (this.sugerenciaPendiente.tipoDoc) {
      patch.tipoDoc = this.sugerenciaPendiente.tipoDoc.id;
      patch.tipoDocName = this.sugerenciaPendiente.tipoDoc.nombre;
    }

    if (this.sugerencia?.dimension1) {
      patch.n1 = this.sugerencia.dimension1.codigo;
    }

    if (this.sugerencia?.norma) {
      const slot = normaSlots.find(
        (s) =>
          s.dimensionName?.toLowerCase().includes('norma') ||
          s.label.toLowerCase().includes('norma'),
      );
      if (slot) {
        patch['n' + slot.slot] = String(this.sugerencia.norma.idNorma);
      }
    }

    if (this.sugerencia?.proyecto) {
      patch.proyecto = this.sugerencia.proyecto.codigo;
    }

    const { cuenta, tipoDoc } = this.sugerenciaPendiente;
    let msg = '✓ Aplicado:';
    if (cuenta) msg += ` ${cuenta.nombre} (${cuenta.codigo})`;
    if (tipoDoc) msg += ` • ${tipoDoc.nombre}`;
    this.mensaje = msg;

    this.sugerenciaPendiente = null;
    return patch;
  }

  rechazarSugerencia(): void {
    this.sugerenciaPendiente = null;
    this.sugerencia = null;
    this.mensaje = '';
  }

  limpiarMensajeYSugerencia(): void {
    this.sugerencia = null;
    this.mensaje = '';
  }

  private _prepararSugerencia(sugerencia: ClasificacionSugeridaResponse, concepto: string, tiposDocs: Documento[]): void {
    const dimensiones: string[] = [];
    if (sugerencia.proyecto) dimensiones.push('Proyecto');
    if (sugerencia.dimension1) dimensiones.push('N1');
    if (sugerencia.norma) dimensiones.push('Norma');

    const tipoDoc = this._sugerirTipoDocumentoPorConcepto(concepto, tiposDocs);

    this.sugerenciaPendiente = {
      cuenta: sugerencia.cuentaContable
        ? {
            codigo: sugerencia.cuentaContable.codigo,
            nombre: sugerencia.cuentaContable.nombre,
          }
        : undefined,
      tipoDoc: tipoDoc || undefined,
      dimensiones,
      confianza: Math.round(sugerencia.cuentaContable.confianza * 100),
    };

    this.mensaje = '';
  }

  private _sugerirTipoDocumentoPorConcepto(
    concepto: string,
    tiposDocs: Documento[],
  ): { id: string; nombre: string } | null {
    if (!concepto || tiposDocs.length === 0) {
      const defaultDoc = tiposDocs[0];
      return defaultDoc
        ? { id: String(defaultDoc.U_IdDocumento), nombre: defaultDoc.U_TipDoc || 'Documento' }
        : null;
    }

    const conceptoLower = concepto.toLowerCase();
    const keywordMap: Record<string, string[]> = {
      factura: ['factura', 'fact'],
      recibo: ['recibo', 'rec'],
      boleta: ['boleta', 'boleta de venta'],
      ticket: ['ticket', 'tiket', 'tkt'],
      nota: ['nota de credito', 'nota de debito', 'nota de crédito', 'nota de débito', 'nc', 'nd'],
      comprobante: ['comprobante', 'comp'],
      declaracion: ['declaracion', 'declaración', 'dj'],
      formulario: ['formulario', 'form'],
      invoice: ['invoice', 'invoce'],
      orden: ['orden de compra', 'oc', 'orden'],
      contrato: ['contrato'],
      memorandum: ['memorandum', 'memo'],
      acta: ['acta'],
      resolucion: ['resolucion', 'resolución'],
    };

    for (const [tipoBase, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (conceptoLower.includes(keyword)) {
          const tipoDoc = tiposDocs.find((d) => d.U_TipDoc?.toLowerCase().includes(tipoBase));
          if (tipoDoc) {
            return {
              id: String(tipoDoc.U_IdDocumento),
              nombre: tipoDoc.U_TipDoc || 'Documento',
            };
          }
        }
      }
    }

    const defaultDoc = tiposDocs[0];
    return defaultDoc
      ? { id: String(defaultDoc.U_IdDocumento), nombre: defaultDoc.U_TipDoc || 'Documento' }
      : null;
  }
}
