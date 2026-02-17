// src/app/signals/user.signal.ts
import { signal } from '@angular/core';

export const currentUser = signal<any | null>(null);
