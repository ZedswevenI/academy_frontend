import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { InvigilationPrintService } from '../invigilationPrint.service';

@Component({
  selector: 'app-invigilationview',
  standalone: false,
  templateUrl: './invigilationview.component.html',
  styleUrl: './invigilationview.component.scss'
})
export class InvigilationviewComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId') || '';
  record: any = null;
  loading = false;
  printLoading = false;

  constructor(private commonApi: CommonapiService, private alert: AlertService, private printSvc: InvigilationPrintService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      this.router.navigate(['/app/invigilation']);
      return;
    }
    this.loadRecord(id);
  }

  private loadRecord(id: string): void {
    this.loading = true;
    this.commonApi.fetchData({ entiId: this.tenantId }, 'invigi', `get/${id}`).subscribe({
      next: (res: any) => {
        this.record = res.data;
        this.loading = false;
      },
      error: () => {
        this.alert.error('Failed to load record');
        this.loading = false;
        this.router.navigate(['/invigilation']);
      }
    });
  }

  edit(): void {
    if (this.record) this.router.navigate(['/app/invigilation/edit', this.record._id]);
  }

  back(): void {
    this.router.navigate(['/app/invigilation']);
  }

  print(): void {
    if (!this.record || this.printLoading) return;
    this.printLoading = true;
    this.commonApi.fetchData({ entiId: this.tenantId }, 'invigi', `by-date/${this.record.examDate}`).subscribe({
      next: (res: any) => {
        this.printLoading = false;
        this.printSvc.print(res);
      },
      error: () => {
        this.printLoading = false;
        this.alert.error('Failed to load print data');
      }
    });
  }

  sessionLabel(s: string): string {
    const map: any = {
      MORNING: 'Morning',
      AFTERNOON: 'Afternoon',
      EVENING: 'Evening'
    };
    return map[s] || s;
  }

  fmtTime(t: string | null): string {
    if (!t) return '–';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  fmtRange(start: string | null, end: string | null): string {
    if (!start && !end) return '–';
    if (start && end) return `${this.fmtTime(start)} – ${this.fmtTime(end)}`;
    return this.fmtTime(start || end);
  }
}
