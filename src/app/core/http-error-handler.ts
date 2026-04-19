import { Injectable, ChangeDetectorRef } from '@angular/core';
import { ToastService } from './toast/toast.service';

@Injectable({ providedIn: 'root' })
export class HttpErrorHandler {
  constructor(private readonly toast: ToastService) {}

  handle(error: unknown, defaultMessage: string, cdr?: ChangeDetectorRef): void {
    const msg = (error && typeof error === 'object' && (error as Record<string, unknown>)['error']
      ? ((error as Record<string, unknown>)['error'] as Record<string, unknown>)?.['message']
      : undefined) || defaultMessage;
    this.toast.error(String(msg));
    cdr?.markForCheck();
  }
}
