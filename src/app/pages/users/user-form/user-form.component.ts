import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioSearchComponent, UsuarioItem } from '../../../shared/usuario-search/usuario-search.component';
import { AppSelectComponent, SelectOption } from '../../../shared/app-select/app-select.component';
import { User } from '../../../models/user.model';
import { DimensionWithRules } from '../../../services/sap.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UsuarioSearchComponent, AppSelectComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
<div class="modal-backdrop" *ngIf="visible">
  <div class="user-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

    <div class="modal-header">
      <h3>
        {{ user ? 'Editar — ' + user.U_Login : 'Nuevo Usuario' }}
        <span class="dirty-badge" *ngIf="user && isDirty">● cambios sin guardar</span>
      </h3>
      <button class="modal-close" type="button" (click)="onCancel()">✕</button>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSave()" novalidate class="modal-2col-layout">

      <!-- ══ Columna izquierda: datos ══ -->
      <div class="modal-body modal-col">

        <div class="form-section-label">Datos del usuario</div>

        <div class="form-field" *ngIf="!user">
          <label>Usuario <span class="required">*</span><span class="label-muted"> (máx. 10)</span></label>
          <input type="text" formControlName="login" placeholder="JPEREZ" maxlength="10" autocomplete="off" (input)="onLoginInput($event)" />
          <span class="field-error" *ngIf="form.get('login')?.invalid && form.get('login')?.touched">
            Obligatorio, máx. 10 caracteres
          </span>
        </div>

        <div class="form-field" *ngIf="user">
          <label>Usuario</label>
          <input type="text" [value]="user.U_Login" disabled />
        </div>

        <div class="form-field" [class.field-changed]="fieldChanged('name')">
          <label>Nombre y Apellido <span class="required">*</span></label>
          <input type="text" formControlName="name" placeholder="Juan Pérez" autocomplete="off" />
          <span class="field-error" *ngIf="form.get('name')?.invalid && form.get('name')?.touched">Obligatorio</span>
        </div>

        <div class="form-field" [class.field-changed]="fieldChanged('supervisorName')">
          <label>Aprobador <span class="label-muted">(U_NomSup — opcional)</span></label>
          <app-usuario-search
            [initialLogin]="form.get('supervisorName')?.value"
            [excludeLogin]="user?.U_Login ?? null"
            [allowClear]="true"
            placeholderText="— Sin aprobador (nivel final) —"
            (usuarioChange)="onAprobadorSelected($event)">
          </app-usuario-search>
          <span class="field-hint">El usuario seleccionado deberá aprobar las rendiciones de este usuario</span>
        </div>

        <div class="form-row">
          <div class="form-field" [class.field-changed]="fieldChanged('superUser')">
            <label>Tipo de Usuario <span class="required">*</span></label>
            <app-select
              label="Tipo de Usuario"
              [required]="true"
              [searchable]="false"
              [options]="userTypeOptions"
              [value]="form.get('superUser')?.value"
              (valueChange)="form.get('superUser')?.setValue($event)">
            </app-select>
          </div>
          <div class="form-field" [class.field-changed]="fieldChanged('fechaExpiracion')">
            <label>Fecha Expiración <span class="required">*</span></label>
            <input type="date" formControlName="fechaExpiracion" />
          </div>
        </div>

        <div class="form-field" *ngIf="!user">
          <label>Contraseña <span class="required">*</span></label>
          <input type="password" formControlName="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
          <span class="field-error" *ngIf="form.get('password')?.invalid && form.get('password')?.touched">Mínimo 6 caracteres</span>
        </div>
        <div class="form-field" *ngIf="user">
          <label>Nueva contraseña <span class="label-muted">(vacío = no cambiar)</span></label>
          <input type="password" formControlName="password" placeholder="••••••••" autocomplete="new-password" />
        </div>

        <div class="form-section-label">Normas de Reparto</div>

        <div class="toggle-field" [class.field-changed]="fieldChanged('fijarNr')">
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-title">Fijar Norma Reparto</span>
            </div>
            <div class="toggle-wrap">
              <label class="u-toggle">
                <input type="checkbox"
                  [checked]="form.get('fijarNr')?.value == '1'"
                  (change)="onCheckToggle('fijarNr', $event)" />
                <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-row">
          <ng-container *ngFor="let nr of [1,2,3,4,5]">
            <ng-container *ngIf="getDimension(nr) as dim; else nrText">
              <div class="form-field" [class.field-changed]="fieldChanged('nr'+nr)">
                <label>{{ dim.dimensionDescription || dim.dimensionName }}</label>
                <app-select
                  [label]="dim.dimensionDescription || dim.dimensionName"
                  [options]="dimOptionsMap[nr] ?? []"
                  [value]="form.get('nr'+nr)?.value"
                  (valueChange)="form.get('nr'+nr)?.setValue($event)">
                </app-select>
              </div>
            </ng-container>
            <ng-template #nrText>
              <div class="form-field" [class.field-changed]="fieldChanged('nr'+nr)" *ngIf="!loadingDims">
                <label>NR {{ nr }}</label>
                <input type="text" [formControlName]="'nr'+nr" maxlength="50" />
              </div>
            </ng-template>
          </ng-container>

          <div *ngIf="loadingDims" class="dim-loading">
            <span>Cargando normas de reparto...</span>
          </div>
        </div>

      </div><!-- /col izquierda -->

      <!-- ══ Columna derecha: permisos ══ -->
      <div class="modal-body modal-col">

        <div class="form-section-label">Módulos y permisos</div>

        <div class="perms-card">
          <div class="perm-row" [class.perm-row--changed]="fieldChanged('appRend')">
            <div class="perm-info">
              <span class="perm-name">Rendiciones</span>
              <span class="perm-desc">Acceso al módulo de rendiciones de gastos</span>
            </div>
            <label class="u-toggle">
              <input type="checkbox" [checked]="form.get('appRend')?.value == '1'" (change)="onCheckToggle('appRend', $event)" />
              <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
            </label>
          </div>

          <div class="perm-row" [class.perm-row--changed]="fieldChanged('appConf')">
            <div class="perm-info">
              <span class="perm-name">Configuraciones</span>
              <span class="perm-desc">Ver y editar configuraciones del sistema</span>
            </div>
            <label class="u-toggle">
              <input type="checkbox" [checked]="form.get('appConf')?.value == '1'" (change)="onCheckToggle('appConf', $event)" />
              <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
            </label>
          </div>

          <div class="perm-row" [class.perm-row--changed]="fieldChanged('genDocPre')">
            <div class="perm-info">
              <span class="perm-name">Genera Preliminar</span>
              <span class="perm-desc">Permite generar documentos en estado borrador</span>
            </div>
            <label class="u-toggle">
              <input type="checkbox" [checked]="form.get('genDocPre')?.value == '1'" (change)="onCheckToggle('genDocPre', $event)" />
              <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
            </label>
          </div>

          <div class="perm-row" [class.perm-row--changed]="fieldChanged('fijarSaldo')">
            <div class="perm-info">
              <span class="perm-name">Fijar Saldo</span>
              <span class="perm-desc">Permite fijar manualmente el saldo en rendiciones</span>
            </div>
            <label class="u-toggle">
              <input type="checkbox" [checked]="form.get('fijarSaldo')?.value == '1'" (change)="onCheckToggle('fijarSaldo', $event)" />
              <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
            </label>
          </div>
        </div>

        <ng-container *ngIf="user">
          <div class="form-section-label">Estado de la cuenta</div>
          <div class="perms-card">
            <div class="perm-row" [class.perm-row--changed]="fieldChanged('estado')">
              <div class="perm-info">
                <span class="perm-name">Estado</span>
                <span class="perm-desc">
                  {{ form.get('estado')?.value === '1' ? 'El usuario puede iniciar sesión normalmente' : form.get('estado')?.value === '2' ? 'Cuenta bloqueada por intentos fallidos u otra razón' : 'El usuario no puede iniciar sesión' }}
                </span>
              </div>
              <app-select
                label="Estado"
                [searchable]="false"
                [options]="estadoOptions"
                [value]="form.get('estado')?.value"
                (valueChange)="form.get('estado')?.setValue($event)">
              </app-select>
            </div>
          </div>
        </ng-container>

      </div><!-- /col derecha -->

      <!-- Footer -->
      <div class="modal-footer modal-2col-footer">
        <ng-container *ngIf="isDirty; else noChanges">
          <button type="button" class="btn btn-ghost" (click)="onCancel()">Cancelar</button>
          <button type="submit"
            [class]="user ? 'btn btn-save-changes' : 'btn btn-primary'"
            [disabled]="form.invalid || isSaving">
            <span *ngIf="isSaving">Guardando...</span>
            <span *ngIf="!isSaving">{{ user ? '💾 Guardar cambios' : 'Crear Usuario' }}</span>
          </button>
        </ng-container>
        <ng-template #noChanges>
          <button type="button" class="btn btn-ghost" (click)="onCancel()">Cerrar</button>
        </ng-template>
      </div>

    </form>
  </div>
