// reportsnew.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { ReportService } from '../report.service';

type ReportTab = 'batch' | 'student' | 'teacher' | 'assignments';

@Component({
  selector: 'app-reportsnew',
  standalone: false,
  templateUrl: './reportsnew.component.html',
  styleUrl: './reportsnew.component.scss',
})
export class ReportsnewComponent implements OnInit {
  activeTab: ReportTab = 'batch';
  readonly tabs: {
    key: ReportTab;
    label: string;
    icon: string;
    path: string;
  }[] = [
    {
      key: 'batch',
      label: 'Batch',
      icon: 'fa-solid fa-building',
      path: 'batch',
    },
    {
      key: 'student',
      label: 'Student',
      icon: 'fa-solid fa-user-graduate',
      path: 'student',
    },
    {
      key: 'teacher',
      label: 'Teacher',
      icon: 'fa-solid fa-chalkboard-teacher',
      path: 'teacher',
    },
    {
      key: 'assignments',
      label: 'Assignments',
      icon: 'fa-solid fa-file-alt',
      path: 'assignments',
    },
  ];

  constructor(
    private breadcrumb: BredcrumpService,
    private reportService: ReportService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Reports' }]);
    this.reportService.loadBatches();
    this.reportService.loadStaff();
    this.syncTabFromUrl(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.syncTabFromUrl(e.urlAfterRedirects));
  }

  private syncTabFromUrl(url: string): void {
    const tab = this.tabs.find((t) => url.includes(`/reports/${t.path}`));
    if (tab) this.activeTab = tab.key;
  }

  switchTab(tab: (typeof this.tabs)[number]): void {
    this.activeTab = tab.key;
    this.router.navigate(['/app/reportnew', tab.path]);
  }
}
