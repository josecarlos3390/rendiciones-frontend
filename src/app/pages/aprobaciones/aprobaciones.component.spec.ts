import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { AprobacionesComponent } from './aprobaciones.component';
import { AprobacionesService } from '@services/aprobaciones.service';
import { NotificacionesService } from '@services/notificaciones.service';
import { ToastService } from '@core/toast/toast.service';

describe('AprobacionesComponent', () => {
  let component: AprobacionesComponent;
  let fixture: ComponentFixture<AprobacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobacionesComponent],
      providers: [
        {
          provide: AprobacionesService,
          useValue: {
            getPendientes: () => of([]),
            getPendientesNivel2: () => of([]),
            aprobar: () => of({} as any),
            rechazar: () => of({} as any),
          },
        },
        {
          provide: NotificacionesService,
          useValue: {
            emitirAprobacionProcesada: () => {},
            emitirRendicionRechazada: () => {},
            emitirRendicionSincronizada: () => {},
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: () => {},
            error: () => {},
            info: () => {},
            warning: () => {},
            mostrar: () => {},
          },
        },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AprobacionesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
