import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-student-reports',
  standalone: false,
  templateUrl: './student-reports.component.html',
  styles: ``
})
export class StudentReportsComponent {
  readonly reports = [
    {
      key: 'attendance',
      label: 'Attendance',
      icon: 'fa-solid fa-clipboard-check',
      description: 'Period & school attendance with subject breakdown',
      path: 'attendance'
    },
    {
      key: 'remarks',
      label: 'Remarks',
      icon: 'fa-solid fa-comment-dots',
      description: 'Academic & behavioural remarks for students',
      path: 'remarks'
    },
    {
      key: 'late-entries',
      label: 'Late Entries',
      icon: 'fa-solid fa-clock',
      description: 'Late arrivals & early departures for students',
      path: 'late-entries'
    }
  ];
  selectedReport: any = null;

  constructor(private router: Router, private route: ActivatedRoute) {}

  selectReport(r: any): void {
    this.selectedReport = r;
    this.router.navigate([r.path], { relativeTo: this.route });
  }
  goBack(): void {
    this.selectedReport = null;
    this.router.navigate(['.'], { relativeTo: this.route });
  }
}
