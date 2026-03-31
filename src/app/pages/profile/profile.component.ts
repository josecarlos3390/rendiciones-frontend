import { Component, inject, OnInit, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';

import { UsersService } from '../users/users.service';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../core/toast/toast.service';
import { User } from '../../models/user.model';

function passwordMatchValidator(): ValidatorFn {
  return (form: AbstractControl) => {
    const np = form.get('newPassword')?.value;
    const cp = form.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { mismatch: true } : null;
  };
}

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ProfileComponent implements OnInit {

  private fb           = inject(FormBuilder);
  private usersService = inject(UsersService);
  private auth         = inject(AuthService);
  private toast        = inject(ToastService);
  private cdr          = inject(ChangeDetectorRef);
  router               = inject(Router);
  private destroyRef   = inject(DestroyRef);

  user: User | null = null;

  isSavingProfile  = false;
  isSavingPassword = false;
  passwordError    = '';

  isProfileDirty = false;
  private _originalName = '';

  profileForm = this.fb.group({
    name:      ['', Validators.required],
    login:     [{ value: '', disabled: true }],
    role:      [{ value: '', disabled: true }],
    appRend:   [{ value: '', disabled: true }],
    appConf:   [{ value: '', disabled: true }],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatchValidator() });

  get isPasswordReady(): boolean {
    return this.passwordForm.valid;
  }

  get initial(): string {
    return (this.user?.U_NomUser ?? this.user?.U_Login ?? 'U')[0].toUpperCase();
  }

  get roleLabel(): string {
    return this.user?.U_SuperUser === 1 ? 'Administrador' : 'Usuario';
  }

  ngOnInit() {
    Promise.resolve().then(() => this.loadMe());
  }

  loadMe() {
    this.usersService.getMe().subscribe({
      next: (user) => {
        this.user = user;
        this._originalName = user.U_NomUser ?? '';
        this.profileForm.patchValue({
          name:    user.U_NomUser,
          login:   user.U_Login,
          role:    user.U_SuperUser === 1 ? 'Administrador' : 'Usuario',
          appRend: user.U_AppRend === 'Y' ? 'Sí' : 'No',
          appConf: user.U_AppConf === 'Y' ? 'Sí' : 'No',
        });

        this.profileForm.get('name')!.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(v => {
            this.isProfileDirty = (v ?? '').trim() !== this._originalName.trim();
            this.cdr.markForCheck();
          });

        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); },
    });
  }

  saveProfile() {
    if (this.profileForm.invalid || this.isSavingProfile || !this.isProfileDirty) return;
    this.isSavingProfile = true;

    const name = this.profileForm.getRawValue().name ?? '';
    this.usersService.updateMyName(name).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.isProfileDirty  = false;
        this.toast.success('Perfil actualizado correctamente');
        this.cdr.markForCheck();
        this.loadMe();
      },
      error: () => {
        this.isSavingProfile = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeProfile() {
    this.router.navigate(['/dashboard']);
  }

  changePassword() {
    if (this.passwordForm.invalid || this.isSavingPassword) return;
    this.isSavingPassword = true;
    this.passwordError    = '';

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.usersService.updateMyPassword({
      currentPassword: currentPassword!,
      newPassword:     newPassword!,
    }).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordForm.reset();
        this.toast.success('Contraseña actualizada correctamente');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSavingPassword = false;
        this.passwordError    = err?.error?.message || 'Error al actualizar la contraseña';
        this.cdr.markForCheck();
        // Auto-limpiar el error después de 4 segundos
        timer(4000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.passwordError = '';
          this.cdr.markForCheck();
        });
      },
    });
  }
}