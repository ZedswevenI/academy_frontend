import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BackNavigationService } from '../../../../service/navigation/back-navigation.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-circular-view',
  standalone: false,
  templateUrl: './circular-view.component.html',
  styleUrl: './circular-view.component.scss'
})
export class CircularViewComponent implements OnInit {

  tenantId = localStorage.getItem('tenantId') || '';

  circular: any = null;

  // Read list
  readList: any[] = [];
  totalRecords = 0;
  loading = false;
  exportLoading = false;

  columnsArray = [
    { key: 'studentName', label: 'Student Name', sortable: false },
    { key: 'studentNo', label: 'Student No', sortable: false },
    { key: 'batchLabel', label: 'Batch', sortable: false },
    { key: 'centerCode', label: 'Center', sortable: false },
    { key: 'readAtFormatted', label: 'Read At', sortable: false },
  ];

  constructor(
    private router: Router,
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private backNav: BackNavigationService
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state?.['circular'];

    if (state) {
      this.circular = state;
    } else {
      // fallback on refresh
      const h: any = history.state;
      this.circular = h?.circular || null;
    }

    if (this.circular) {
      this.breadcrumb.set([
        { label: 'Circular', link: '/app/circular' },
        { label: 'View' }
      ]);
    } else {
      this.router.navigate(['/app/circular']);
    }
  }

  ngOnInit(): void {
    if (this.circular?.circularId) {
      this.fetchReadList({ page: 1, pageSize: 10 });
    }
  }

  // ====================================================
  // READ LIST
  // ====================================================

  fetchReadList(params: any): void {
    this.loading = true;

    let query = `getRead/list?page=${params.page}&limit=${params.pageSize}&circularId=${this.circular.circularId}`;
    if (params.search) query += `&search=${encodeURIComponent(params.search)}`;

    this.commonApi.fetchData({ tenantId: this.tenantId }, 'institue/circular', query)
      .subscribe({
        next: (res: any) => {
          this.readList = (res?.data || []).map((r: any) => ({
            ...r,
            batchLabel: this.combineBatchLabel(r.batchCode, r.batchName),
            readAtFormatted: this.formatTimestamp(r.readAt)
          }));
          this.totalRecords = res?.count || 0;
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading read list');
          this.loading = false;
        }
      });
  }

  // ====================================================
  // EXPORT
  // ====================================================

  exportToExcel(): void {
    if (this.exportLoading) return;
    this.exportLoading = true;

    const query = `getRead/list?list=full&circularId=${this.circular.circularId}`;

    this.commonApi.fetchData({ tenantId: this.tenantId }, 'institue/circular', query)
      .subscribe({
        next: (res: any) => {
          const data: any[] = res?.data || [];
          if (!data.length) {
            this.alert.error('No read data to export');
            this.exportLoading = false;
            return;
          }

          const rows = data.map((r: any, i: number) => ({
            'S.No': i + 1,
            'Student Name': r.studentName || '-',
            'Student No': r.studentNo || '-',
            'Batch': this.combineBatchLabel(r.batchCode, r.batchName),
            'Center': r.centerCode || '-',
            'Read At': this.formatTimestamp(r.readAt)
          }));

          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Read List');
          XLSX.writeFile(wb, `Circular_ReadList_${this.circular.subject || this.circular.circularId}.xlsx`);
          this.exportLoading = false;
        },
        error: () => {
          this.alert.error('Error exporting');
          this.exportLoading = false;
        }
      });
  }

  // ====================================================
  // HELPERS
  // ====================================================

  // For Unix ms timestamps (readAt, publishedAt)
  formatTimestamp(value: any): string {
    if (!value) return '-';
    const d = new Date(Number(value));
    if (isNaN(d.getTime())) return '-';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // For ISO date strings (createdAt, updatedAt)
  formatISODate(value: any): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // `getRead/list` rows are always single-valued per batch (no comma-list
  // concern here, unlike institue/circular/list).
  combineBatchLabel(batchCode: string, batchName: string): string {
    if (!batchCode) return '-';
    return batchName ? `${batchName} (${batchCode})` : batchCode;
  }

  getCenterCodes(): string[] {
    const val = this.circular?.centerCode;
    if (!val) return [];
    return typeof val === 'string'
      ? val.split(',').map((c: string) => c.trim()).filter(Boolean)
      : Array.isArray(val) ? val : [val];
  }

  getBatchCodes(): string[] {
    const val = this.circular?.batchCode;
    if (!val) return [];
    return typeof val === 'string'
      ? val.split(',').map((b: string) => b.trim()).filter(Boolean)
      : Array.isArray(val) ? val : [val];
  }

  getScopeBadgeClass(scope: string): string {
    switch (scope) {
      case 'INSTITUTE': return 'bg-primary';
      case 'CENTER': return 'bg-warning text-dark';
      case 'BATCH': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'bg-success';
      case 'DRAFT': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'HOLIDAY': return 'bg-info text-dark';
      case 'EXAM': return 'bg-danger';
      case 'EVENT': return 'bg-purple';
      case 'FEE': return 'bg-warning text-dark';
      case 'GENERAL': return 'bg-secondary';
      case 'ANNOUNCEMENT': return 'bg-primary';
      default: return 'bg-secondary';
    }
  }

  goBack(): void {
    this.backNav.goBack({ route: '/app/circular' });
  }

  downloadFile(url: string): void {
    this.commonApi.downloadByUrl({ url }, 'ims', 'download').subscribe({
      next: (res: any) => {
        const fileName = url.split('/').pop() || 'download';
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(res);
        a.href = objectUrl;
        a.download = fileName;
        a.click();
      },
      error: () => this.alert.error('Error downloading file')
    });
  }

}