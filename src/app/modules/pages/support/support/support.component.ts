import { Component, OnInit } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';

@Component({
  selector: 'app-support',
  standalone: false,
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent implements OnInit {

  tenantId: any;
  loading = false;

  filterForm!: FormGroup;
  isProceed = false;

  dataArray: any[] = [];
  totalRecords = 0;

  // Last used pagination — kept in memory so modal actions reload same page
  private lastPage = 1;
  private lastLimit = 10;
  private lastSearch?: string;

  area_options = [
    { label: 'Fees', value: 'FEES' },
    { label: 'Timetable', value: 'TIMETABLE' },
    { label: 'PTM', value: 'PTM' },
    { label: 'Books and study', value: 'BOOKS_AND_STUDY' },
    { label: 'Examination', value: 'EXAMINATION' },
    { label: 'Academics', value: 'ACADEMICS' },
    { label: 'Tab', value: 'TAB' },
    { label: 'General', value: 'GENERAL' },
  ];

  status_options = [
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed', value: 'CLOSED' }
  ];

  priority_options = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Urgent', value: 'URGENT' }
  ];

  columnsArray = [
    { key: 'studentNo', label: 'Student No', sortable: false },
    { key: 'area', label: 'Area', sortable: false },
    { key: 'issueSubject', label: 'Issue', sortable: false },
    { key: 'priority', label: 'Priority', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'requestedAtFormatted', label: 'Raised On', sortable: false }
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.onView(row)
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-user-check',
      tooltip: 'Assign Staff',
      color: '#6B7280',
      hoverColor: '#16A34A',
      // disabled when ticket is CLOSED — grays out the icon in custom-table
      disabled: (row: any) => row.status === 'CLOSED',
      callback: (row: any) => {
        if (row.status === 'CLOSED') return;
        this.openAssignModal(row);
      },
      hidden: (row: any) => row.status.toUpperCase() === 'RESOLVED' || row.status.toUpperCase() === 'CLOSED'
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-flag',
      tooltip: 'Update Priority',
      color: '#6B7280',
      hoverColor: '#D97706',
      disabled: (row: any) => row.status === 'CLOSED',
      callback: (row: any) => {
        if (row.status === 'CLOSED') return;
        this.openPriorityModal(row);
      },
      hidden: (row: any) => row.status.toUpperCase() === 'RESOLVED' || row.status.toUpperCase() === 'CLOSED'
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-circle-check',
      tooltip: 'Update Status',
      color: '#6B7280',
      hoverColor: '#7C3AED',
      disabled: (row: any) => row.status === 'CLOSED',
      callback: (row: any) => {
        if (row.status === 'CLOSED') return;
        this.openStatusModal(row);
      },
      hidden: (row: any) => row.status.toUpperCase() === 'CLOSED'

    }
  ];

  // ── View ──────────────────────────────────────────────
  selectedTicket: any = null;

  // ── Assign modal ───────────────────────────────────────
  assignTicket: any = null;
  assignForm!: FormGroup;
  staffList: any[] = [];
  staffLoading = false;
  staffSearch = '';
  assignLoading = false;

  // ── Priority modal ─────────────────────────────────────
  priorityTicket: any = null;
  priorityForm!: FormGroup;
  priorityLoading = false;

  // ── Status modal ───────────────────────────────────────
  statusTicket: any = null;
  statusForm!: FormGroup;
  statusLoading = false;

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private commonApi: CommonapiService,
    private alert: AlertService
  ) {
    this.tenantId = localStorage.getItem('tenantId');
    this.breadcrump.set([{ label: 'Support Tickets' }]);
  }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      area: [''],
      status: ['']
    });

    this.assignForm = this.fb.group({
      assignedStaffId: ['', Validators.required]
    });

    this.priorityForm = this.fb.group({
      priority: ['', Validators.required]
    });

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      feedback: ['']
    });
  }

  // ====================================================
  // LIST
  // ====================================================

  onProceed(): void {
    if (this.filterForm.invalid) return;
    this.isProceed = true;
    this.fetchList(1, 10);
  }

  fetchList(page: number, limit: number, search?: string): void {
    // Persist so modal-triggered reloads use the same page/filters
    this.lastPage = page;
    this.lastLimit = limit;
    this.lastSearch = search;

    const { area, status } = this.filterForm.value;
    this.loading = true;

    let query = `list?page=${page}&limit=${limit}`;
    if (area) query += `&area=${area}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${search}`;

    this.commonApi.fetchData({ tenantId: this.tenantId }, 'institue/support', query)
      .subscribe({
        next: (res: any) => {
          this.dataArray = (res?.data || []).map((t: any) => ({
            ...t,
            requestedAtFormatted: this.formatDate(t.requestedAt)
          }));
          this.totalRecords = res?.count || this.dataArray.length;
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading tickets');
          this.loading = false;
        }
      });
  }

  loadTableData(req: { page: number; pageSize: number; search?: string }): void {
    this.fetchList(req.page, req.pageSize, req.search);
  }

  private reloadCurrentPage(): void {
    this.fetchList(this.lastPage, this.lastLimit, this.lastSearch);
  }

  // ====================================================
  // VIEW
  // ====================================================

  onView(row: any): void {
    this.selectedTicket = row;
    this.openModal('ticketViewModal');
  }

  // ====================================================
  // ASSIGN STAFF
  // ====================================================

  openAssignModal(row: any): void {
    this.assignTicket = row;
    this.staffList = [];
    this.staffSearch = '';
    this.assignForm.reset();
    this.openModal('ticketAssignModal');
  }

  searchStaff(): void {
    if (!this.staffSearch.trim()) return;
    this.staffLoading = true;

    this.commonApi.fetchData(
      { tenantId: this.tenantId }, 'ims/staff',
      `list?page=1&limit=10&search=${this.staffSearch.trim()}`
    ).subscribe({
      next: (res: any) => { this.staffList = res?.data || []; this.staffLoading = false; },
      error: () => { this.staffLoading = false; this.alert.error('Error searching staff'); }
    });
  }

  onStaffSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.searchStaff();
  }

  selectStaff(staff: any): void {
    this.assignForm.patchValue({ assignedStaffId: staff.staffId });
  }

  getSelectedStaffName(): string {
    const id = this.assignForm.get('assignedStaffId')?.value;
    const staff = this.staffList.find(s => s.staffId === id);
    return staff ? staff.staffName : '';
  }

  submitAssign(): void {
    if (this.assignForm.invalid) { this.alert.error('Please select a staff member'); return; }

    const payload = {
      tenantId: this.tenantId,
      ticketId: this.assignTicket.ticketId,
      assignedStaffId: this.assignForm.value.assignedStaffId
    };

    this.assignLoading = true;
    this.commonApi.fetchData(payload, 'institue/support', 'assign').subscribe({
      next: (res: any) => {
        this.assignLoading = false;
        if (res?.status) {
          this.alert.success('Ticket assigned successfully');
          this.closeModal('ticketAssignModal');
          this.reloadCurrentPage();
        }
      },
      error: () => { this.assignLoading = false; this.alert.error('Error assigning ticket'); }
    });
  }

  // ====================================================
  // PRIORITY UPDATE
  // ====================================================

  openPriorityModal(row: any): void {
    this.priorityTicket = row;
    this.priorityForm.patchValue({ priority: row.priority });
    this.openModal('ticketPriorityModal');
  }

  submitPriority(): void {
    if (this.priorityForm.invalid) return;

    const payload = {
      tenantId: this.tenantId,
      ticketId: this.priorityTicket.ticketId,
      priority: this.priorityForm.value.priority
    };

    this.priorityLoading = true;
    this.commonApi.fetchData(payload, 'institue/support/priority', 'update').subscribe({
      next: (res: any) => {
        this.priorityLoading = false;
        if (res?.status) {
          this.alert.success('Priority updated successfully');
          this.closeModal('ticketPriorityModal');
          this.reloadCurrentPage();
        }
      },
      error: () => { this.priorityLoading = false; this.alert.error('Error updating priority'); }
    });
  }

  // ====================================================
  // STATUS UPDATE
  // ====================================================

  openStatusModal(row: any): void {
    this.statusTicket = row;
    this.statusForm.patchValue({ status: row.status, feedback: row.feedback || '' });
    this.openModal('ticketStatusModal');
  }

  submitStatus(): void {
    if (this.statusForm.invalid) return;

    const payload = {
      tenantId: this.tenantId,
      ticketId: this.statusTicket.ticketId,
      status: this.statusForm.value.status,
      feedback: this.statusForm.value.feedback || ''
    };

    this.statusLoading = true;
    this.commonApi.fetchData(payload, 'institue/support/status', 'update').subscribe({
      next: (res: any) => {
        this.statusLoading = false;
        if (res?.status) {
          this.alert.success('Status updated successfully');
          this.closeModal('ticketStatusModal');
          this.reloadCurrentPage();
        }
      },
      error: () => { this.statusLoading = false; this.alert.error('Error updating status'); }
    });
  }

  // ====================================================
  // HELPERS
  // ====================================================

  getPriorityClass(priority: string): string {
    const map: any = { LOW: 'bg-secondary', MEDIUM: 'bg-info', HIGH: 'bg-warning', URGENT: 'bg-danger' };
    return map[priority] || 'bg-secondary';
  }

  getStatusClass(status: string): string {
    const map: any = { OPEN: 'bg-primary', IN_PROGRESS: 'bg-warning', RESOLVED: 'bg-success', CLOSED: 'bg-secondary' };
    return map[status] || 'bg-secondary';
  }

  private formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) new (window as any).bootstrap.Modal(el).show();
  }

  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }
}