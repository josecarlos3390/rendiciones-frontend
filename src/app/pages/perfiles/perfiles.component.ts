import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { PerfilesService } from './perfiles.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import {
  Perfil, CreatePerfilPayload,
  MONEDA_OPTIONS, CARACTERISTICA_OPTIONS, LINEAS_OPTIONS,
} from '../../models/perfil.model';

@Component({
  standalone: true,
  selector: 'app-perfiles',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, PaginatorComponent],
  templateUrl: './perfiles.component.html',
  styleUrls: ['./perfiles.component.scss'],
})
export class PerfilesComponent implements OnInit {
  perfiles:  Perfil[] = [];
  filtered:  Perfil[] = [];
  paged:     Perfil[] = [];
  search    = '';
  loading   = false;
  loadError = false;

  // Paginación
  page       = 1;
  limit      = 5;
  totalPages = 1;

  showForm      = false;
  editingPerfil: Perfil | null = null;
  isSaving      = false;
  form!: FormGroup;

  private initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  // Opciones para selects
  readonly monedaOptions        = MONEDA_OPTIONS;
  readonly caracteristicaOptions = CARACTERISTICA_OPTIONS;
  readonly lineasOptions         = LINEAS_OPTIONS;

  constructor(
    private perfilesService: PerfilesService,
    private toast:           ToastService,
    private fb:              FormBuilder,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
  }

  // ── Helpers ──────────────────────────────────────────────

  get isDirty(): boolean {
    return true;
  }

  monedaLabel(val: string): string {
    return this.monedaOptions.find(o => o.value === val)?.label ?? val;
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      nombrePerfil:   ['', [Validators.required, Validators.maxLength(300)]],
      trabaja:        ['0'],
      perCtaBl:       [0],
      proCar:         ['TODOS'],
      proTexto:       ['', Validators.maxLength(25)],
      cueCar:         ['TODOS'],
      cueTexto:       ['', Validators.maxLength(30)],
      empCar:         ['EMPIEZA'],
      empTexto:       ['', Validators.maxLength(10)],
      controlPartida: [0],
      cntLineas:      [5, [Validators.required, Validators.min(1)]],
      bolivianos:     [0],
      sucursal:       [0],
      rep1:           ['', Validators.maxLength(50)],
      rep2:           ['', Validators.maxLength(50)],
    });
  }

  // ── CRUD ─────────────────────────────────────────────────

  load() {
    this.loading   = true;
    this.loadError = false;
    this.perfilesService.getAll().subscribe({
      next: (data) => {
        this.perfiles = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
      },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.perfiles.filter(p =>
      (p.U_NombrePerfil ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
  }


  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  // ── Formulario ───────────────────────────────────────────

  openNew() {
    this.editingPerfil = null;
    this.initialValues = null;
    this.form.reset({
      nombrePerfil: '', trabaja: '0', perCtaBl: 0,
      proCar: 'TODOS', proTexto: '',
      cueCar: 'TODOS', cueTexto: '',
      empCar: 'EMPIEZA', empTexto: '',
      controlPartida: 0, cntLineas: 5,
      bolivianos: 0, sucursal: 0, rep1: '', rep2: '',
    });
    this.showForm = true;
  }

  openEdit(p: Perfil) {
    this.editingPerfil = p;
    this.form.reset({
      nombrePerfil:   p.U_NombrePerfil   ?? '',
      trabaja:        p.U_Trabaja         ?? '0',
      perCtaBl:       p.U_Per_CtaBl      ?? 0,
      proCar:         p.U_PRO_CAR        ?? 'TODOS',
      proTexto:       p.U_PRO_Texto      ?? '',
      cueCar:         p.U_CUE_CAR        ?? 'TODOS',
      cueTexto:       p.U_CUE_Texto      ?? '',
      empCar:         p.U_EMP_CAR        ?? 'TODOS',
      empTexto:       p.U_EMP_TEXTO      ?? '',
      controlPartida: p.U_ControlPartida ?? 0,
      cntLineas:      p.U_CntLineas      ?? 5,
      bolivianos:     p.U_Bolivianos     ?? 0,
      sucursal:       p.U_SUCURSAL       ?? 0,
      rep1:           p.U_REP1           ?? '',
      rep2:           p.U_REP2           ?? '',
    });
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
  }

  closeForm() {
    this.showForm      = false;
    this.editingPerfil = null;
    this.initialValues = null;
    this.form.reset();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: CreatePerfilPayload = {
      nombrePerfil:   raw.nombrePerfil,
      trabaja:        raw.trabaja,
      perCtaBl:       Number(raw.perCtaBl),
      proCar:         raw.proCar,
      proTexto:       raw.proTexto ?? '',
      cueCar:         raw.cueCar,
      cueTexto:       raw.cueTexto ?? '',
      empCar:         raw.empCar,
      empTexto:       raw.empTexto ?? '',
      controlPartida: Number(raw.controlPartida),
      cntLineas:      Number(raw.cntLineas),
      bolivianos:     Number(raw.bolivianos),
      sucursal:       Number(raw.sucursal),
      rep1:           raw.rep1 ?? '',
      rep2:           raw.rep2 ?? '',
    };

    if (this.editingPerfil) {
      this.perfilesService.update(this.editingPerfil.U_CodPerfil, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Perfil actualizado');
          this.closeForm();
          this.load();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al actualizar perfil');
          }
        },
      });
    } else {
      this.perfilesService.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Perfil creado');
          this.closeForm();
          this.load();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al crear perfil');
          }
        },
      });
    }
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(p: Perfil) {
    this.openDialog({
      title:        '¿Eliminar perfil?',
      message:      `Se eliminará el perfil "${p.U_NombrePerfil}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.perfilesService.remove(p.U_CodPerfil).subscribe({
        next:  () => { this.toast.success('Perfil eliminado'); this.load(); },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al eliminar perfil');
          }
        },
      });
    });
  }

  // ── Dialog ───────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }
}