// batch-reports.component.ts
import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

interface ReportCard {
  key: string;
  label: string;
  icon: string;
  description: string;
  path: string;
}

@Component({
  selector: 'app-batch-reports',
  standalone: false,
  templateUrl: './batch-reports.component.html',
  styles: ``
})
export class BatchReportsComponent {
  readonly reports: ReportCard[] = [
    {
      key: 'batch-info',
      label: 'Batch Details',
      icon: 'fa-solid fa-building',
      description: 'Overview of all batches with student & staff counts',
      path: 'info'
    },
    {
      key: 'batch-students',
      label: 'Student List',
      icon: 'fa-solid fa-users',
      description: 'Students enrolled in selected batches',
      path: 'students'
    },
    {
      key: 'batch-staff',
      label: 'Staff List',
      icon: 'fa-solid fa-chalkboard-teacher',
      description: 'Teaching staff assigned to batches',
      path: 'staff'
    },
    {
      key: 'batch-timetable',
      label: 'Timetable',
      icon: 'fa-solid fa-calendar-week',
      description: 'Daily timetable with periods & subjects',
      path: 'timetable'
    },
    {
      key: 'batch-late-entries',
      label: 'Late Entries',
      icon: 'fa-solid fa-clock',
      description: 'Late arrivals & early departures in a batch',
      path: 'late-entries'
    },
    {
      key: 'batch-phase-allotment',
      label: 'Phase Allotment',
      icon: 'fa-solid fa-tasks',
      description: 'Subject phase plan progress & allotment',
      path: 'phase-allotment'
    },
    {
      key: 'batch-subject-hours',
      label: 'Subject Hours',
      icon: 'fa-solid fa-hourglass-half',
      description: 'Hours allotted per subject per phase in a batch',
      path: 'subject-hours'
    },
    {
      key: 'batch-exams',
      label: 'Exams',
      icon: 'fa-solid fa-graduation-cap',
      description: 'Mock exam completion status per batch',
      path: 'exams'
    },
    {
      key: 'batch-feedback',
      label: 'PTM Feedback',
      icon: 'fa-solid fa-comments',
      description: 'PTM feedback & remarks summary',
      path: 'feedback'
    },
    {
      key: 'batch-ptm',
      label: 'PTM Sessions',
      icon: 'fa-solid fa-handshake',
      description: 'PTM session-level completion report',
      path: 'ptm'
    }
  ];

  selectedReport: ReportCard | null = null;

  constructor(private router: Router, private route: ActivatedRoute) {}

  selectReport(report: ReportCard): void {
    this.selectedReport = report;
    this.router.navigate([report.path], { relativeTo: this.route });
  }

  goBack(): void {
    this.selectedReport = null;
    this.router.navigate(['.'], { relativeTo: this.route });
  }
}
