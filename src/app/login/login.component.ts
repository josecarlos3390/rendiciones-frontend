import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../core/toast';

/**
 * Mapea errores HTTP del backend a mensajes amigables para el usuario.
 */
function getLoginErrorMessage(err: any): string {
  // Si el backend envió un mensaje específico
  if (err?.error?.message && typeof err.error.message === 'string') {
    return err.error.message;
  }

  // Si el error es un string directo
  if (typeof err?.error === 'string') {
    return err.error;
  }

  // Errores HTTP estándar
  switch (err?.status) {
    case 401:
      return 'Usuario o contraseña incorrectos';
    case 429:
      return 'Demasiados intentos fallidos. Por favor, espera unos minutos.';
    case 500:
      return 'Error del servidor. Por favor, intenta más tarde.';
    case 0:
    case undefined:
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    default:
      return 'Error al iniciar sesión. Por favor, intenta nuevamente.';
  }
}

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  form!: FormGroup;
  loading = false;
  error: string | null = null;
  private toast = inject(ToastService);

  constructor(
    private fb:   FormBuilder,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],   // U_Login de REND_U
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = null;

    // Convertir usuario a mayúsculas (estándar del sistema)
    const username = String(this.form.value.username).trim().toUpperCase();
    const password = this.form.value.password;

    this.auth.login(username, password!).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast.exito('¡Bienvenido! Sesión iniciada correctamente');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        const mensaje = getLoginErrorMessage(err);
        this.error = mensaje;
        this.loading = false;
        this.cdr.markForCheck();
        this.toast.error(mensaje);
      },
    });
  }
}