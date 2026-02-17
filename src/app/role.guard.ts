import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard = (role: 'admin' | 'teacher'): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const userData = localStorage.getItem('user');

    if (!userData) {
      router.navigateByUrl('/login');
      return false;
    }

    const user = JSON.parse(userData);

    if (user.Role === role) {
      return true;
    }

    // دور غير مسموح
    router.navigateByUrl('/login');
    return false;
  };
};
