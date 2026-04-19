import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CuentasListaService }   from './cuentas-lista.service';
import { ToastService }          from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { PerfilSelectComponent } from '@shared/perfil-select/perfil-select.component';
import { CuentaSearchComponent } from '@shared/cuenta-search/cuenta-search.component';
import { SearchInputComponent } from '@shared/debounce';
import { CuentaLista }           from '@models/cuenta-lista.model';
import { Perfil }                from '@models/perfil.model';
import { ChartOfAccount }        from '@services/sap.service';
import { AuthService } from '@auth/auth.service';
import { FormModalComponent } from '@shared/form-modal';
import { FormFieldComponent } from '@shared/form-field/form-field.component';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state';
import { ICON_TRASH } from '@common/constants/icons';

@Component({
  standalone: true,
  selector: 'app-cuentas-lista',
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    PerfilSelectComponent,
    CuentaSearchComponent,
    SearchInputComponent,
    FormModalComponent,
    FormFieldComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
  ],
  templateUrl: './cuentas-lista.component.html',
  styleUrls: ['./cuentas-lista.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasListaComponent extends AbstractCrudListComponent<CuentaLista> implements OnInit {

  readonly store = new CrudListStore<CuentaLista>({
    limit: 5,
    searchFields: ['U_Cuenta', 'U_NombreCuenta', 'U_CuentaSys'],
  });

  tableConfig: DataTableConfig = {
    columns: [
      { key: 'U_IdPerfil', header: 'Cod. Perfil', align: 'center' },
      { key: 'U_CuentaSys', header: 'Código SYS', mobile: { hide: true } },
      { key: 'U_Cuenta', header: 'Código Cuenta' },
      { key: 'U_NombreCuenta', header: 'Nombre Cuenta', mobile: { primary: true } },
    ],
    showActions: true,
    actions: [
      { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'text-danger', condition: () => this.auth.puedeEditarConf },
    ],
    striped: true,
    hoverable: true,
  };

  // ── Perfil seleccionado ──────────────────────────────────
  selectedPerfilId: number | null = null;
  selectedPerfil:   Perfil | null = null;

  // ── Formulario agregar ──────────────────────────────────
  showForm      = false;
  isSaving      = false;
  selectedCuenta: ChartOfAccount | null = null;
  cuentaTouched = false;

  get isFormValid(): boolean {
    return !!this.selectedCuenta;
  }

  constructor(
    public  auth: AuthService,
    private cuentasService: CuentasListaService,
    private toast: ToastService,
    protected override cdr:   ChangeDetectorRef,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {}

  // ── Callback de PerfilSelectComponent ───────────────────

  onPerfilChange(id: number | null) {
    this.selectedPerfilId = id;
    this.loadCuentas();
  }

  // ── Carga de datos ───────────────────────────────────────

  loadCuentas(onComplete?: () => void) {
    if (!this.selectedPerfilId) {
      this.store.setItems([]);
      return;
    }
    this.store.load(this.cuentasService.getByPerfil(this.selectedPerfilId), () => {
      this.cdr.markForCheck();
      onComplete?.();
    });
  }

  // ── Agregar cuenta ────────────────────────────────────────

  openForm() {
    if (!this.selectedPerfilId) { this.toast.error('Seleccione un perfil primero'); return; }
    this.selectedCuenta = null;
    this.cuentaTouched  = false;
    this.showForm       = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm       = false;
    this.selectedCuenta = null;
    this.cuentaTouched  = false;
    this.cdr.markForCheck();
  }

  onCuentaSelected(account: ChartOfAccount | null) {
    this.selectedCuenta = account;
    this.cuentaTouched  = true;
  }

  save() {
    this.cuentaTouched = true;
    if (!this.selectedCuenta || this.isSaving || !this.selectedPerfilId) return;

    // Validar que la cuenta no exceda 50 caracteres
    const cuenta = (this.selectedCuenta.formatCode || this.selectedCuenta.code || '').substring(0, 50);
    if (!cuenta) {
      this.toast.error('La cuenta no es válida');
      return;
    }

    this.isSaving = true;
    this.cuentasService.create({
      idPerfil:     this.selectedPerfilId,
      cuentaSys:    this.selectedCuenta.code?.substring(0, 50) || '',
      cuenta:       cuenta,
      nombreCuenta: (this.selectedCuenta.name || '').substring(0, 100),
      relevante:    'N',
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.loadCuentas(() => {
          this.toast.exito('Cuenta agregada');
          this.closeForm();
        });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.errorHandler.handle(err, 'Error al agregar cuenta', this.cdr);
      },
    });
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmRemove(c: CuentaLista) {
    this.confirmDialog.ask({
      title:        '¿Eliminar cuenta?',
      message:      `Se eliminará "${c.U_NombreCuenta}" (${c.U_Cuenta}) del perfil.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.cuentasService.remove(c.U_IdPerfil, c.U_CuentaSys).subscribe({
        next:  () => { this.toast.exito('Cuenta eliminada'); this.loadCuentas(); this.cdr.markForCheck(); },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar', this.cdr),
      });
    });
  }

  // ── Acciones tabla ───────────────────────────────────────

  onTableAction(event: { action: string; item: CuentaLista }): void {
    if (event.action === 'delete') {
      this.confirmRemove(event.item);
    }
  }
}
