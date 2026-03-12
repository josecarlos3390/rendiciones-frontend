import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (roles: Array<'ADMIN' | 'USER'>): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const userRole = auth.role;

    if (!userRole || !roles.includes(userRole)) {
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  };
};
