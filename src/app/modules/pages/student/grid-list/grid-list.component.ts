import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';

@Component({
  selector: 'app-grid-list',
  standalone: false,
  templateUrl: './grid-list.component.html',
  styleUrl: './grid-list.component.scss',
})
export class GridListComponent implements OnInit {
  // In table-list / grid-list:
  @Input() hasSearched = false;
  @Input() filters: any = {};

  ngOnChanges(changes: SimpleChanges) {
    if (this.hasSearched) {
      this.page = 1;
      this.fetchStudents();
    }
  }
  private moduleName = 'student';
  entiId: any;

  loading = false;
  students: any[] = [];

  // ── Pagination ────────────────────────────────────────────────────────────
  page = 1;
  pageSize = 12;
  totalRecords = 0;
  totalPages = 0;

  // ── Search ────────────────────────────────────────────────────────────────
  searchTerm = '';
  private searchTimer: any;

  constructor(
    private breadcrump: BredcrumpService,
    private alert: AlertService,
    private commonApi: CommonapiService,
    private router: Router,
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Student' }]);
  }

  ngOnInit(): void {
    // this.fetchStudents();
  }

  fetchStudents() {
    this.loading = true;
    const params: any = { page: this.page, limit: this.pageSize };
    const search = this.searchTerm.trim() || this.filters?.search || '';
    if (search) params.search = search;
    if (this.filters?.programId) params.programId = this.filters.programId;
    if (this.filters?.centerId) params.centerId = this.filters.centerId;
    if (this.filters?.status && this.filters.status !== 'ALL')
      params.status = this.filters.status;
    const qs = Object.keys(params)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
    this.commonApi
      .fetchData({ entiId: this.entiId }, this.moduleName, `list?${qs}`)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          this.totalRecords = res?.count || 0;
          this.totalPages =
            res?.totalPages ||
            Math.ceil(this.totalRecords / this.pageSize) ||
            0;

          this.students = rows.map((s: any) => ({
            studentId: s.studentId,
            name: s.student?.name || '—',
            initials: this.getInitials(s.student?.name || ''),
            code: s.admissionNo || s.registrationNumber || '—',
            status: s.status || 'INACTIVE',
            course: s.programName || '—',
            center: s.centerName || '—',
            phone: s.student?.phone || '—',
            batch: s.batchCode || '—',
            academicYear: s.academicYear || '—',
          }));
        },
        error: () => this.alert.error('Failed to load students'),
      });
  }
  // ── Search with debounce ──────────────────────────────────────────────────
  onSearch(value: string) {
    this.searchTerm = value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page = 1;
      this.fetchStudents();
    }, 400);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.fetchStudents();
  }

  get pages(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    // show first, last, current ± 1, with ellipsis gaps
    const around = new Set(
      [1, total, this.page, this.page - 1, this.page + 1].filter(
        (p) => p >= 1 && p <= total,
      ),
    );
    return Array.from(around).sort((a, b) => a - b);
  }

  // ── Navigate ──────────────────────────────────────────────────────────────
  viewStudent(s: any) {
    this.router.navigate(['/app/student/view', s.studentId]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }
}
