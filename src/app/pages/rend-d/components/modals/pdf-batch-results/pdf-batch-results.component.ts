/**
 * PdfBatchResultsComponent - Modal de resultados de procesamiento batch de PDFs
 *
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { PdfBatchItem } from '../../../services';

export interface BatchStats {
  total: number;
  completed: number;
  errors: number;
  processing: number;
}

@Component({
  selector: 'app-pdf-batch-results-modal',
  standalone: true,
  imports: [CommonModule, FormModalComponent],
  templateUrl: './pdf-batch-results.component.html',
  styleUrls: ['./pdf-batch-results.component.scss'],
})
export class PdfBatchResultsModalComponent {
  @Input() isOpen = false;
  @Input() isProcessing = false;
  @Input() results: PdfBatchItem[] = [];
  @Input() stats: BatchStats = { total: 0, completed: 0, errors: 0, processing: 0 };

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() reviewItem = new EventEmitter<{ item: PdfBatchItem; index: number }>();
  @Output() retryItem = new EventEmitter<number>();
  @Output() deleteItem = new EventEmitter<number>();

  getItemNit(item: PdfBatchItem): string | undefined {
    const data = item.result?.data as any;
    return data?.nit || data?.nitEmisor;
  }

  getItemNumeroFactura(item: PdfBatchItem): string | undefined {
    const data = item.result?.data as any;
    return data?.invoiceNumber || data?.numeroFactura;
  }

  getItemRazonSocial(item: PdfBatchItem): string | undefined {
    const data = item.result?.data as any;
    return data?.companyName || data?.razonSocialEmisor;
  }

  getItemFecha(item: PdfBatchItem): string | undefined {
    const data = item.result?.data as any;
    return data?.datetime || data?.fechaEmision;
  }

  getItemMonto(item: PdfBatchItem): number | undefined {
    const data = item.result?.data as any;
    return data?.total || data?.montoTotal;
  }

  getItemCuf(item: PdfBatchItem): string | undefined {
    const data = item.result?.data as any;
    return data?.cuf;
  }

  onReview(item: PdfBatchItem, index: number): void {
    this.reviewItem.emit({ item, index });
  }

  onRetry(index: number): void {
    this.retryItem.emit(index);
  }

  onDelete(index: number): void {
    this.deleteItem.emit(index);
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
