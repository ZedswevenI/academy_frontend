import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CommonapiService } from '../commonapi/commonapi.service';
import { AuthService } from '../auth/auth.service';

export interface CenterOption {
  centerId: string;
  centerName: string;
  centerCode: string;
}

/** Sentinel value for "All Centers" — never a real center id, never written to the cache CommonapiService gates on. */
export const ALL_CENTERS_ID = '__ALL__';
const ALL_CENTERS_OPTION: CenterOption = {
  centerId: ALL_CENTERS_ID,
  centerName: 'All Centers',
  centerCode: '',
};

@Injectable({ providedIn: 'root' })
export class CenterContextService {
  /** Real centers only — this is what CommonapiService's cache/gate is built from. */
  private accessibleCentersSubject = new BehaviorSubject<CenterOption[]>([]);
  accessibleCenters$ = this.accessibleCentersSubject.asObservable();

  /** Real centers plus a synthetic "All Centers" entry when there's more than one accessible center — this is what the UI dropdowns should render. */
  private uiCenterOptionsSubject = new BehaviorSubject<CenterOption[]>([]);
  uiCenterOptions$ = this.uiCenterOptionsSubject.asObservable();

  private selectedCenterSubject = new BehaviorSubject<CenterOption | null>(null);
  selectedCenter$ = this.selectedCenterSubject.asObservable();

  /** True when the user has more than one accessible center and hasn't picked one (or "All") yet — app usage/API calls must be blocked until they do. */
  private needsSelectionSubject = new BehaviorSubject<boolean>(false);
  needsSelection$ = this.needsSelectionSubject.asObservable();

  /** True when the user has zero accessible centers — a hard-stop misconfiguration. */
  private noCentersAvailableSubject = new BehaviorSubject<boolean>(false);
  noCentersAvailable$ = this.noCentersAvailableSubject.asObservable();

  private loaded = false;
  private unrestrictedAccess = false;

  constructor(
    private commonApi: CommonapiService,
    private authService: AuthService,
  ) {}

  private normalize(raw: any): CenterOption {
    return {
      centerId: raw.centerId || raw._id || raw.recId || '',
      centerName: raw.centerName || raw.name || '',
      centerCode: raw.centerCode || raw.code || '',
    };
  }

  private matchesAccess(center: CenterOption, access: any[]): boolean {
    return access.some((a) => {
      const accessId = typeof a === 'string' ? a : a?.centerId || a?._id || a?.recId;
      return accessId === center.centerId;
    });
  }

  /** Loads the full center list and narrows it to what the logged-in user can access. Call once after login/app load. */
  init(force = false): void {
    if (this.loaded && !force) return;
    this.loaded = true;

    const tenantId = localStorage.getItem('tenantId') || '';
    this.commonApi
      .fetchData({ entiId: tenantId }, 'ims/center', 'list?list=full')
      .subscribe({
        next: (res: any) => {
          const allCenters: CenterOption[] = (res?.data || []).map((c: any) =>
            this.normalize(c),
          );
          const access = this.authService.getCentersAccess();
          this.unrestrictedAccess = access.length === 0;
          const accessible = this.unrestrictedAccess
            ? allCenters
            : allCenters.filter((c) => this.matchesAccess(c, access));

          this.accessibleCentersSubject.next(accessible);
          this.authService.setAccessibleCentersCache(accessible);

          const offersAll = accessible.length > 1;
          this.uiCenterOptionsSubject.next(
            offersAll ? [ALL_CENTERS_OPTION, ...accessible] : accessible,
          );

          if (accessible.length === 0) {
            this.noCentersAvailableSubject.next(true);
            this.needsSelectionSubject.next(false);
            this.selectedCenterSubject.next(null);
            return;
          }
          this.noCentersAvailableSubject.next(false);

          if (accessible.length === 1) {
            this.selectedCenterSubject.next(accessible[0]);
            this.authService.setSelectedCenterId(accessible[0].centerId);
            this.needsSelectionSubject.next(false);
            return;
          }

          const savedId = this.authService.getSelectedCenterId();
          const restored = accessible.find((c) => c.centerId === savedId);
          if (savedId === ALL_CENTERS_ID && offersAll) {
            this.selectedCenterSubject.next(ALL_CENTERS_OPTION);
          } else if (restored) {
            this.selectedCenterSubject.next(restored);
          } else {
            // No prior selection — default to "All Centers" rather than forcing
            // the user to pick one; they can narrow it down via the header edit button.
            this.selectedCenterSubject.next(ALL_CENTERS_OPTION);
            this.authService.setSelectedCenterId(ALL_CENTERS_ID);
          }
          this.needsSelectionSubject.next(false);
        },
        error: () => {
          this.loaded = false;
        },
      });
  }

  setSelectedCenter(centerId: string): void {
    if (centerId === ALL_CENTERS_ID) {
      this.selectedCenterSubject.next(ALL_CENTERS_OPTION);
      this.authService.setSelectedCenterId(ALL_CENTERS_ID);
      this.needsSelectionSubject.next(false);
      return;
    }
    const center = this.accessibleCentersSubject.value.find(
      (c) => c.centerId === centerId,
    );
    if (!center) return;
    this.selectedCenterSubject.next(center);
    this.authService.setSelectedCenterId(center.centerId);
    this.needsSelectionSubject.next(false);
  }

  reset(): void {
    this.loaded = false;
    this.unrestrictedAccess = false;
    this.accessibleCentersSubject.next([]);
    this.uiCenterOptionsSubject.next([]);
    this.selectedCenterSubject.next(null);
    this.needsSelectionSubject.next(false);
    this.noCentersAvailableSubject.next(false);
    this.authService.setAccessibleCentersCache([]);
  }
}
