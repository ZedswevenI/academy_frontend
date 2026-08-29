// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup } from '@angular/forms';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';

// interface SentLogRow {
//   id: string;
//   recipient: string;
//   admissionNo: string;
//   className: string;
//   batch: string;
//   templateName: string;
//   channel: 'email' | 'sms' | 'whatsapp';
//   status: 'sent' | 'delivered' | 'failed' | 'queued';
//   sentAt: number;
//   error?: string;
// }

// @Component({
//   selector: 'app-sent-logs',
//   standalone: false,
//   templateUrl: './sent-logs.component.html',
//   styleUrl: './sent-logs.component.scss'
// })
// export class SentLogsComponent implements OnInit {

//   loading = false;
//   totalRecords = 0;
//   dataArray: SentLogRow[] = [];
//   filterForm!: FormGroup;
//   showFilters = false;
//   channelOptions = [
//     { label: 'Email', value: 'email' },
//     { label: 'SMS', value: 'sms' },
//     { label: 'WhatsApp', value: 'whatsapp' }
//   ];
//   statusOptions = [
//     { label: 'Sent', value: 'sent' },
//     { label: 'Delivered', value: 'delivered' },
//     { label: 'Failed', value: 'failed' },
//     { label: 'Queued', value: 'queued' }
//   ];
//   columnsArray = [
//     { key: 'recipient', label: 'Recipient', sortable: true },
//     { key: 'admissionNo', label: 'Admission No', sortable: true },
//     { key: 'className', label: 'Class', sortable: false },
//     { key: 'batch', label: 'Batch', sortable: false },
//     { key: 'templateName', label: 'Template', sortable: false },
//     { key: 'channelDisplay', label: 'Channel', sortable: false },
//     { key: 'statusDisplay', label: 'Status', sortable: false },
//     { key: 'sentAtDisplay', label: 'Sent At', sortable: true }
//   ];
//   actions = [
//     {
//       type: 'icon',
//       icon: 'fa-regular fa-eye',
//       tooltip: 'View',
//       color: '#6B7280',
//       hoverColor: '#0066FF',
//       callback: (row: any) => this.viewRow(row)
//     }
//   ];
//   showDetailModal = false;
//   selectedLog: SentLogRow | null = null;

//   constructor(
//     private fb: FormBuilder,
//     private breadcrumb: BredcrumpService
//   ) {
//     this.breadcrumb.set([{ label: 'Communication', link: '/app/communication/send' }, { label: 'Sent Logs' }]);
//   }

//   ngOnInit(): void {
//     this.filterForm = this.fb.group({
//       search: [''],
//       channel: [''],
//       status: ['']
//     });
//     this.loadMockLogs();
//   }

//   private loadMockLogs(): void {
//     const now = Date.now();
//     const logs: SentLogRow[] = [
//       { id: 'l1', recipient: 'Arun Kumar',   admissionNo: 'ADM2024001', className: 'Class 10', batch: 'Batch A', templateName: 'Fee Reminder',      channel: 'email',    status: 'delivered', sentAt: now - 3600000 },
//       { id: 'l2', recipient: 'Priya Sharma', admissionNo: 'ADM2024002', className: 'Class 9',  batch: 'Batch B', templateName: 'Exam Schedule',     channel: 'whatsapp', status: 'sent',      sentAt: now - 7200000 },
//       { id: 'l3', recipient: 'Rahul Verma',  admissionNo: 'ADM2024003', className: 'Class 11', batch: 'Batch C', templateName: 'Attendance Alert',  channel: 'sms',      status: 'failed',    sentAt: now - 10800000, error: 'Invalid phone number' },
//       { id: 'l4', recipient: 'Sneha Patel',  admissionNo: 'ADM2024004', className: 'Class 8',  batch: 'Batch A', templateName: 'PTM Invitation',    channel: 'email',    status: 'delivered', sentAt: now - 14400000 },
//       { id: 'l5', recipient: 'Karthik R',    admissionNo: 'ADM2024005', className: 'Class 12', batch: 'Batch A', templateName: 'Result Published', channel: 'whatsapp', status: 'delivered', sentAt: now - 86400000 },
//       { id: 'l6', recipient: 'Meera Joshi',  admissionNo: 'ADM2024006', className: 'Class 7',  batch: 'Batch B', templateName: 'Fee Reminder',      channel: 'sms',      status: 'queued',    sentAt: now - 172800000 },
//       { id: 'l7', recipient: 'Aditya Singh', admissionNo: 'ADM2024007', className: 'Class 10', batch: 'Batch A', templateName: 'Exam Schedule',     channel: 'email',    status: 'sent',      sentAt: now - 259200000 },
//       { id: 'l8', recipient: 'Neha Gupta',   admissionNo: 'ADM2024008', className: 'Class 9',  batch: 'Batch B', templateName: 'Attendance Alert',  channel: 'whatsapp', status: 'delivered', sentAt: now - 345600000 }
//     ];

