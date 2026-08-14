// Fixture: the four ways a service gets hold of the API root.
// Synthetic - written for this repo's benchmarks, not copied from any
// product source.
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG, AppConfig } from '../../app-config';
import { THING_API_BASE } from './api-base.token';

// A plain assignment: the field holds the root itself and the version
// arrives at the call site.
@Injectable({ providedIn: 'root' })
export class RootFieldService {
  private readonly apiUrl: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig, private http: HttpClient) {
    this.apiUrl = config.msalConfig.apis[0].uri;
  }

  getWidget(widgetId: string) {
    return this.http.get<unknown>(`${this.apiUrl}v1/widgets/${widgetId}`);
  }
}

// A property initialiser rather than a constructor body, and a tail
// with no version segment at all.
@Injectable({ providedIn: 'root' })
export class InitialiserService {
  private readonly baseUrl = `${this.config.msalConfig.apis[0].uri}v1`;
  private readonly flatUrl = `${this.config.msalConfig.apis[0].uri}gadgets`;
  private readonly pageSize = 50;

  constructor(@Inject(APP_CONFIG) private config: AppConfig, private http: HttpClient) {}

  listWidgets() {
    return this.http.get<unknown>(`${this.baseUrl}/widgets`);
  }

  listGadgets() {
    return this.http.get<unknown>(`${this.flatUrl}`);
  }
}

// A private field, and a base built from the injection token: one call
// site, two routes.
@Injectable({ providedIn: 'root' })
export class TokenBaseService {
  #baseUrl: string;

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(THING_API_BASE) apiBase: string,
    private readonly http: HttpClient,
  ) {
    this.#baseUrl = `${config.msalConfig.apis[0].uri}${apiBase}`;
  }

  getSites(thingId: string) {
    return this.http.get<unknown>(`${this.#baseUrl}/${thingId}/sites`);
  }
}
