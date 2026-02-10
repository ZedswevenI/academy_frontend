import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

type ImportMode = 'insert' | 'upsert';

@Component({
  selector: 'app-program',
  standalone: false,
  templateUrl: './program.component.html',
  styleUrl: './program.component.scss'
})
export class ProgramComponent {
  modalVisible = false;
  isEditMode: boolean = false;

  loading: boolean = false;
  dataArray: any[] = [];
  totalRecords = 0;

  deleteTarget: any;
  deleteMessage: string = '';
  deleteTitle: string = '';

  showImport = false;
  importMode: ImportMode = 'upsert';
  importFileName = '';
  importPreviewRows: any[] = [];
  importHasInvalidRows = false;
  importInvalidCount = 0;
  private subjectByCode = new Map<string, any>();
  private subjectByName = new Map<string, any>();

  columnsArray = [
    { key: 'programName', label: 'Program Name', sortable: true },
    { key: 'programCodes', label: 'Code', sortable: false },
    { key: 'target', label: 'Stream', sortable: true },
    { key: 'eligibleToClass', label: 'Eligible Class', sortable: true },
    { key: 'duration', label: 'Duration', sortable: true },
    { key: 'startingClass', label: 'Start Class', sortable: true },
    { key: 'version', label: 'Version', sortable: true },
    { key: 'subjects', label: 'Subject', sortable: false },
    { key: 'status', label: 'Active', sortable: false },
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewDep(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-edit',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.editDep(row)
    },
    {
      type: 'icon',
      icon: 'fa-regular fa-trash-can',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#dc3545',
      callback: (row: any) => this.deletePro(row)
    },
  ]

  constructor(
    private breadcrump: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService) {
    this.breadcrump.set([{ label: 'Org Master' }, { label: 'Program' }])
  }