//     this.dataArray = logs.map(l => ({
//       ...l,
//       channelDisplay: this.formatChannel(l.channel),
//       statusDisplay: this.formatStatus(l.status),
//       sentAtDisplay: this.formatDate(l.sentAt)
//     })) as any[];

//     this.totalRecords = this.dataArray.length;
//   }

//   formatChannel(ch: string): string {
//     return ch.charAt(0).toUpperCase() + ch.slice(1);
//   }

//   formatStatus(s: string): string {
//     return s.charAt(0).toUpperCase() + s.slice(1);
//   }

//   formatDate(ts: number): string {
//     if (!ts) return '-';
//     return new Date(ts).toLocaleString('en-IN', {
//       day: '2-digit', month: 'short', year: 'numeric',
//       hour: '2-digit', minute: '2-digit', hour12: true
//     });
//   }

//   toggleFilters(): void { this.showFilters = !this.showFilters; }

//   applyFilters(): void {
//     this.loadMockLogs();
//   }

//   clearFilters(): void {
//     this.filterForm.reset({ search: '', channel: '', status: '' });
//     this.loadMockLogs();
//   }

//   viewRow(row: any): void {
//     this.selectedLog = row;
//     this.showDetailModal = true;
//   }

//   closeDetailModal(): void {
//     this.showDetailModal = false;
//     this.selectedLog = null;
//   }
// }

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Router } from '@angular/router';
import { PermissionService } from '../../../../shared/permission.service';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();

interface SentLogRow {
  id: string;
  logId: string;
  campaignId: string;
  recipient: string;
  recipientEmail: string;
  admissionNo: string;
  className: string;
  batch: string;
  templateName: string;
  channel: 'email' | 'sms' | 'whatsapp';
  status: 'sent' | 'delivered' | 'failed' | 'queued' | 'skipped';
  sentAt: number;
  error?: string;
  subject?: string;
  body?: string;
  providerMessageId?: string;
  retries?: number;
}

@Component({
  selector: 'app-sent-logs',
  standalone: false,
  templateUrl: './sent-logs.component.html',
  styleUrl: './sent-logs.component.scss',
})
export class SentLogsComponent implements OnInit {
  loading = false;
  totalRecords = 0;
  dataArray: any[] = [];
  filterForm!: FormGroup;
  showFilters = false;
  entiId: any;

  page = 1;
  limit = 20;
  search = '';

