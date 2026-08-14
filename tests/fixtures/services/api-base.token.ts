// Fixture: a prefix held in an injection token with more than one
// provider, so one call site reaches two live routes. Synthetic -
// written for this repo's benchmarks, not copied from any product
// source.
import { InjectionToken } from '@angular/core';

export const ADMIN_THING_API_BASE = 'v1/things';

export const PARTNER_THING_API_BASE = 'v1/partner/thing';

export const THING_API_BASE = new InjectionToken<string>('THING_API_BASE', {
  providedIn: 'root',
  factory: () => ADMIN_THING_API_BASE,
});

export const PARTNER_ROUTES = [
  {
    path: 'thing',
    providers: [
      { provide: THING_API_BASE, useValue: PARTNER_THING_API_BASE },
    ],
  },
];
