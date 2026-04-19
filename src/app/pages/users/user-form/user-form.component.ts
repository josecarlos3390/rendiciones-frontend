import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioSearchComponent, UsuarioItem } from '@shared/usuario-search/usuario-search.component';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { FormModalComponent } from '@shared/form-modal';
import { FormModalTab } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import { User } from '@models/user.model';
import { DimensionWithRules } from '@services/sap.service';
import { BreakpointService } from '@services/breakpoint.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UsuarioSearchComponent, AppSelectComponent, FormModalComponent, FormFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./user-form.component.scss'],
  template: `
<app-form-modal
  [title]="'Usuario'"
  [subtitle]="user ? user.U_Login : null"
  [isOpen]="visible"
  [loading]="isSaving"
  [isEditing]="user !== null"
  [isDirty]="isDirty"
  [wide]="true"
  [submitDisabled]="form.invalid"
  [tabs]="activeTabs"
  [activeTab]="activeTab"
  [showTabNav]="isMobile"
  (tabChange)="onTabChange($event)"
  (save)="onSave()"
  (cancel)="onCancel()">
  
  <ng-template #formContent>
    <form [formGroup]="form" (ngSubmit)="onSave()" novalidate
          [class.layout-desktop]="!isMobile"
          [class.layout-mobile]="isMobile">

      <!-- ══ Columna izquierda: datos ══ -->
      <div class="form-col" [class.tab-hidden]="!isDatosTab">

        <div class="form-section-label">Datos del usuario</div>

        <!-- Usuario (solo creación) -->
        <app-form-field 
          *ngIf="!user"
          label="Usuario"
          [required]="true"
          controlName="login"
          hint="máx. 10">
          <input type="text" formControlName="login" placeholder="JPEREZ" maxlength="10" autocomplete="off" (input)="onLoginInput($event)" />
        </app-form-field>

        <div class="form-field" *ngIf="user">
          <label>Usuario</label>
          <input type="text" [value]="user.U_Login" disabled />
        </div>

        <!-- Nombre y Apellido -->
        <app-form-field 
          label="Nombre y Apellido"
          [required]="true"
          controlName="name"
          [showChanged]="!!user"
          [initialValue]="initialValues?.['name']">
          <input type="text" formControlName="name" placeholder="Juan Pérez" autocomplete="off" />
        </app-form-field>

        <!-- Aprobador -->
        <app-form-field 
          label="Aprobador"
          controlName="supervisorName"
          hint="El usuario seleccionado deberá aprobar las rendiciones de este usuario"
          [showChanged]="!!user"
          [initialValue]="initialValues?.['supervisorName']">
          <app-usuario-search
            [initialLogin]="form.get('supervisorName')?.value"
            [excludeLogin]="user?.U_Login ?? null"
            [allowClear]="true"
            placeholderText="— Sin aprobador (nivel final) —"
            (usuarioChange)="onAprobadorSelected($event)">
          </app-usuario-search>
        </app-form-field>

        <!-- Tipo de Usuario y Fecha Expiración -->
        <div class="form-row">
          <app-form-field 
            label="Tipo de Usuario"
            [required]="true"
            controlName="superUser"
            [showChanged]="!!user"
            [initialValue]="initialValues?.['superUser']">
            <app-select
              label="Tipo de Usuario"
              [required]="true"
              [searchable]="false"
              [options]="userTypeOptions"
              [value]="form.get('superUser')?.value"
              (valueChange)="form.get('superUser')?.setValue($event)">
            </app-select>
          </app-form-field>

          <app-form-field 
            label="Fecha Expiración"
            [required]="true"
            controlName="fechaExpiracion"
            [showChanged]="!!user"
            [initialValue]="initialValues?.['fechaExpiracion']">
            <input type="date" formControlName="fechaExpiracion" />
          </app-form-field>
        </div>

        <!-- Contraseña -->
        <app-form-field 
          *ngIf="!user"
          label="Contraseña"
          [required]="true"
          controlName="password"
          errorMessage="Mínimo 6 caracteres">
          <input type="password" formControlName="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
        </app-form-field>

        <app-form-field 
          *ngIf="user"
          label="Nueva contraseña"
          controlName="password"
          hint="vacío = no cambiar"
          [showChanged]="!!user && !!form.get('password')?.value"
          [initialValue]="''">
          <input type="password" formControlName="password" placeholder="••••••••" autocomplete="new-password" />
        </app-form-field>

        <div class="form-section-label">Normas de Reparto</div>

        <!-- Fijar Norma Reparto (toggle manteniendo estructura HTML) -->
        <div class="toggle-field" [class.field-changed]="fieldChanged('fijarNr')">
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-title">Fijar Norma Reparto</span>
              <span class="toggle-desc">Asigna automáticamente las normas al crear documentos</span>
            </div>
            <div class="toggle-wrap">
              <span class="toggle-status" [class.is-on]="form.get('fijarNr')?.value == '1'">
                {{ form.get('fijarNr')?.value == '1' ? 'ON' : 'OFF' }}
              </span>
              <label class="u-toggle">
                <input type="checkbox"
                  [checked]="form.get('fijarNr')?.value == '1'"
                  (change)="onCheckToggle('fijarNr', $event)" />
                <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Normas de reparto NR1-NR5 -->
        <div class="form-row">
          <ng-container *ngFor="let nr of [1,2,3,4,5]">
            <ng-container *ngIf="getDimension(nr) as dim; else nrText">
              <app-form-field 
                [label]="dim.dimensionDescription || dim.dimensionName"
                [controlName]="'nr' + nr"
                [showChanged]="!!user"
                [initialValue]="initialValues?.['nr' + nr]">
                <app-select
                  [label]="dim.dimensionDescription || dim.dimensionName"
                  [options]="dimOptionsMap[nr] ?? []"
                  [value]="form.get('nr'+nr)?.value"
                  (valueChange)="form.get('nr'+nr)?.setValue($event)">
                </app-select>
              </app-form-field>
            </ng-container>
            <ng-template #nrText>
              <app-form-field 
                *ngIf="!loadingDims"
                [label]="'NR ' + nr"
                [controlName]="'nr' + nr"
                [showChanged]="!!user"
                [initialValue]="initialValues?.['nr' + nr]">
                <input type="text" [formControlName]="'nr'+nr" maxlength="50" />
              </app-form-field>
            </ng-template>
          </ng-container>

          <div *ngIf="loadingDims" class="dim-loading">
            <span>Cargando normas de reparto...</span>
          </div>
        </div>

      </div><!-- /col izquierda -->

      <!-- ══ Columna derecha: permisos ══ -->
      <div class="form-col" [class.tab-hidden]="!isPermisosTab">

        <div class="form-section-label">Módulos y permisos</div>

        <div class="perms-card">
          <!-- Permisos con estructura HTML especial (toggles) -->
          <div class="perm-row" [class.perm-row--changed]="fieldChanged('appRend')">
            <div class="perm-info">
              <span class="perm-name">Rendiciones</span>
              <span class="perm-desc">Acceso al módulo de rendiciones de gastos</span>
            </div>
            <div class="perm-toggle-wrap">
              <span class="perm-status" [class.is-on]="form.get('appRend')?.value == '1'">
                {{ form.get('appRend')?.value == '1' ? 'ON' : 'OFF' }}
              </span>
              <label class="u-toggle">
                <input type="checkbox" [checked]="form.get('appRend')?.value == '1'" (change)="onCheckToggle('appRend', $event)" />
                <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
              </label>
            </div>
          </div>

          <div class="perm-row" [class.perm-row--changed]="fieldChanged('appConf')">
            <div class="perm-info">
              <span class="perm-name">Configuraciones</span>
              <span class="perm-desc">Ver y editar configuraciones del sistema</span>
            </div>
            <div class="perm-toggle-wrap">
              <span class="perm-status" [class.is-on]="form.get('appConf')?.value == '1'">
                {{ form.get('appConf')?.value == '1' ? 'ON' : 'OFF' }}
              </span>
              <label class="u-toggle">
                <input type="checkbox" [checked]="form.get('appConf')?.value == '1'" (change)="onCheckToggle('appConf', $event)" />
                <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
              </label>
            </div>
          </div>

          <div class="perm-row" [class.perm-row--changed]="fieldChanged('genDocPre')">
            <div class="perm-info">
              <span class="perm-name">Genera Preliminar</span>
              <span class="perm-desc">Permite generar documentos en estado borrador</span>
            </div>
            <div class="perm-toggle-wrap">
              <span class="perm-status" [class.is-on]="form.get('genDocPre')?.value == '1'">
                {{ form.get('genDocPre')?.value == '1' ? 'ON' : 'OFF' }}
              </span>
              <label class="u-toggle">
                <input type="checkbox" [checked]="form.get('genDocPre')?.value == '1'" (change)="onCheckToggle('genDocPre', $event)" />
                <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
              </label>
            </div>
          </div>

          <div class="perm-row" [class.perm-row--changed]="fieldChanged('fijarSaldo')">
            <div class="perm-info">
              <span class="perm-name">Fijar Saldo</span>
              <span class="perm-desc">Permite fijar manualmente el saldo en rendiciones</span>
            </div>
            <div class="perm-toggle-wrap">
              <span class="perm-status" [class.is-on]="form.get('fijarSaldo')?.value == '1'">
                {{ form.get('fijarSaldo')?.value == '1' ? 'ON' : 'OFF' }}
              </span>
              <label class="u-toggle">
                <input type="checkbox" [checked]="form.get('fijarSaldo')?.value == '1'" (change)="onCheckToggle('fijarSaldo', $event)" />
                <span class="u-toggle__track"><span class="u-toggle__thumb"></span></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Estado (solo edición) -->
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

    </form>
  </ng-template>
  
  <ng-template #formFooter>
    <div class="modal-2col-footer">
      <ng-container *ngIf="isDirty; else noChanges">
        <button type="button" class="btn btn-ghost" (click)="onCancel()">Cancelar</button>
        <button type="button"
          [class]="user ? 'btn btn-save-changes' : 'btn btn-primary'"
          [disabled]="form.invalid || isSaving"
          (click)="onSave()">
          <span *ngIf="isSaving">Guardando...</span>
          <span *ngIf="!isSaving">{{ user ? '💾 Guardar cambios' : 'Crear Usuario' }}</span>
        </button>
      </ng-container>
      <ng-template #noChanges>
        <button type="button" class="btn btn-ghost" (click)="onCancel()">Cerrar</button>
      </ng-template>
    </div>
  </ng-template>
</app-form-modal>
  `,
})
export class UserFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible   = false;
  @Input() user:      User | null = null;
  @Input() dimensions: DimensionWithRules[] = [];
  @Input() loadingDims = false;
  @Input() isSaving    = false;

  @Output() saved     = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  dimOptionsMap: Partial<Record<number, SelectOption[]>> = {};
  initialValues: Record<string, unknown> | null = null;

  // ── Tabs para móvil ──────────────────────────────────────────
  isMobile = false;
  activeTab = 'datos';
  readonly mobileTabs: FormModalTab[] = [
    { id: 'datos',    label: 'Datos y Normas' },
    { id: 'permisos', label: 'Permisos' },
  ];
  private mobileSub?: Subscription;

  readonly userTypeOptions: SelectOption[] = [
    { value: 0, label: 'Normal',        icon: '👤' },
    { value: 1, label: 'Administrador', icon: '👑' },
  ];

  readonly estadoOptions: SelectOption[] = [
    { value: '1', label: 'Activo',    icon: '✅' },
    { value: '0', label: 'Inactivo',  icon: '⛔' },
    { value: '2', label: 'Bloqueado', icon: '🔒' },
  ];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private dirtyService: FormDirtyService,
    private breakpoint: BreakpointService,
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    this.mobileSub = this.breakpoint.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.mobileSub?.unsubscribe();
  }

  get activeTabs(): FormModalTab[] {
    return this.isMobile ? this.mobileTabs : [];
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
  }

  get isDatosTab(): boolean    { return !this.isMobile || this.activeTab === 'datos'; }
  get isPermisosTab(): boolean { return !this.isMobile || this.activeTab === 'permisos'; }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dimensions']) {
      this.rebuildDimOptions();
    }
    if (changes['visible'] && this.visible) {
      this.activeTab = 'datos';
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
    this.initialValues!['password'] = '';
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
    return this.dirtyService.isDirty(this.form, this.initialValues, {
      includeFields: ['name','supervisorName','superUser','appRend','appConf',
                      'genDocPre','fijarNr','nr1','nr2',
                      'nr3','nr4','nr5','fijarSaldo','estado','fechaExpiracion','password'],
    });
  }

  fieldChanged(field: string): boolean {
    return this.dirtyService.fieldChanged(this.form.get(field), this.initialValues?.[field]);
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
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      if (this.isMobile) {
        const datosFields = ['login', 'name', 'password', 'superUser', 'fechaExpiracion', 'fijarNr', 'nr1', 'nr2', 'nr3', 'nr4', 'nr5'];
        const hasDatosError = datosFields.some(f => this.form.get(f)?.invalid);
        this.activeTab = hasDatosError ? 'datos' : 'permisos';
        this.cdr.markForCheck();
      }
      return;
    }
    const raw = this.form.getRawValue();
    this.saved.emit({ raw, isEdit: !!this.user });
  }

  onCancel() {
    this.cancelled.emit();
  }
}
