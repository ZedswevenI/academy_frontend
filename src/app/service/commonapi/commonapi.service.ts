import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

const ACCESSIBLE_CENTERS_CACHE_KEY = 'accessibleCentersCache';
const SELECTED_CENTER_KEY = 'selectedCenterId';
const ALL_CENTERS_ID = '__ALL__';

@Injectable({
  providedIn: 'root'
})
export class CommonapiService {
headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient) {}

  /**
   * Resolves the centerId to attach to this request based on the cached
   * accessible-center list (populated by CenterContextService once it
   * resolves the logged-in user's centers). Read directly from localStorage
   * (not injected as a service) to avoid a circular dependency with
   * CenterContextService, which itself calls into this service to load
   * the center list.
   *
   * - No cache yet (app/session bootstrap, e.g. the very call that loads
   *   the center list itself): allow the request through unfiltered.
   * - Exactly one accessible center: use it, nothing to select.
   * - Zero accessible centers: block — misconfigured account.
   * - More than one, none selected yet: block — user must pick one first.
   */
  private resolveCenterId(): { centerId: string; blocked: boolean } {
    const cacheRaw = localStorage.getItem(ACCESSIBLE_CENTERS_CACHE_KEY);
    if (!cacheRaw) return { centerId: '', blocked: false };
    let cache: any[] = [];
    try {
      cache = JSON.parse(cacheRaw) || [];
    } catch {
      cache = [];
    }
    if (cache.length === 0) return { centerId: '', blocked: true };
    if (cache.length === 1) return { centerId: cache[0].centerId, blocked: false };
    const selected = localStorage.getItem(SELECTED_CENTER_KEY) || '';
    if (!selected) return { centerId: '', blocked: true };
    if (selected === ALL_CENTERS_ID) return { centerId: '', blocked: false };
    return { centerId: selected, blocked: false };
  }

  private blockedError(): Observable<never> {
    return throwError(() => new Error('Please select a center before continuing.'));
  }

  // =========================
  // GENERIC POST (existing)
  // =========================
  fetchData(payload: any, module: string, endpoint: string): Observable<any> {
    const { centerId, blocked } = this.resolveCenterId();
    if (blocked) return this.blockedError();
    const body =
      centerId && (payload == null || payload.centerId === undefined)
        ? { ...(payload || {}), centerId }
        : payload;
    return this.http
      .post(`${environment.baseURL}/${module}/${endpoint}`, body, {
        headers: this.headers
      });
  }

  // =========================
  // GENERIC GET (NEW)
  // =========================
  getData(module: string, endpoint: string, params?: any): Observable<any> {
    const { centerId, blocked } = this.resolveCenterId();
    if (blocked) return this.blockedError();
    const finalParams =
      centerId && (params == null || params.centerId === undefined)
        ? { ...(params || {}), centerId }
        : params;
    return this.http
      .get(`${environment.baseURL}/${module}/${endpoint}`, {
        headers: this.headers,
        params: finalParams
      });
  }

  // =========================
  // FILE DOWNLOAD (existing)
  // =========================
  downloadByUrl(payload: any, module: string, endpoint: string): Observable<Blob> {
    const { centerId, blocked } = this.resolveCenterId();
    if (blocked) return this.blockedError();
    const body =
      centerId && (payload == null || payload.centerId === undefined)
        ? { ...(payload || {}), centerId }
        : payload;
    return this.http.post(
      `${environment.baseURL}/${module}/${endpoint}`,
      body,
      { responseType: 'blob' }
    );
  }

  //Error Handling
  handleError(error: HttpErrorResponse) {
    let errorMessage = 'Unknown error!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    window.alert(errorMessage);
    return errorMessage;
  }

  uploadImage(payload: any, module: string, endpoint: string): Observable<any> {
    const { centerId, blocked } = this.resolveCenterId();
    if (blocked) return this.blockedError();
    let body = payload;
    if (centerId) {
      if (payload instanceof FormData) {
        if (!payload.has('centerId')) payload.append('centerId', centerId);
      } else if (payload == null || payload.centerId === undefined) {
        body = { ...(payload || {}), centerId };
      }
    }
    return this.http
      .post(`${environment.baseURL}/${module}/${endpoint}`, body);
  }
}
