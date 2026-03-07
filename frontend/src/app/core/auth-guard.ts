import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  if (sessionService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