  fetchProgramData(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string;
    sortDirection?: string;
  }) {
    this.loading = true;

    // Pagination & Sort
    let sortParam = '';
    if (params.sortKey) {
      sortParam =
        params.sortDirection === 'desc'
          ? `-${params.sortKey}`
          : params.sortKey;
    }

    const query: any = {
      page: params.page,
      limit: params.pageSize
    };
    if (sortParam) query.sort = sortParam;
    if (params.search) query.search = params.search;

    // Build query string
    const queryString = Object.keys(query)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
      )
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'ims/program', `list?${queryString}`).subscribe({
      next: (res: any) => {
        console.log(res)
        this.dataArray = res.data;
        this.totalRecords = res?.count || 0;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.alert.error('Error loading progeam');
      }
    });
  }

  // ===================== IMPORT =====================

  openImport() {
    this.showImport = true;
    this.resetImport();
  }

  closeImport() {
    this.showImport = false;
  }

  resetImport() {
    this.importFileName = '';
    this.importPreviewRows = [];
    this.importHasInvalidRows = false;
    this.importInvalidCount = 0;
    this.importMode = 'upsert'; // ✅ fixed
  }

  downloadSampleExcel() {
    const rows = [
      {
        ID: 1,
        'Program Name': 'ARISE - One Year Foundation',
        'Eligible Class': 10,
        'Starting Class': 9,
        Duration: 2,
        Target: 'Foundation',
        'Program Version': 'Special Sunday / Regular',
        'Program Code': 'C6053',
        Subjects: 'MATHS, PHYSICS',
        Status: 'Active',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Programs');
    XLSX.writeFile(wb, 'Program_Import_Sample.xlsx');
  }

  onExcelSelected(ev: any) {
    const file: File = ev?.target?.files?.[0];
    if (!file) return;

    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.alert.error('Please upload a valid Excel file (.xlsx / .xls)');
      return;
    }

    this.importFileName = file.name;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, {
          defval: '',
        }) as any[];

        const mapped = rawRows.map((r: any, idx: number) =>
          this.mapExcelRow(r, idx + 2),
        ); // +2 header line
        this.importPreviewRows = mapped;
        this.computeImportValidation();
      } catch (err) {
        this.alert.error('Unable to read Excel file');
        this.importPreviewRows = [];
        this.computeImportValidation();
      }
    };

    reader.onerror = () => this.alert.error('Unable to read file');
    reader.readAsBinaryString(file);
  }


  confirmImport() {
    if (!this.importPreviewRows.length) {
      this.alert.error('Please upload an Excel file first');
      return;
    }
    if (this.importHasInvalidRows) {
      this.alert.error('Fix invalid rows before importing');
      return;
    }
    const rows = this.importPreviewRows.map((r) => ({
      excelId: r.excelId ?? null,
      programName: r.programName,
      eligibleToClass: r.eligibleToClass,
      startingClass: r.startingClass,
      duration: r.duration,
      endingClass: r.endingClass ?? null,
      programCodes: r.programCodes,
      target: r.target,
      version: r.version,
      programType: r.programType,
      subjects: r.subjects || [],
      status: r.status,
    }));
    const payload = {
      entiId: localStorage.getItem('tenantId'),
      mode: 'upsert',
      rows,
    };
    this.commonApi
      .fetchData(payload, 'ims', 'program/import')
      .subscribe({
        next: () => {
          this.alert.success('Import completed');
          this.closeImport();
          this.fetchProgramData({ page: 1, pageSize: 10 });
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'Import failed';
          this.alert.error(msg);
        },
      });
  }


  private mapExcelRow(r: any, rowNo: number) {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '')
          return String(r[k]).trim();
      }
      return '';
    };
    const excelIdStr = get('ID', 'Id', 'id');
    const excelId = excelIdStr ? Number(excelIdStr) : null;
    const programName = get('Program Name', 'ProgramName', 'programName');
    const eligibleToClass = this.toNum(
      get('Eligible Class', 'EligibleClass', 'eligibleToClass'),
    );
    const startingClass = this.toNum(
      get('Starting Class', 'Start Class', 'startingClass'),
    );
    const duration = this.toNum(get('Duration', 'duration'));
    const programCodes = get('Program Code', 'ProgramCode', 'programCodes');
    const target = get('Target', 'Stream', 'target');
    const version = get('Program Version', 'ProgramVersion', 'version');
    const programType = get('Program Type', 'ProgramType', 'programType');
    const subjectsRaw = get('Subjects', 'Subject', 'subjects', 'subject');
    const statusRaw = get('Status', 'status');
    const status = statusRaw === 'Inactive' ? 'Inactive' : 'Active';
    const errors: string[] = [];
    if (!programName) errors.push('Program Name required');
    if (!eligibleToClass) errors.push('Eligible Class required');
    if (eligibleToClass && (eligibleToClass < 5 || eligibleToClass > 13))
      errors.push('Eligible Class must be 5..13');
    if (!startingClass) errors.push('Starting Class required');
    if (startingClass && (startingClass < 5 || startingClass > 13))
      errors.push('Starting Class must be 5..13');
    if (!duration) errors.push('Duration required');
    if (duration && (duration < 1 || duration > 6))
      errors.push('Duration must be 1..6');
    const endingClass =
      startingClass > 0 && duration > 0 ? startingClass + duration - 1 : 0;
    if (endingClass && endingClass > 13)
      errors.push('Calculated endingClass exceeds 13');
    if (!programCodes) errors.push('Program Code required');
    const codeParts = (programCodes || '')
      .split(',')
      .map((x) => (x || '').trim())
      .filter(Boolean);
    if (!codeParts.length) errors.push('Program Code invalid');
    const subjectTokens = this.splitCsv(subjectsRaw);
    const subjectIds: string[] = [];
    if (subjectTokens.length) {
      const missing: string[] = [];
      for (const tok of subjectTokens) {
        const key = this.normKey(tok);
        const hit = this.subjectByCode.get(key) || this.subjectByName.get(key);
        if (!hit) missing.push(tok);
        else subjectIds.push(String(hit.value));
      }
      if (missing.length)
        errors.push(`Invalid subjects: ${missing.join(', ')}`);
    }
    return {
      _rowNo: rowNo,
      _valid: errors.length === 0,
      _errors: errors,
      excelId: Number.isFinite(excelId as any) ? excelId : null,
      programName,
      eligibleToClass,
      startingClass,
      endingClass: endingClass || null,
      duration,
      programCodes,
      target: target || null,
      version,
      programType: programType || null,
      subjectsRaw,
      subjects: Array.from(new Set(subjectIds)),
      status,
    };
  }

  private computeImportValidation() {
    const invalid = (this.importPreviewRows || []).filter((x) => !x._valid);
    this.importInvalidCount = invalid.length;
    this.importHasInvalidRows = invalid.length > 0;
  }

  // ---------------- HELPERS ----------------
  private toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    const s = String(v).trim();
    if (!s) return 0;
    const m = s.match(/-?\d+/);
    if (!m) return 0;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : 0;
  }

  private splitCsv(v: any): string[] {
    const s = (v === null || v === undefined ? '' : String(v)).trim();
    if (!s) return [];
    return s
      .split(',')
      .map((x) => String(x || '').trim())
      .filter(Boolean);
  }

  private normKey(v: any): string {
    return (v === null || v === undefined ? '' : String(v))
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  viewDep(row: any) {
    // this.router.navigate(['/app/org-master/program/view', row._id])
    // this.router.navigate(['/app/org-master/program/view'], {
    //   state: {
    //     rowData: row
    //   }
    // });
    const b = row?._raw || row;
    this.router.navigate(['/app/org-master/program/view', b?._id]);
  }

  addDep() {
    this.router.navigate(['/app/org-master/program/add'],
      {
        state: {
          isEditMode: false,
        }
      });
  }

  editDep(row: any) {
    this.router.navigate(['/app/org-master/program/add'], {
      state: {
        isEditMode: true,
        rowData: row
      }
    });
  }

  deletePro(row: any) {
    this.deleteTarget = row;
    this.deleteTitle = `Delete Program`
    this.deleteMessage = `Are you sure you want to delete program "${row.programName}"?`;
    this.modalVisible = true;
  }

  onModalClosed(confirmed: boolean) {
    this.modalVisible = false;

    if (!confirmed || !this.deleteTarget) {
      this.deleteTarget = null;
      return;
    }

    const deleteBody = {
      entiId: localStorage.getItem('tenantId'),
      recId: this.deleteTarget._id
    };

    this.commonApi.fetchData(deleteBody, 'ims/program', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Program deleted successfully!');
          this.fetchProgramData({ page: 1, pageSize: 5, search: '', sortKey: '', sortDirection: 'asc' });
        } else {
          this.alert.error(res?.message || 'Failed to delete program');
        }
      },
      error: (err) => {
        this.alert.error(err?.message || 'Server error while deleting program');
      }
    });
    this.deleteTarget = null;
  }


  // deleteDep(row: any) {
  //   this.openModal()
  // }
  // openModal() {
  //   this.modalVisible = true;
  // }


  // onModalClosed(result: boolean) {
  //   console.log('Modal closed. Confirmed:', result);
  //   this.modalVisible = false;
  //   if (result) {
  //     alert('User confirmed the action!');
  //   } else {
  //     alert('User cancelled the action.');
  //   }
  // }
}
