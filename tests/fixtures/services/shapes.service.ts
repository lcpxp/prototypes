// Fixture: the URL shapes that defeat a pattern-matching extractor -
// helper methods, a query-string suffix, a local variable, and a
// request that is not an API route at all. Synthetic - written for
// this repo's benchmarks, not copied from any product source.
import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { switchMap } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../app-config';

// A helper with an optional parameter: called with one argument it
// returns the collection, with two the single resource.
@Injectable({ providedIn: 'root' })
export class HelperService {
  private readonly apiBase: string;

  constructor(@Inject(APP_CONFIG) private config: AppConfig, private http: HttpClient) {
    this.apiBase = `${this.config.msalConfig.apis[0].uri}v1`;
  }

  private flowUrl(ownerId: string, flowId?: string): string {
    const base = `${this.apiBase}/owners/${ownerId}/flows`;
    return flowId ? `${base}/${flowId}` : base;
  }

  listFlows(ownerId: string) {
    return this.http.get<unknown>(this.flowUrl(ownerId));
  }

  createFlow(ownerId: string, body: unknown) {
    return this.http.post<string>(this.flowUrl(ownerId), body);
  }

  getFlow(ownerId: string, flowId: string) {
    return this.http.get<unknown>(this.flowUrl(ownerId, flowId));
  }

  getSteps(ownerId: string, flowId: string) {
    return this.http.get<unknown>(`${this.flowUrl(ownerId, flowId)}/steps`);
  }
}

// A helper with a defaulted parameter, and a ternary that appends a
// segment only when the caller supplies one.
@Injectable({ providedIn: 'root' })
export class DefaultedHelperService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = config.msalConfig.apis[0].uri;
  }

  private v2(recordId: string, tail = ''): string {
    return `${this.baseUrl}v2/records/${recordId}${tail ? '/' + tail : ''}`;
  }

  getRecord(recordId: string) {
    return this.http.get<unknown>(this.v2(recordId));
  }

  getScreenings(recordId: string) {
    return this.http.get<unknown>(this.v2(recordId, 'screenings'));
  }

  send(recordId: string, body: unknown) {
    return this.http.post<string>(this.v2(recordId, 'contract/send'), body);
  }
}

// A query-string suffix, and a URL built into a local first.
@Injectable({ providedIn: 'root' })
export class SuffixService {
  private readonly api: string;
  private readonly listUrl: string;

  constructor(@Inject(APP_CONFIG) private config: AppConfig, private http: HttpClient) {
    this.api = this.config.msalConfig.apis[0].uri;
    this.listUrl = `${this.config.msalConfig.apis[0].uri}v1/people`;
  }

  createPerson(ownerId: string | null, body: unknown) {
    const query = ownerId ? `?ownerId=${ownerId}` : '';
    return this.http.post<string>(`${this.api}v1/people${query}`, body);
  }

  listPeople(ownerId?: string) {
    let url = this.listUrl;
    let params = new HttpParams();
    if (ownerId) {
      params = params.append('ownerId', ownerId);
    }
    return this.http.get<unknown[]>(url, { params });
  }
}

// Not a route: the API answers with a pre-signed URL and the second
// request leaves the API entirely.
@Injectable({ providedIn: 'root' })
export class DownloadService {
  private readonly apiUrl: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig, private http: HttpClient) {
    this.apiUrl = config.msalConfig.apis[0].uri;
  }

  getFileBlob(assetId: string) {
    return this.http
      .get<string>(`${this.apiUrl}v1/assets/${assetId}/download-url`)
      .pipe(switchMap((downloadLink: string) =>
        this.http.get(downloadLink, { responseType: 'arraybuffer' })));
  }
}
