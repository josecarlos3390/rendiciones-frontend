/**
 * PdfBatchResultsModalComponent Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfBatchResultsModalComponent, BatchStats } from './pdf-batch-results.component';
import { PdfBatchItem } from '../../../services';

describe('PdfBatchResultsModalComponent', () => {
  let component: PdfBatchResultsModalComponent;
  let fixture: ComponentFixture<PdfBatchResultsModalComponent>;

  const mockStats: BatchStats = {
    total: 3,
    completed: 2,
    errors: 1,
    processing: 0,
  };

  const mockResults: PdfBatchItem[] = [
    {
      id: '1',
      file: new File([''], 'test1.pdf'),
      status: 'completed',
      progress: 100,
      result: {
        success: true,
        source: 'siat',
        data: {
          nit: '123456789',
          invoiceNumber: '001',
          companyName: 'Test Company',
          datetime: '2024-01-01',
          total: 1000,
          cuf: 'ABC123',
        },
        confidence: 0.95,
      },
    },
    {
      id: '2',
      file: new File([''], 'test2.pdf'),
      status: 'error',
      progress: 0,
      error: 'Error de procesamiento',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfBatchResultsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfBatchResultsModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Inputs', () => {
    it('should accept isOpen input', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
    });

    it('should accept isProcessing input', () => {
      component.isProcessing = true;
      expect(component.isProcessing).toBe(true);
    });

    it('should accept results input', () => {
      component.results = mockResults;
      expect(component.results).toEqual(mockResults);
    });

    it('should accept stats input', () => {
      component.stats = mockStats;
      expect(component.stats).toEqual(mockStats);
    });
  });

  describe('getItem methods', () => {
    const mockItem = mockResults[0];

    it('should get NIT from item', () => {
      const nit = component.getItemNit(mockItem);
      expect(nit).toBe('123456789');
    });

    it('should get numero factura from item', () => {
      const num = component.getItemNumeroFactura(mockItem);
      expect(num).toBe('001');
    });

    it('should get razon social from item', () => {
      const rs = component.getItemRazonSocial(mockItem);
      expect(rs).toBe('Test Company');
    });

    it('should get fecha from item', () => {
      const fecha = component.getItemFecha(mockItem);
      expect(fecha).toBe('2024-01-01');
    });

    it('should get monto from item', () => {
      const monto = component.getItemMonto(mockItem);
      expect(monto).toBe(1000);
    });

    it('should get CUF from item', () => {
      const cuf = component.getItemCuf(mockItem);
      expect(cuf).toBe('ABC123');
    });
  });

  describe('Event emitters', () => {
    it('should emit confirm event', () => {
      let emitted = false;
      component.confirm.subscribe(() => emitted = true);
      component.onConfirm();
      expect(emitted).toBe(true);
    });

    it('should emit cancel event', () => {
      let emitted = false;
      component.cancel.subscribe(() => emitted = true);
      component.onCancel();
      expect(emitted).toBe(true);
    });

    it('should emit reviewItem event', () => {
      let emitted: { item: PdfBatchItem; index: number } | undefined;
      component.reviewItem.subscribe((e: { item: PdfBatchItem; index: number }) => emitted = e);
      component.onReview(mockResults[0], 0);
      expect(emitted?.item).toBe(mockResults[0]);
      expect(emitted?.index).toBe(0);
    });

    it('should emit retryItem event', () => {
      let emitted: number | undefined;
      component.retryItem.subscribe((idx: number) => emitted = idx);
      component.onRetry(1);
      expect(emitted).toBe(1);
    });

    it('should emit deleteItem event', () => {
      let emitted: number | undefined;
      component.deleteItem.subscribe((idx: number) => emitted = idx);
      component.onDelete(0);
      expect(emitted).toBe(0);
    });
  });
});
