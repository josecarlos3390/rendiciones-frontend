import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CuentasCabeceraService } from './cuentas-cabecera.service';
import { ToastService }           from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { SearchInputComponent } from '@shared/debounce/search-input.component';
import { PerfilSelectComponent }  from '@shared/perfil-select/perfil-select.component';
import { CuentaSearchComponent }  from '@shared/cuenta-search/cuenta-search.component';
import { FormModalComponent }     from '@shared/form-modal/form-modal.component';
import { StatusBadgeComponent }   from '@shared/status-badge/status-badge.component';
import { FormFieldComponent }     from '@shared/form-field/form-field.component';
import { CuentaCabecera }         from '@models/cuenta-cabecera.model';
import { Perfil }                 from '@models/perfil.model';
import { ChartOfAccount }         from '@services/sap.service';
import { AuthService } from '@auth/auth.service';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { ICON_TRASH } from '@common/constants/icons';

@Component({
  standalone: true,
  selector: 'app-cuentas-cabecera',
  imports: [
    CommonModule,
    FormsModule,
    PerfilSelectComponent,
    CuentaSearchComponent,
    SearchInputComponent,
    FormModalComponent,
    StatusBadgeComponent,
    FormFieldComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './cuentas-cabecera.component.html',
  styleUrls: ['./cuentas-cabecera.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasCabeceraComponent extends AbstractCrudListComponent<CuentaCabecera> implements OnInit {
  @ViewChild('asociadaCol', { static: true }) asociadaCol!: TemplateRef<any>;

  store = new CrudListStore<CuentaCabecera>({
    limit: 5,
    searchFields: ['U_CuentaFormatCode', 'U_CuentaNombre', 'U_CuentaSys'],
  });

  tableConfig!: DataTableConfig;

  // ── Cuenta seleccionada en el modal ──────────────────────
  selectedAccount: ChartOfAccount | null = null;

  // ── Perfil seleccionado ───────────────────────────────────
  selectedPerfilId: number | null = null;
  selectedPerfil:   Perfil | null = null;   // asignable desde el template via (perfilObjChange)

  // ── Modal ────────────────────────────────────────────────
  showForm = false;
  isSaving = false;

  constructor(
    public  auth: AuthService,
    private service: CuentasCabeceraService,
    private toast:   ToastService,
    protected override cdr: ChangeDetectorRef,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {
    this.buildTableConfig();
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'U_IdPerfil', header: 'Cod. Perfil', align: 'center', mobile: { hide: true } },
        { key: 'U_CuentaSys', header: 'Código SYS', mobile: { hide: true } },
        { key: 'U_CuentaFormatCode', header: 'Código Cuenta' },
        { key: 'U_CuentaNombre', header: 'Nombre Cuenta', mobile: { primary: true } },
        { key: 'U_CuentaAsociada', header: 'Cuenta Asociada', align: 'center', cellTemplate: this.asociadaCol, mobile: { hide: true } },
      ],
      showActions: true,
      actions: [
        { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'danger' },
      ],
      striped: true,
      hoverable: true,
    };
  }

  onTableAction(event: { action: string; item: CuentaCabecera }): void {
    if (event.action === 'delete') {
      this.confirmRemove(event.item);
    }
  }

  // ── Callbacks de los componentes shared ──────────────────

  /** Recibe el id del perfil desde <app-perfil-select> */
  onPerfilChange(id: number | null) {
    this.selectedPerfilId = id;
    this.loadCuentas();
  }

  /** Recibe la cuenta seleccionada desde <app-cuenta-search> */
  onAccountChange(account: ChartOfAccount | null) {
    this.selectedAccount = account;
    this.cdr.markForCheck();
  }

  // ── Carga de cuentas ─────────────────────────────────────

  loadCuentas(onComplete?: () => void) {
    if (!this.selectedPerfilId) {
      this.store.setItems([]);
      return;
    }
    this.store.load(this.service.getByPerfil(this.selectedPerfilId), () => {
      this.cdr.markForCheck();
      onComplete?.();
    });
  }

  // ── Filtro tabla ─────────────────────────────────────────

  // ── Modal ────────────────────────────────────────────────

  openForm() {
    if (!this.selectedPerfilId) { this.toast.error('Seleccione un perfil primero'); return; }
    this.selectedAccount = null;
    this.showForm        = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm        = false;
    this.selectedAccount = null;
    this.cdr.markForCheck();
  }

  save() {
    if (!this.selectedAccount || this.isSaving || !this.selectedPerfilId) return;
    this.isSaving = true;
    const a = this.selectedAccount;

    this.service.create({
      idPerfil:         this.selectedPerfilId,
      cuentaSys:        a.code,
      cuentaFormatCode: a.formatCode,
      cuentaNombre:     a.name,
      cuentaAsociada:   a.lockManual === 'tYES' ? 'Y' : 'N',
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

  // ── Eliminar ──────────────────────────────────────────────

  confirmRemove(c: CuentaCabecera) {
    this.confirmDialog.ask({
      title:        '¿Eliminar cuenta?',
      message:      `Se eliminará "${c.U_CuentaNombre}" (${c.U_CuentaFormatCode}) del perfil.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.service.remove(c.U_IdPerfil, c.U_CuentaSys).subscribe({
        next:  () => { this.toast.exito('Cuenta eliminada'); this.loadCuentas(); this.cdr.markForCheck(); },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar', this.cdr),
      });
    });
  }
}
