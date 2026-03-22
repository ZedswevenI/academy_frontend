import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-ptmview',
  standalone: false,
  templateUrl: './ptmview.component.html',
  styleUrl: './ptmview.component.scss',
})
export class PtmviewComponent implements OnInit {
  loading = false;
  tenantId: any;
  session: any = null;
  dataArray: any[] = [];
  totalRecords = 0;
  masterPostFeedback = false;
  masterToggling = false;
  selectedStudent: any = null;
  staffRemarks = '';
  staffStatus = '';
  staffSaving = false;
  status_options = [
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'No Show', value: 'NO_SHOW' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];
  questionStudent: any = null;
  questionsLoading = false;
  questionsPtmData: any = null;
  activeTab = 'pre';
  importLoading = false;
  parsedRows: any[] = [];
  errorRows: any[] = [];
  fileName = '';
  feedbackColumnMap: { [key: string]: string } = {
    'Admission No': 'admissionNo',
    'Staff Remarks': 'staffRemarks',
    Status: 'status',
  };
  feedbackRequiredColumns = Object.keys(this.feedbackColumnMap);
  feedbackPreviewColumns = [
    { field: 'admissionNo', header: 'Admission No' },
    { field: 'staffRemarks', header: 'Staff Remarks' },
    { field: 'status', header: 'Status' },
  ];
  columnsArray = [
    { key: 'studentName', label: 'Student Name', sortable: false },
    { key: 'admissionNo', label: 'Admission No', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'preFeedbackStatus', label: 'Pre Feedback', sortable: false },
    { key: 'postFeedbackStatus', label: 'Post Feedback', sortable: false },
    { key: 'postPtmEnabled', label: 'Post Enabled', sortable: false },
    { key: 'staffRemarks', label: 'Staff Remarks', sortable: false },
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-comment-dots',
      tooltip: 'Staff Feedback',
      color: '#6B7280',
      hoverColor: '#16A34A',
      callback: (row: any) => this.openStaffFeedbackModal(row),
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-rectangle-list',
      tooltip: 'View Questions',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.openQuestionsModal(row),
    },
  ];

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
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/app/ptm']);
      return;
    }

    try {
      this.session = JSON.parse(atob(id));
    } catch {
      this.router.navigate(['/app/ptm']);
      return;
    }

    this.breadcrump.set([
      { label: 'PTM', link: '/app/ptm' },
      { label: `${this.session.batchCode} — ${this.session.ptmDateFormatted}` },
    ]);

    this.fetchStudents(1, 10);
  }

  // ====================================================
  // FETCH STUDENTS
  // ====================================================
  fetchStudents(page: number, limit: number, search?: string): void {
    if (!this.session) return;
    this.loading = true;
    const body: any = { tenantId: this.tenantId };
    let query = `liststudents?page=${page}&limit=${limit}`;
    query += `&batchCode=${this.session.batchCode}`;
    query += `&ptmDate=${this.session.ptmDate}`;
    query += `&startTime=${this.session.startTime}`;
    if (search) query += `&search=${search}`;
    this.commonApi.fetchData(body, 'ims/ptm', query).subscribe({
      next: (res: any) => {
        const raw: any[] = res?.data || [];
        this.dataArray = raw.map((p: any) => ({
          ...p,
          preFeedbackStatus: p.prePtmSubmittedAt ? 'Submitted' : 'Pending',
          postFeedbackStatus: p.postPtmSubmittedAt ? 'Submitted' : 'Pending',
          postPtmEnabled: p.enablePostPtmFeedback ? 'Yes' : 'No',
        }));
        this.totalRecords = res?.count || this.dataArray.length;
        // Derive master toggle state — true only if ALL students have it enabled
        this.masterPostFeedback =
          this.dataArray.length > 0 &&
          this.dataArray.every((s) => s.enablePostPtmFeedback);
        this.loading = false;
      },
      error: () => {
        this.alert.error('Error loading students');
        this.loading = false;
      },
    });
  }

  loadTableData(req: {
    page: number;
    pageSize: number;
    search?: string;
  }): void {
    this.fetchStudents(req.page, req.pageSize, req.search);
  }

  onMasterToggle(enabled: boolean): void {
    this.masterPostFeedback = enabled;
    this.masterToggling = true;
    const ptmIds = this.dataArray.map((s) => s.ptmId);
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, ptmIds, enablePostPtmFeedback: enabled },
        'ims/ptm',
        'togglepostfeedback',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.dataArray = this.dataArray.map((s) => ({
              ...s,
              enablePostPtmFeedback: enabled,
              postPtmEnabled: enabled ? 'Yes' : 'No',
            }));
            this.alert.success(
              `Post-PTM feedback ${enabled ? 'enabled' : 'disabled'} for all students`,
            );
          }
          this.masterToggling = false;
        },
        error: () => {
          this.alert.error('Error updating post-PTM feedback');
          this.masterToggling = false;
          this.masterPostFeedback = !enabled;
        },
      });
  }

  onStudentToggle(row: any, enabled: boolean): void {
    const prev = row.enablePostPtmFeedback;
    row.enablePostPtmFeedback = enabled;
    row.postPtmEnabled = enabled ? 'Yes' : 'No';
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          ptmIds: [row.ptmId],
          enablePostPtmFeedback: enabled,
        },
        'ims/ptm',
        'togglepostfeedback',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success(
              `Post-PTM feedback ${enabled ? 'enabled' : 'disabled'} for ${row.studentName}`,
            );
            this.masterPostFeedback = this.dataArray.every(
              (s) => s.enablePostPtmFeedback,
            );
          } else {
            row.enablePostPtmFeedback = prev;
            row.postPtmEnabled = prev ? 'Yes' : 'No';
          }
        },
        error: () => {
          row.enablePostPtmFeedback = prev;
          row.postPtmEnabled = prev ? 'Yes' : 'No';
          this.alert.error('Error updating student');
        },
      });
  }

  openStaffFeedbackModal(row: any): void {
    this.selectedStudent = row;
    this.staffRemarks = row.staffRemarks || '';
    this.staffStatus = row.status || '';
    this.staffSaving = false;
    this.openModal('staffFeedbackModal');
  }

  saveStaffFeedback(): void {
    if (!this.selectedStudent) return;
    if (!this.staffStatus) {
      this.alert.error('Please select a status');
      return;
    }
    this.staffSaving = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          ptmId: this.selectedStudent.ptmId,
          staffRemarks: this.staffRemarks,
          status: this.staffStatus,
          userId: localStorage.getItem('userId'),
        },
        'ims/ptm',
        'staff/feedback',
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.alert.success('Staff feedback saved');
            const idx = this.dataArray.findIndex(
              (s) => s.ptmId === this.selectedStudent.ptmId,
            );
            if (idx > -1) {
              this.dataArray[idx].staffRemarks = this.staffRemarks;
              this.dataArray[idx].status = this.staffStatus;
            }
            this.closeModal('staffFeedbackModal');
          }
          this.staffSaving = false;
        },
        error: () => {
          this.alert.error('Error saving staff feedback');
          this.staffSaving = false;
        },
      });
  }

  openQuestionsModal(row: any): void {
    this.questionStudent = row;
    this.questionsPtmData = null;
    this.activeTab = 'pre';
    this.questionsLoading = true;
    this.openModal('questionsModal');
    this.commonApi
      .fetchData(
        { tenantId: this.tenantId, ptmId: row.ptmId },
        'ims/ptm',
        'view',
      )
      .subscribe({
        next: (res: any) => {
          this.questionsPtmData = res?.data || null;
          this.questionsLoading = false;
        },
        error: () => {
          this.alert.error('Error loading PTM details');
          this.questionsLoading = false;
        },
      });
  }

  formatFieldValue(q: any): string {
    if (q.fieldValue === null || q.fieldValue === undefined)
      return 'Not answered';
    if (Array.isArray(q.fieldValue)) return q.fieldValue.join(', ');
    return String(q.fieldValue);
  }

  isAnswered(q: any): boolean {
    return q.fieldValue !== null && q.fieldValue !== undefined;
  }

  openFeedbackImportModal(): void {
    this.resetImport();
    this.openModal('feedbackImportModal');
  }

  resetImport(): void {
    this.fileName = '';
    this.parsedRows = [];
    this.errorRows = [];
    this.importLoading = false;
  }

  onFeedbackFileSelected(files: File[]): void {
    const file = files?.[0];
    if (file) this.processFeedbackFile(file);
  }

  private processFeedbackFile(file: File): void {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      this.alert.error('Only .xlsx, .xls or .csv files are allowed');
      return;
    }
    this.fileName = file.name;
    this.parsedRows = [];
    this.errorRows = [];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) {
          this.alert.error('File is empty');
          this.fileName = '';
          return;
        }
        const missing = this.feedbackRequiredColumns.filter(
          (c) => !Object.keys(rows[0]).includes(c),
        );
        if (missing.length) {
          this.alert.error(`Missing columns: ${missing.join(', ')}`);
          this.fileName = '';
          return;
        }
        this.parsedRows = rows.map((row: any) => {
          const mapped: any = {};
          Object.keys(this.feedbackColumnMap).forEach((excelCol) => {
            mapped[this.feedbackColumnMap[excelCol]] =
              row[excelCol]?.toString().trim() || '';
          });
          return mapped;
        });
        this.validateFeedbackRows();
      } catch (err: any) {
        this.alert.error('Parse error: ' + (err?.message ?? 'Unknown'));
        this.fileName = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private validateFeedbackRows(): void {
    this.errorRows = [];
    this.parsedRows.forEach((row, i) => {
      const missing: string[] = [];
      if (!row.admissionNo) missing.push('Admission No');
      if (!row.status) missing.push('Status');
      if (missing.length)
        this.errorRows.push({ rowNo: i + 2, missing: missing.join(', ') });
    });
  }

  isRowError(rowNo: number): boolean {
    return this.errorRows.some((e) => e.rowNo === rowNo);
  }

  // submitFeedbackImport(): void {
  //   if (!this.parsedRows.length || this.errorRows.length) return;
  //   this.importLoading = true;
  //   this.commonApi
  //     .fetchData(
  //       {
  //         tenantId: this.tenantId,
  //         userId: localStorage.getItem('userId'),
  //         rows: this.parsedRows,
  //       },
  //       'ims/ptm',
  //       'staff/feedback/import',
  //     )
  //     .subscribe({
  //       next: (res: any) => {
  //         this.importLoading = false;
  //         if (res?.status) {
  //           this.alert.success(
  //             `Feedback imported. Success: ${res.data?.successCount}, Failed: ${res.data?.failedCount}`,
  //           );
  //           this.closeModal('feedbackImportModal');
  //           this.resetImport();
  //           this.fetchStudents(1, 10);
  //         } else {
  //           this.alert.error(res?.message || 'Import failed');
  //         }
  //       },
  //       error: () => {
  //         this.importLoading = false;
  //         this.alert.error('Error importing feedback');
  //       },
  //     });
  // }

  submitFeedbackImport(): void {
    if (!this.parsedRows.length || this.errorRows.length) return;
    const admissionToPtmId = new Map<string, string>(
      this.dataArray.map((s) => [s.admissionNo?.trim(), s.ptmId]),
    );
    const mappedRows: any[] = [];
    const unmapped: any[] = [];
    this.parsedRows.forEach((row, i) => {
      const ptmId = admissionToPtmId.get(row.admissionNo?.trim());
      if (!ptmId) {
        unmapped.push({ rowNo: i + 2, admissionNo: row.admissionNo });
      } else {
        mappedRows.push({
          ptmId,
          admissionNo: row.admissionNo,
          staffRemarks: row.staffRemarks,
          status: row.status,
        });
      }
    });
    if (unmapped.length) {
      const nos = unmapped.map((u) => u.admissionNo).join(', ');
      this.alert.error(
        `${unmapped.length} admission no(s) not found in this session: ${nos}`,
      );
      return;
    }
    this.importLoading = true;
    this.commonApi
      .fetchData(
        {
          tenantId: this.tenantId,
          rows: mappedRows,
        },
        'ims/ptm',
        'staff/feedback/import',
      )
      .subscribe({
        next: (res: any) => {
          this.importLoading = false;
          if (res?.status) {
            this.alert.success(
              `Feedback imported. Success: ${res.data?.successCount}, Failed: ${res.data?.failedCount}`,
            );
            this.closeModal('feedbackImportModal');
            this.resetImport();
            this.fetchStudents(1, 10);
          } else {
            this.alert.error(res?.message || 'Import failed');
          }
        },
        error: () => {
          this.importLoading = false;
          this.alert.error('Error importing feedback');
        },
      });
  }

  downloadFeedbackTemplate(): void {
    const sample = this.dataArray.length
      ? this.dataArray.map((s) => ({
          'Admission No': s.admissionNo,
          'Staff Remarks': '',
          Status: '',
        }))
      : [
          {
            'Admission No': '902164259005',
            'Staff Remarks': 'Student needs improvement in maths',
            Status: 'COMPLETED',
          },
        ];

    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Feedback Import');
    XLSX.writeFile(wb, 'ptm_feedback_import_template.xlsx');
  }

  // downloadFeedbackTemplate(): void {
  //   const sample = [
  //     {
  //       'Admission No': '902164259005',
  //       'Staff Remarks': 'Student needs improvement in maths',
  //       Status: 'COMPLETED',
  //     },
  //   ];
  //   const ws = XLSX.utils.json_to_sheet(sample);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Feedback Import');
  //   XLSX.writeFile(wb, 'ptm_feedback_import_template.xlsx');
  // }

  goBack(): void {
    this.router.navigate(['/app/ptm']);
  }

  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) new (window as any).bootstrap.Modal(el).show();
  }

  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }

  formatDate(ts: number): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
