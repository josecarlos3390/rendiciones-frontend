/**
 * QrScannerModalComponent Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrScannerModalComponent } from './qr-scanner.component';

describe('QrScannerModalComponent', () => {
  let component: QrScannerModalComponent;
  let fixture: ComponentFixture<QrScannerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrScannerModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrScannerModalComponent);
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

    it('should accept loading input', () => {
      component.loading = true;
      expect(component.loading).toBe(true);
    });

    it('should accept error input', () => {
      component.error = 'Test error';
      expect(component.error).toBe('Test error');
    });

    it('should accept scanning input', () => {
      component.scanning = true;
      expect(component.scanning).toBe(true);
    });
  });

  describe('Event emitters', () => {
    it('should emit retry event', () => {
      let emitted = false;
      component.error = 'Test error';
      component.retry.subscribe(() => emitted = true);
      component.onRetry();
      expect(emitted).toBe(true);
    });

    it('should emit cancel event', () => {
      let emitted = false;
      component.cancel.subscribe(() => emitted = true);
      component.onCancel();
      expect(emitted).toBe(true);
    });
  });
});
