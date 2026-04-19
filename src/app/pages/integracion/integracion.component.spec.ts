import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { IntegracionComponent } from './integracion.component';
import { IntegracionService } from '@services/integracion.service';
import { ToastService } from '@core/toast/toast.service';
import { AuthService } from '@auth/auth.service';

describe('IntegracionComponent', () => {
  let component: IntegracionComponent;
  let fixture: ComponentFixture<IntegracionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntegracionComponent],
      providers: [
        {
          provide: IntegracionService,
          useValue: {
            getPendientes: () => of([]),
            getMisRendiciones: () => of([]),
            getHistorial: () => of([]),
            sincronizar: () => of({} as any),
            countPendientes: () => of({ count: 0 }),
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
          provide: AuthService,
          useValue: {
            isAdmin: true,
            puedeSync: true,
            canAccessIntegracion: true,
            sinAprobador: true,
            puedeGenerarPre: true,
            canAccessRend: true,
          } as any,
        },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IntegracionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