</div>
  `,
})
export class UserFormComponent implements OnChanges {
  @Input() visible   = false;
  @Input() user:      User | null = null;
  @Input() dimensions: DimensionWithRules[] = [];
  @Input() loadingDims = false;
  @Input() isSaving    = false;

  @Output() saved     = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  dimOptionsMap: Partial<Record<number, SelectOption[]>> = {};
  private initialValues: any = null;

  readonly userTypeOptions: SelectOption[] = [
    { value: 0, label: 'Normal',        icon: '👤' },
    { value: 1, label: 'Administrador', icon: '👑' },
  ];

  readonly estadoOptions: SelectOption[] = [
    { value: '1', label: 'Activo',    icon: '✅' },
    { value: '0', label: 'Inactivo',  icon: '⛔' },
    { value: '2', label: 'Bloqueado', icon: '🔒' },
  ];

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dimensions']) {
      this.rebuildDimOptions();
    }
    if (changes['visible'] && this.visible) {
      if (this.user) {
        this.loadEditMode(this.user);
      } else {
        this.loadNewMode();
      }
    }
  }

  private buildForm() {
    this.form = this.fb.group({
      login:          ['', [Validators.required, Validators.maxLength(10)]],
      name:           ['', Validators.required],
      supervisorName: [''],
      password:       [''],
      superUser:      [0],
      appRend:        ['1'],
      appConf:        ['0'],
      genDocPre:      ['0'],
      fijarNr:        ['0'],
      nr1:            [''],
      nr2:            [''],
      nr3:            [''],
      nr4:            [''],
      nr5:            [''],
      fijarSaldo:     ['0'],
      estado:         ['1'],
      fechaExpiracion:[''],
    });
  }

  private loadNewMode() {
    this.initialValues = null;
    this.form.get('login')?.enable();
    this.form.reset({
      login: '', name: '', supervisorName: '', password: '',
      superUser: 0, appRend: '1', appConf: '0',
      genDocPre: '0',
      fijarNr: '0', nr1: '', nr2: '', nr3: '', nr4: '', nr5: '',
      fijarSaldo: '0', estado: '1',
      fechaExpiracion: this.defaultExpiry(),
    });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
  }

  private loadEditMode(user: User) {
    this.form.get('login')?.enable();
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.form.reset({
      login:          user.U_Login           ?? '',
      name:           user.U_NomUser         ?? '',
      supervisorName: user.U_NomSup          ?? '',
      password:       '',
      superUser:      user.U_SuperUser       ?? 0,
      appRend:        user.U_AppRend   == '1' ? '1' : '0',
      appConf:        user.U_AppConf   == '1' ? '1' : '0',
      genDocPre:      user.U_GenDocPre == '1' ? '1' : '0',
      fijarNr:        user.U_FIJARNR   == '1' ? '1' : '0',
      nr1:            user.U_NR1             ?? '',
      nr2:            user.U_NR2             ?? '',
      nr3:            user.U_NR3             ?? '',
      nr4:            user.U_NR4             ?? '',
      nr5:            user.U_NR5             ?? '',
      fijarSaldo:     user.U_FIJARSALDO == '1' ? '1' : '0',
      estado:         user.U_Estado ?? '1',
      fechaExpiracion: user.U_FECHAEXPIRACION
        ? String(user.U_FECHAEXPIRACION).substring(0, 10) : '',
    });
    this.form.get('login')?.disable();
    this.initialValues = this.form.getRawValue();
    this.initialValues['password'] = '';
  }

  private defaultExpiry(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  private rebuildDimOptions() {
    this.dimOptionsMap = {};
    for (const dim of this.dimensions) {
      this.dimOptionsMap[dim.dimensionCode] = [
        { value: '', label: '— Sin asignar —' },
        ...dim.rules.map(r => ({
          value: r.factorCode,
          label: r.factorDescription,
          hint:  r.factorCode,
        })),
      ];
    }
  }

  getDimension(nrIndex: number): DimensionWithRules | null {
    return this.dimensions.find(d => d.dimensionCode === nrIndex) ?? null;
  }

  get isDirty(): boolean {
    if (!this.user) return true;
    if (!this.initialValues) return false;
    const curr   = this.form.getRawValue();
    const fields = ['name','supervisorName','superUser','appRend','appConf',
                    'genDocPre','fijarNr','nr1','nr2',
                    'nr3','nr4','nr5','fijarSaldo','estado','fechaExpiracion','password'];
    return fields.some(f => curr[f] !== this.initialValues[f]);
  }

  fieldChanged(field: string): boolean {
    if (!this.user || !this.initialValues) return false;
    return this.form.get(field)?.value !== this.initialValues[field];
  }

  onAprobadorSelected(u: UsuarioItem | null) {
    this.form.patchValue({ supervisorName: u?.login ?? '' });
    this.cdr.markForCheck();
  }

  onLoginInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    input.value = upper;
    this.form.get('login')?.setValue(upper, { emitEvent: false });
  }

  onCheckToggle(field: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.get(field)?.setValue(checked ? '1' : '0');
  }

  onSave() {
    if (this.form.invalid || this.isSaving) return;
    const raw = this.form.getRawValue();
    this.saved.emit({ raw, isEdit: !!this.user });
  }

  onCancel() {
    this.cancelled.emit();
  }
}