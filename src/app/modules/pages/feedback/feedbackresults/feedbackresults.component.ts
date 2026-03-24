import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

@Component({
  selector: 'app-feedbackresults',
  standalone: false,
  templateUrl: './feedbackresults.component.html',
  styleUrl: './feedbackresults.component.scss',
})
export class FeedbackresultsComponent implements OnInit {
  loading = false;
  tenantId: any;
  results: any = null;
  batchResults: any[] = [];
  activeBatch: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
  ) {
    this.tenantId = localStorage.getItem('tenantId');
  }

  ngOnInit(): void {
    const formId = this.route.snapshot.paramMap.get('id');
    if (!formId) {
      this.router.navigate(['/app/feedback']);
      return;
    }
    this.fetchResults(formId);
  }

  // fetchResults(formId: string): void {
  //   this.loading = true;
  //   this.commonApi
  //     .fetchData({ tenantId: this.tenantId, formId }, 'feedback', 'results')
  //     .subscribe({
  //       next: (res: any) => {
  //         if (res?.status) {
  //           this.results = res.data;
  //           this.breadcrump.set([
  //             { label: 'Feedback', link: '/app/feedback' },
  //             { label: this.results.title },
  //           ]);
  //         }
  //         this.loading = false;
  //       },
  //       error: () => {
  //         this.alert.error('Error loading results');
  //         this.loading = false;
  //       },
  //     });
  // }

  fetchResults(formId: string): void {
    this.loading = true;
    this.commonApi
      .fetchData({ tenantId: this.tenantId, formId }, 'ims/feedback', 'results')
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.results = res.data;
            this.batchResults = res.data.batchResults || [];
            // Default to first batch
            this.activeBatch = this.batchResults[0]?.batchCode || '';
            this.breadcrump.set([
              { label: 'Feedback', link: '/app/feedback' },
              { label: this.results.title },
            ]);
          }
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading results');
          this.loading = false;
        },
      });
  }

  get activeBatchResult(): any {
    return (
      this.batchResults.find((b) => b.batchCode === this.activeBatch) || null
    );
  }

  getMaxCount(optionCounts: Record<string, number>): number {
    const values = Object.values(optionCounts) as number[];
    return Math.max(...values, 1);
  }

  getBarWidth(count: unknown, max: number): string {
    const n = Number(count);
    if (!Number.isFinite(n) || max <= 0) return '0%';
    return `${Math.round((n / max) * 100)}%`;
  }

  goBack(): void {
    this.router.navigate(['/app/feedback']);
  }

  asString(val: unknown): string {
    return String(val ?? '');
  }

  getOptionEntries(
    optionCounts: Record<string, number>,
  ): { key: string; value: number }[] {
    if (!optionCounts) return [];
    return Object.entries(optionCounts).map(([key, value]) => ({ key, value }));
  }
}
