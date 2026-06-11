import { Injectable } from '@angular/core';
import { CommonapiService } from '../commonapi/commonapi.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private module = 'dashboard';

  constructor(private common: CommonapiService) {}

  getSummary(payload: { entiId: string; period?: string }): Observable<any> {
    return this.common.fetchData(payload, this.module, 'summary');
  }

  // Individual endpoints if needed
  getKpis(payload: { entiId: string }): Observable<any> {
    return this.common.fetchData(payload, this.module, 'kpis');
  }
}
