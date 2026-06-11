import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-assignment-reports',
  standalone: false,
  templateUrl: './assignment-reports.component.html',
  styles: ``
})
export class AssignmentReportsComponent {
  readonly reports = [
    {
      key: 'report',
      label: 'Assignment Report',
      icon: 'fa-solid fa-file-alt',
      description: 'Batch-wise and student-wise assignment scores with SGPA/GSGPA',
      path: 'report'
    },
    {
      key: 'slash',
      label: 'Slash Report',
      icon: 'fa-solid fa-chart-pie',
      description: 'Assignment completion per student per topic (Available/Completed/Not Completed)',
      path: 'slash'
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
