import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '@auth/auth.service';
import { AprobacionesService } from '@services/aprobaciones.service';
import { environment } from '@env';

interface RendStats {
  total:       number;
  abiertas:    number;
  enviadas:    number;
  aprobadas:   number;
  cerradas:    number;
  sincronizadas:  number;   // ← agregar esta línea
  montoTotal:  number;
  // Solo para ADMIN
  totalGlobal?: number;
  montoGlobal?: number;
}

@Component({
  selector:        'app-dashboard',
  standalone:      true,
  imports:         [CommonModule, RouterModule],
  templateUrl:     './dashboard.component.html',
  styleUrls:       ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {

  stats:            RendStats | null = null;
  pendientesCount   = 0;
  loadingStats      = true;
  private sub?: Subscription;

  constructor(
    private auth:    AuthService,
    private http:    HttpClient,
    private aprobSvc: AprobacionesService,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit() {
    setTimeout(() => this.loadData(), 0);
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    this.loadingStats = true;
    const idPerfil = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('rendiciones_perfil_activo')
      : null;
    const statsUrl = idPerfil
      ? `${environment.apiUrl}/rend-m/stats?idPerfil=${idPerfil}`
      : `${environment.apiUrl}/rend-m/stats`;
    this.sub = forkJoin({
      stats:      this.http.get<RendStats>(statsUrl).pipe(catchError(() => of(null))),
      pendientes: this.aprobSvc.countPendientes().pipe(catchError(() => of({ count: 0 }))),
    }).subscribe({
      next: ({ stats, pendientes }) => {
        this.stats           = stats;
        this.pendientesCount = pendientes?.count ?? 0;
        this.loadingStats    = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingStats = false;
        this.cdr.markForCheck();
      },
    });
  }

  get userName(): string {
    return this.auth.user?.name ?? this.auth.user?.username ?? 'Usuario';
  }

  get isAdmin(): boolean { return this.auth.isAdmin; }

  get today(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get montoFormateado(): string {
    if (!this.stats) return '—';
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.stats.montoTotal);
  }
}
