import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-teacher-reports',
  standalone: false,
  templateUrl: './teacher-reports.component.html',
  styles: ``
})
export class TeacherReportsComponent {
  readonly reports = [
    {
      key: 'faculty-report',
      label: 'Faculty Report',
      icon: 'fa-solid fa-user-tie',
      description: 'Comprehensive faculty report with all sections',
      path: 'faculty-report'
    },
    {
      key: 'faculty-load',
      label: 'Faculty Load',
      icon: 'fa-solid fa-weight-hanging',
      description: 'Scheduled, cancelled & replaced periods per staff per subject',
      path: 'faculty-load'
    },
    {
      key: 'batches',
      label: 'Batches',
      icon: 'fa-solid fa-layer-group',
      description: 'Batches assigned to a teacher',
      path: 'batches'
    },
    {
      key: 'tasks',
      label: 'Tasks',
      icon: 'fa-solid fa-list-check',
      description: 'Task completion & delay report for a teacher',
      path: 'tasks'
    },
    {
      key: 'late-entries',
      label: 'Late Entries',
      icon: 'fa-solid fa-clock',
      description: 'Late entry records for teachers',
      path: 'late-entries'
    },
    {
      key: 'early-leaving',
      label: 'Early Leaving',
      icon: 'fa-solid fa-right-from-bracket',
      description: 'Early leaving records for teachers',
      path: 'early-leaving'
    },
    {
      key: 'assignments',
      label: 'Assignments',
      icon: 'fa-solid fa-file-alt',
      description: 'Assignments created & student completion rates',
      path: 'assignments'
    },
    {
      key: 'attendance',
      label: 'Attendance Marking',
      icon: 'fa-solid fa-clipboard-check',
      description: 'Period-level attendance marking report',
      path: 'attendance'
    },
    {
      key: 'feedback',
      label: 'PTM Feedback',
      icon: 'fa-solid fa-comments',
      description: 'PTM feedback given by a teacher',
      path: 'feedback'
    },
    {
      key: 'exams',
      label: 'Exams',
      icon: 'fa-solid fa-graduation-cap',
      description: 'Exams managed by a teacher with batch breakdown',
      path: 'exams'
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
