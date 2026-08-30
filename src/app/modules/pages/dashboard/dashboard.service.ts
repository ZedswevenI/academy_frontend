// import { Injectable } from '@angular/core';
// import { Observable } from 'rxjs';
// import { CommonapiService } from '../../../service/commonapi/commonapi.service'; // adjust path to match your project

// @Injectable({ providedIn: 'root' })
// export class DashboardService {
//   private module = 'dashboard';

//   constructor(private api: CommonapiService) {}

//   getSummary(entiId: string, period: string = 'week'): Observable<any> {
//     return this.api.fetchData({ entiId, period }, this.module, 'summary');
//   }

//   getKpis(entiId: string): Observable<any> {
//     return this.api.fetchData({ entiId }, this.module, 'kpis');
//   }

//   getAttendanceTrend(entiId: string, period: string): Observable<any> {
//     return this.api.fetchData({ entiId, period }, this.module, 'attendance-trend');
//   }

//   getStudentsByProgram(entiId: string): Observable<any> {
//     return this.api.fetchData({ entiId }, this.module, 'students-by-program');
//   }

//   getBatchPerformance(entiId: string, limit = 8): Observable<any> {
//     return this.api.fetchData({ entiId, limit }, this.module, 'batch-performance');
//   }

//   getTopPerformers(entiId: string, limit = 5): Observable<any> {
//     return this.api.fetchData({ entiId, limit }, this.module, 'top-performers');
//   }

//   getInactiveUsers(entiId: string, days = 3, limit = 10): Observable<any> {
//     return this.api.fetchData({ entiId, days, limit }, this.module, 'inactive-users');
//   }

//   getUpcomingPtms(entiId: string, limit = 5): Observable<any> {
//     return this.api.fetchData({ entiId, limit }, this.module, 'upcoming-ptms');
//   }

//   getUpcomingActivities(entiId: string, limit = 5): Observable<any> {
//     return this.api.fetchData({ entiId, limit }, this.module, 'upcoming-activities');
//   }

//   getStaffByDepartment(entiId: string): Observable<any> {
//     return this.api.fetchData({ entiId }, this.module, 'staff-by-department');
//   }

//   getRecentUsers(entiId: string, limit = 5): Observable<any> {
//     return this.api.fetchData({ entiId, limit }, this.module, 'recent-users');
//   }
// }

import { Injectable } from '@angular/core';
import { CommonapiService } from '../../../service/commonapi/commonapi.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private module = 'dashboard';

  constructor(private api: CommonapiService) {}

  getSummary(entiId: string, period: string = 'week'): Observable<any> {
    return this.api.fetchData({ entiId, period }, this.module, 'summary');
  }

  getAttendanceTrend(entiId: string, period: string = 'week', attendanceType: 'school' | 'period' = 'school', batchCode: string = ''): Observable<any> {
    return this.api.fetchData({ entiId, period, attendanceType, batchCode }, this.module, 'attendance-trend');
  }

  updateSchoolAttendanceRemarks(entiId: string, attendanceId: string, studentId: string, remarks: string): Observable<any> {
    return this.api.fetchData({ entiId, attendanceId, studentId, remarks }, 'attendance', 'remarks/school');
  }

  updatePeriodAttendanceRemarks(entiId: string, attendanceId: string, studentId: string, remarks: string): Observable<any> {
    return this.api.fetchData({ entiId, attendanceId, studentId, remarks }, 'attendance', 'remarks/period');
  }

  getAbsenteeRangeReport(entiId: string, fromDate: number, toDate: number): Observable<any> {
    return this.api.fetchData({ entiId, fromDate, toDate }, 'batch', 'school-attendance/range-report');
  }
}
