import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TipoDocSapComponent } from './tipo-doc-sap.component';
import { TipoDocSapService } from '@services/tipo-doc-sap.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { FormDirtyService } from '@shared/form-dirty';
import { AuthService } from '@auth/auth.service';

describe('TipoDocSapComponent', () => {
  let component: TipoDocSapComponent;
  let fixture: ComponentFixture<TipoDocSapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoDocSapComponent],
      providers: [
        {
          provide: TipoDocSapService,
          useValue: {
            getAll: () => of([]),
            getActivos: () => of([]),
            getOne: () => of({} as any),
            create: () => of({} as any),
            update: () => of({} as any),
            remove: () => of({ affected: 1 }),
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
          provide: ConfirmDialogService,
          useValue: {
            ask: () => Promise.resolve(true),
            resolve: () => {},
          },
        },
        {
          provide: HttpErrorHandler,
          useValue: { handle: () => {} },
        },
        {
          provide: FormDirtyService,
          useValue: { isDirty: () => false },
        },
        {
          provide: AuthService,
          useValue: {
            isAdmin: true,
            puedeEditarConf: true,
            canAccessConf: true,
          } as any,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TipoDocSapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