  channelOptions = [
    { label: 'All', value: '' },
    { label: 'Email', value: 'email' },
  ];

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Sent', value: 'SENT' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Queued', value: 'QUEUED' },
    { label: 'Skipped', value: 'SKIPPED' },
  ];

  columnsArray = [
    { key: 'recipient', label: 'Recipient', sortable: true },
    { key: 'recipientEmail', label: 'Email', sortable: false },
    { key: 'admissionNo', label: 'Admission No', sortable: true },
    { key: 'className', label: 'Class', sortable: false },
    { key: 'batch', label: 'Batch', sortable: false },
    { key: 'templateName', label: 'Template', sortable: false },
    { key: 'channelDisplay', label: 'Channel', sortable: false },
    { key: 'statusDisplay', label: 'Status', sortable: false },
    { key: 'sentAtDisplay', label: 'Sent At', sortable: true },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      show: () => !this.permissionService.hasPermission('communicationLog:view'),
      callback: (row: any) => this.viewRow(row),
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-rotate-right',
      tooltip: 'Retry',
      color: '#DC2626',
      hoverColor: '#991B1B',
      show: (row: any) => row.status !== 'failed' || !this.permissionService.hasPermission('communicationLog:retry'),
      callback: (row: any) => this.retryLog(row),
    },
  ];

  showDetailModal = false;
  selectedLog: SentLogRow | null = null;

  constructor(
    private fb: FormBuilder,
    private breadcrumb: BredcrumpService,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private router: Router,
    private permissionService: PermissionService
  ) {
    this.entiId = localStorage.getItem('tenantId');
    this.breadcrumb.set([
      { label: 'Communication', link: '/app/communication/send' },
      { label: 'Sent Logs' },
    ]);
  }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      search: [''],
      channel: [''],
      status: [''],
    });

    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;

    const v = this.filterForm?.getRawValue?.() || {};

    const query: string[] = [
      `page=${this.page}`,
      `limit=${this.limit}`,
    ];

    if (safeTrim(v.status)) query.push(`status=${encodeURIComponent(safeTrim(v.status))}`);
    if (safeTrim(v.channel)) query.push(`channel=${encodeURIComponent(safeTrim(v.channel))}`);
    if (safeTrim(v.search)) query.push(`search=${encodeURIComponent(safeTrim(v.search))}`);

    this.commonApi
      .fetchData(
        { entiId: this.entiId },
        'communication',
        `logs/list?${query.join('&')}`,
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          const rows = res?.data?.rows || [];
          this.totalRecords = Number(res?.data?.total || rows.length || 0);

          this.dataArray = rows.map((x: any) => this.mapLogRow(x));
        },
        error: (err: any) => {
          this.loading = false;
          this.dataArray = [];
          this.totalRecords = 0;
          this.alert.error(err?.error?.message || 'Failed to load logs');
        },
      });
  }

  private mapLogRow(x: any): SentLogRow {
    const status = safeTrim(x?.status).toLowerCase() as any;
    const channel = safeTrim(x?.channel || 'email').toLowerCase() as any;

    const row: SentLogRow = {
      id: safeTrim(x?.logId),
      logId: safeTrim(x?.logId),
      campaignId: safeTrim(x?.campaignId),
      recipient: safeTrim(x?.studentName || x?.parentName || x?.recipientEmail || '-'),
      recipientEmail: safeTrim(x?.recipientEmail || '-'),
      admissionNo: safeTrim(x?.admissionNo || '-'),
      className: x?.classNo ? `Class ${x.classNo}` : '-',
      batch: safeTrim(x?.batchCode || '-'),
      templateName: safeTrim(x?.templateName || '-'),
      channel,
      status,
      sentAt: Number(x?.sentAt || x?.queuedAt || 0),
      error: safeTrim(x?.error || ''),
      subject: x?.subject || '',
      body: x?.body || '',
      providerMessageId: safeTrim(x?.providerMessageId || ''),
      retries: Number(x?.retries || 0),
    };

    return {
      ...row,
      channelDisplay: this.formatChannel(row.channel),
      statusDisplay: this.formatStatus(row.status),
      sentAtDisplay: this.formatDate(row.sentAt),
    } as any;
  }

  formatChannel(ch: string): string {
    const v = safeTrim(ch);
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : '-';
  }

  formatStatus(s: string): string {
    const v = safeTrim(s);
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : '-';
  }

  formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  applyFilters(): void {
    this.page = 1;
    this.loadLogs();
  }

  clearFilters(): void {
    this.filterForm.reset({ search: '', channel: '', status: '' });
    this.page = 1;
    this.loadLogs();
  }

  viewRow(row: any): void {
    if (!this.permissionService.hasPermission('communicationLog:view')) return;
    this.selectedLog = row;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedLog = null;
  }

  retryLog(row: any): void {
    if (!row?.logId) {
      this.alert.error('Log ID missing');
      return;
    }

    this.loading = true;
    this.commonApi
      .fetchData(
        {
          entiId: this.entiId,
          logId: row.logId,
        },
        'communication',
        'logs/retry',
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.alert.success(res?.message || 'Retry queued');
          this.loadLogs();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Retry failed');
        },
      });
  }

  onRowSelected(row: any) {
    // custom-table's (rowClick) bypasses the View icon's `show` gate — guard here too.
    if (!this.permissionService.hasPermission('communicationLog:view')) return;
    this.selectedLog = row;
    this.showDetailModal = true;
  }

}