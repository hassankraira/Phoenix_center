import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  const user = localStorage.getItem('user');

  if (user) {
    return true; // مسجل دخول
  }

  // ❌ مش مسجل دخول → 403
  router.navigateByUrl('/403');
  return false;
};
