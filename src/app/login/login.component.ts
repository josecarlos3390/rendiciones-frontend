import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class LoginComponent {
  form!: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb:   FormBuilder,
    private auth: AuthService,
    private router: Router
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

    const { username, password } = this.form.value;

    this.auth.login(username!, password!).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error =
          err?.error?.message ||
          err?.error ||
          'Error al iniciar sesion';
        this.loading = false;
      },
    });
  }
}
