// ============================================================
//  permission-catalog.service.ts  –  Fetches the live permission
//  catalog from POST /ims/permission/catalog, used to render the
//  checkbox-tree picker in Org Masters → Users.
//
//  Read-only reference data, not user-specific, so it's cached
//  for the session (one call, reused across every user edited in
//  the Users screen) — per the backend's own guidance.
// ============================================================

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { CommonapiService } from '../service/commonapi/commonapi.service';

export interface PermissionEntry {
  permissionKey: string;
  action: string;
  label: string;
}

export interface PermissionModuleGroup {
  module: string;
  permissions: PermissionEntry[];
}

@Injectable({ providedIn: 'root' })
export class PermissionCatalogService {
  private cache$: Observable<PermissionModuleGroup[]> | null = null;

  constructor(private commonApi: CommonapiService) {}

  /** Fetches the full catalog (no `module` filter — 277 entries/51 modules
   *  is small enough to load whole). Cached after the first successful call;
   *  pass force=true to bypass the cache (e.g. after adding a new key server-side). */
  getCatalog(force = false): Observable<PermissionModuleGroup[]> {
    if (!force && this.cache$) return this.cache$;

    this.cache$ = this.commonApi.fetchData({}, 'ims/permission', 'catalog').pipe(
      map((res: any) => (Array.isArray(res?.data) ? res.data : [])),
      catchError((err) => {
        // Don't cache a failed fetch — the next getCatalog() call should retry.
        this.cache$ = null;
        return throwError(() => err);
      }),
      shareReplay(1),
    );
    return this.cache$;
  }

  /** Flattened list of every permissionKey in the catalog — for validation. */
  getAllKeys(force = false): Observable<string[]> {
    return this.getCatalog(force).pipe(
      map((groups) => groups.flatMap((g) => g.permissions.map((p) => p.permissionKey))),
      catchError(() => of([])),
    );
  }
}
