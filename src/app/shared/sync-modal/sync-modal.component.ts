import {
  Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegracionService, SyncResult, SapCredentials } from '@services/integracion.service';
import { NotificacionesService } from '@services/notificaciones.service';
import { ToastService } from '@core/toast/toast.service';

export interface SyncModalConfig {
  idRendicion: number;
  objetivo?: string;
  monto?: number;
  estado?: number;
  isRetry?: boolean;
}

@Component({
  selector: 'app-sync-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sync-modal.component.html',
  styleUrls: ['./sync-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncModalComponent {
  @Input() visible = false;
  @Input() config: SyncModalConfig | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() syncComplete = new EventEmitter<SyncResult>();
  @Output() syncError = new EventEmitter<string>();

  // Form fields
  sapUser = '';
  sapPassword = '';
  showPassword = false;
  loading = false;
  error = '';

  // Result state
  result: {
    show: boolean;
    success: boolean;
    nroDocERP?: string;
    mensaje?: string;
  } | null = null;

  constructor(
    private integracionSvc: IntegracionService,
    private notifSvc: NotificacionesService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isRetry(): boolean {
    return this.config?.estado === 6 || this.config?.isRetry === true;
  }

  get title(): string {
    return this.isRetry ? 'Reintentar Sincronización' : 'Sincronizar con SAP';
  }

  open(config: SyncModalConfig) {
    this.config = config;
    this.sapUser = '';
    this.sapPassword = '';
    this.showPassword = false;
    this.error = '';
    this.result = null;
    this.visible = true;
    this.visibleChange.emit(true);
    this.cdr.markForCheck();
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.config = null;
    this.cdr.markForCheck();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck();
  }

  confirm() {
    if (!this.config || this.loading) return;

    // Validar credenciales
    if (!this.sapUser.trim()) {
      this.error = 'El usuario SAP es obligatorio';
      this.cdr.markForCheck();
      return;
    }
    if (!this.sapPassword.trim()) {
      this.error = 'La contraseña SAP es obligatoria';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = '';
    this.result = null;
    this.cdr.markForCheck();

    const creds: SapCredentials = {
      sapUser: this.sapUser,
      sapPassword: this.sapPassword,
    };

    this.integracionSvc.sincronizar(this.config.idRendicion, creds).subscribe({
      next: (res: SyncResult) => {
        this.loading = false;
        this.result = {
          show: true,
          success: res.success,
          nroDocERP: res.nroDocERP,
          mensaje: res.mensaje,
        };
        
        if (res.success) {
          this.toast.exito(`Rendición N° ${this.config!.idRendicion} sincronizada — Doc. SAP: ${res.nroDocERP ?? '—'}`);
          // Notificar inmediatamente al sidebar para reducir contador de integración
          this.notifSvc.emitirRendicionSincronizada(this.config!.idRendicion);
          // Cerrar modal automáticamente después de 3 segundos si fue exitoso
          setTimeout(() => {
            this.close();
            this.syncComplete.emit(res);
          }, 3000);
        } else {
          this.toast.error(`Error al sincronizar N° ${this.config!.idRendicion}: ${res.mensaje}`);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err?.error?.message ?? 'Error al sincronizar con SAP';
        this.result = {
          show: true,
          success: false,
          mensaje: errorMsg,
        };
        this.error = errorMsg;
        this.syncError.emit(errorMsg);
        this.cdr.markForCheck();
      },
    });
  }

  retry() {
    this.result = null;
    this.error = '';
    this.cdr.markForCheck();
  }
}
