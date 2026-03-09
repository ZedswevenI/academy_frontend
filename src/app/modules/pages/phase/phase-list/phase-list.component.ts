import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import * as XLSX from 'xlsx';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-phase-list',
  standalone: false,
  templateUrl: './phase-list.component.html',
  styleUrl: './phase-list.component.scss',
})
export class PhaseListComponent implements OnInit {
  tenantId: string = '';
  isProceed = false;
  loading = false;
  selectedPhase: any = null;
  phaseForm!: FormGroup;
  class_options = [
    { label: '6th', value: 6 },
    { label: '7th', value: 7 },
    { label: '8th', value: 8 },
    { label: '9th', value: 9 },
    { label: '10th', value: 10 },
    { label: '11th', value: 11 },
    { label: '12th', value: 12 },
    { label: '12th Pass', value: 13 },
  ];
  subject_options: any[] = [];
  dataArray: any[] = [];
  totalRecords = 0;
  columnsArray = [
    { key: 'phaseName', label: 'Phase Name', sortable: true },
    { key: 'sortOrder', label: 'Sort Order', sortable: true },
    { key: 'topicCount', label: 'No. of Topics', sortable: true },
    { key: 'totalHours', label: 'Total Est. Hours', sortable: false },
  ];
  actions = [
    {
      type: 'icon',
      icon: 'fa fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.onView(row),
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-pen-to-square',
      tooltip: 'Edit',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.onEdit(row),
    },
    {
      type: 'icon',
      icon: 'fa-solid fa-trash',
      tooltip: 'Delete',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.onDelte(row),
    },
  ];
  parsing = false;
  importLoading = false;
  importRows: any[] = [];
  importResult: any = null;
  importPreview = {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    phasesCount: 0,
    clientErrors: [] as string[],
  };
  private subjectNameToId = new Map<string, string>();
  private topicMapCache = new Map<string, Map<string, string>>();
  private excelMappedRows: any[] = [];
  previewLimit = 25;
  importPreviewRows: Array<{
    rowNo: number;
    classNoRaw: string;
    subjectRaw: string;
    phaseName: string;
    topicName: string;
    estHoursRaw: string;
    status: 'valid' | 'invalid';
    reason?: string;
  }> = [];
  invalidPreviewReasons: Array<{ rowNo: number; reason: string }> = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService,
    private breadcrump: BredcrumpService,
  ) {
    this.tenantId = localStorage.getItem('tenantId') || '';
    this.breadcrump.set([{ label: 'Phase Plan', link: '/app/phase' }]);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadSubjects();
  }

  private initForm(): void {
    this.phaseForm = this.fb.group({
      class: [null, Validators.required],
      subject: ['', Validators.required],
    });
  }

  get hasPreviewInvalidReasons(): boolean {
    return this.invalidPreviewReasons.length > 0;
  }

  private loadSubjects(): void {
    const body = { entiId: this.tenantId };
    this.commonApi.fetchData(body, 'ims/subject', 'list?list=full').subscribe({
      next: (res: any) => {
        this.subject_options = res?.data || [];
      },
      error: () => this.alert.error('Error loading subjects'),
    });
  }

  onProceed(): void {
    if (this.phaseForm.invalid) return;
    const { class: classNo, subject: subjectId } = this.phaseForm.value;
    this.loading = true;
    this.isProceed = false;
    const body = { tenantId: this.tenantId };
    this.commonApi
      .fetchData(
        body,
        'institue/phase',
        `list?classNo=${classNo}&subjectId=${subjectId}`,
      )
      .subscribe({
        next: (res: any) => {
          const raw: any[] = res?.data || [];
          this.dataArray = raw.map((p: any) => ({
            ...p,
            topicCount: p.topics?.length || 0,
            totalHours:
              p.topics?.reduce(
                (sum: number, t: any) => sum + (t.estHours || 0),
                0,
              ) || 0,
          }));
          this.totalRecords = res?.count || this.dataArray.length;
          this.isProceed = true;
          this.loading = false;
        },
        error: () => {
          this.alert.error('Error loading phase plans');
          this.loading = false;
        },
      });
  }

  onEdit(row: any) {
    this.router.navigate(['/app/phase/create'], { state: { phase: row } });
  }

  onView(row: any) {
    this.selectedPhase = {
      ...row,
      topics: [...(row.topics || [])].sort((a, b) => a.sortOrder - b.sortOrder),
    };
    const modalEl = document.getElementById('phaseViewModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  onDelte(row: any) {
    if (!confirm(`Delete "${row.phaseName}"?`)) return;
    const body = { tenantId: this.tenantId, phaseId: row.phaseId };
    this.commonApi.fetchData(body, 'institue/phase', 'delete').subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.alert.success('Phase plan deleted');
          this.dataArray = this.dataArray.filter(
            (d) => d.phaseId !== row.phaseId,
          );
          this.totalRecords = this.dataArray.length;
        }
      },
      error: () => this.alert.error('Error deleting phase plan'),
    });
  }

  getTotalHours(): number {
    return (this.selectedPhase?.topics || []).reduce(
      (sum: number, t: any) => sum + (t.estHours || 0),
      0,
    );
  }

  getAvgHours(): string {
    const topics = this.selectedPhase?.topics || [];
    if (topics.length === 0) return '0';
    const avg = this.getTotalHours() / topics.length;
    return avg.toFixed(1);
  }

  openImportModal() {
    this.importResult = null;
    this.importRows = [];
    this.excelMappedRows = [];
    this.previewLimit = 25;
    this.importPreviewRows = [];
    this.invalidPreviewReasons = [];
    this.importPreview = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      phasesCount: 0,
      clientErrors: [],
    };
    if (!this.subject_options?.length) {
      this.alert.error('Subjects not loaded yet. Please try again.');
      return;
    }
    this.subjectNameToId.clear();
    this.subject_options.forEach((s: any) => {
      const key = this.normalizeName(s.subjectName);
      if (key) this.subjectNameToId.set(key, s._id);
    });
    const modalEl = document.getElementById('phaseImportModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  downloadSampleExcel() {
    const header = [
      'Program Name',
      'Class',
      'Subject',
      'Topics',
      'No of Hrs',
      'Phase',
    ];
    const rows = [
      ['JEE', '6th', 'Mathematics', 'Algebra Basics', 2, 'Phase 1'],
      ['JEE', '6th', 'Mathematics', 'Numbers', 1, 'Phase 1'],
      ['JEE', '6th', 'Mathematics', 'Fractions', 2, 'Phase 2'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PhasePlan');
    XLSX.writeFile(wb, 'Phase_Plan_Import_Format.xlsx');
  }

  onImportFileSelected(event: Event) {
    this.importResult = null;
    this.importRows = [];
    this.excelMappedRows = [];
    this.previewLimit = 25;
    this.importPreviewRows = [];
    this.invalidPreviewReasons = [];
    this.importPreview = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      phasesCount: 0,
      clientErrors: [],
    };
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      this.alert.error('Please upload a valid Excel file (.xlsx/.xls).');
      input.value = '';
      return;
    }
    this.parsing = true;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const sheetRows: any[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
        });
        const headerRowIndex = this.findHeaderRowIndex(sheetRows);
        if (headerRowIndex === -1) {
          this.alert.error('Invalid template. Header row not found.');
          this.parsing = false;
          return;
        }
        const headers = sheetRows[headerRowIndex].map((h) =>
          String(h || '').trim(),
        );
        const dataRows = sheetRows
          .slice(headerRowIndex + 1)
          .filter((r) => r.some((cell) => String(cell || '').trim() !== ''));
        this.excelMappedRows = this.mapExcelRows(headers, dataRows);
        this.validateAndPrepareImport();
      } catch {
        this.alert.error('Failed to read Excel. Please check the file format.');
        this.parsing = false;
      } finally {
        input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private findHeaderRowIndex(rows: any[][]): number {
    const required = ['Class', 'Subject', 'Topics', 'No of Hrs', 'Phase'];
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const r = rows[i].map((x) =>
        String(x || '')
          .trim()
          .toLowerCase(),
      );
      const ok = required.every((k) => r.includes(k.toLowerCase()));
      if (ok) return i;
    }
    return -1;
  }

  private mapExcelRows(headers: string[], rows: any[][]) {
    const idx = new Map<string, number>();
    headers.forEach((h, i) => idx.set(String(h).trim().toLowerCase(), i));
    const get = (row: any[], name: string) => {
      const i = idx.get(name.toLowerCase());
      return i === undefined ? '' : row[i];
    };
    return rows.map((r) => ({
      classNoRaw: String(get(r, 'Class') || '').trim(),
      subjectRaw: String(get(r, 'Subject') || '').trim(),
      phaseName: String(get(r, 'Phase') || '').trim(),
      topicName: String(get(r, 'Topics') || '').trim(),
      estHoursRaw: String(get(r, 'No of Hrs') || '').trim(),
    }));
  }

  private validateAndPrepareImport() {
    const errors: string[] = [];
    const phaseSet = new Set<string>();
    this.importPreviewRows = [];
    this.invalidPreviewReasons = [];
    type NormalizedRow = {
      rowNo: number;
      classNo: number;
      subjectId: string;
      phaseName: string;
      topicName: string;
      estHours: number | null;
      classNoRaw: string;
      subjectRaw: string;
      estHoursRaw: string;
    };
    const normalizedRows: NormalizedRow[] = [];
    const uniquePairs = new Map<
      string,
      { classNo: number; subjectId: string }
    >();
    this.excelMappedRows.forEach((r, idx) => {
      const rowNo = idx + 1;
      const basePreview = {
        rowNo,
        classNoRaw: r.classNoRaw,
        subjectRaw: r.subjectRaw,
        phaseName: String(r.phaseName || '').trim(),
        topicName: String(r.topicName || '').trim(),
        estHoursRaw: String(r.estHoursRaw || '').trim(),
      };
      const classNo = this.parseClassNo(r.classNoRaw);
      if (!classNo) {
        const reason = `Invalid Class "${r.classNoRaw}"`;
        errors.push(`Row ${rowNo}: ${reason}`);
        this.importPreviewRows.push({
          ...basePreview,
          status: 'invalid',
          reason,
        });
        this.invalidPreviewReasons.push({ rowNo, reason });
        return;
      }
      const subjectId = this.resolveSubjectId(r.subjectRaw);
      if (!subjectId) {
        const reason = `Subject not found "${r.subjectRaw}"`;
        errors.push(`Row ${rowNo}: ${reason}`);
        this.importPreviewRows.push({
          ...basePreview,
          status: 'invalid',
          reason,
        });
        this.invalidPreviewReasons.push({ rowNo, reason });
        return;
      }
      const phaseName = basePreview.phaseName;
      const topicName = basePreview.topicName;
      if (!phaseName || !topicName) {
        const reason = `Phase / Topics cannot be empty`;
        errors.push(`Row ${rowNo}: ${reason}`);
        this.importPreviewRows.push({
          ...basePreview,
          status: 'invalid',
          reason,
        });
        this.invalidPreviewReasons.push({ rowNo, reason });
        return;
      }
      let estHours: number | null = null;
      if (basePreview.estHoursRaw) {
        const parsed = Number(basePreview.estHoursRaw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          const reason = `"No of Hrs" must be a number > 0`;
          errors.push(`Row ${rowNo}: ${reason}`);
          this.importPreviewRows.push({
            ...basePreview,
            status: 'invalid',
            reason,
          });
          this.invalidPreviewReasons.push({ rowNo, reason });
          return;
        }
        estHours = parsed;
      }
      phaseSet.add(phaseName.toLowerCase());
      const pairKey = `${classNo}_${subjectId}`;
      if (!uniquePairs.has(pairKey))
        uniquePairs.set(pairKey, { classNo, subjectId });
      normalizedRows.push({
        rowNo,
        classNo,
        subjectId,
        phaseName,
        topicName,
        estHours,
        classNoRaw: basePreview.classNoRaw,
        subjectRaw: basePreview.subjectRaw,
        estHoursRaw: basePreview.estHoursRaw,
      });
      this.importPreviewRows.push({ ...basePreview, status: 'valid' });
    });
    this.importPreview.totalRows = this.excelMappedRows.length;
    this.importPreview.phasesCount = phaseSet.size;
    this.importPreview.clientErrors = errors;
    if (normalizedRows.length === 0) {
      this.importPreview.validRows = 0;
      this.importPreview.invalidRows = this.excelMappedRows.length;
      this.parsing = false;
      this.alert.error('No valid rows found. Fix Excel and try again.');
      return;
    }
    const pairList = Array.from(uniquePairs.values());
    const requests = pairList.map((pair) => {
      const cacheKey = `${pair.classNo}_${pair.subjectId}`;
      if (this.topicMapCache.has(cacheKey))
        return of({ __cacheKey: cacheKey, data: 'CACHED' });
      const body = {
        tenantId: this.tenantId,
        classNo: pair.classNo,
        subjectId: pair.subjectId,
      };
      return this.commonApi
        .fetchData(body, 'batch/phase', 'available-topics')
        .pipe(catchError(() => of({ status: false, data: [] }))) as any;
    });

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        results.forEach((res: any, i: number) => {
          const pair = pairList[i];
          const cacheKey = `${pair.classNo}_${pair.subjectId}`;
          if (this.topicMapCache.has(cacheKey)) return;
          const list = res?.data || [];
          const map = new Map<string, string>();
          list.forEach((t: any) => {
            const k = this.normalizeName(t.topicName);
            if (k) map.set(k, t.topicId);
          });
          this.topicMapCache.set(cacheKey, map);
        });
        const finalRows: any[] = [];
        const finalErrors: string[] = [...errors];
        let valid = 0;
        normalizedRows.forEach((r) => {
          const cacheKey = `${r.classNo}_${r.subjectId}`;
          const map = this.topicMapCache.get(cacheKey);
          const topicId = map?.get(this.normalizeName(r.topicName));
          if (!topicId) {
            const reason = `Topic not found "${r.topicName}"`;
            finalErrors.push(
              `Row ${r.rowNo}: ${reason} (Class ${r.classNo}, Subject ${r.subjectId})`,
            );
            const pr = this.importPreviewRows.find((x) => x.rowNo === r.rowNo);
            if (pr) {
              pr.status = 'invalid';
              pr.reason = reason;
            }
            this.invalidPreviewReasons.push({ rowNo: r.rowNo, reason });
            return;
          }
          valid++;
          finalRows.push({
            phaseName: r.phaseName,
            classNo: r.classNo,
            subjectId: r.subjectId,
            phaseSortOrder: 1,
            topicId,
            topicName: r.topicName,
            estHours: r.estHours,
            topicSortOrder: 0,
          });
        });
        this.importRows = finalRows;
        this.importPreview.validRows = valid;
        this.importPreview.invalidRows = this.importPreview.totalRows - valid;
        this.importPreview.clientErrors = finalErrors;
        if (!finalRows.length) {
          this.alert.error(
            'No valid rows after topic validation. Please fix the Excel.',
          );
        }
        this.parsing = false;
      },
      error: () => {
        this.parsing = false;
        this.alert.error('Failed to validate topics for import.');
      },
    });
  }

  private resolveSubjectId(subjectRaw: string): string | null {
    const s = String(subjectRaw || '').trim();
    if (!s) return null;
    if (/^[a-fA-F0-9]{24}$/.test(s)) return s;
    return this.subjectNameToId.get(this.normalizeName(s)) || null;
  }

  private parseClassNo(classRaw: string): number | null {
    const v = String(classRaw || '')
      .trim()
      .toLowerCase();
    if (!v) return null;
    if (v.includes('pass')) return 13;
    const n = Number(v.replace(/[^0-9]/g, ''));
    if (Number.isFinite(n) && n >= 1) return n;
    return null;
  }

  private normalizeName(v: string): string {
    return String(v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  submitImport() {
    if (this.importLoading || this.parsing) return;
    if (!this.importRows.length) {
      this.alert.error('Please upload a valid Excel file first.');
      return;
    }
    const payload = {
      tenantId: this.tenantId,
      userId: localStorage.getItem('userid') || '',
      rows: this.importRows,
    };
    this.importLoading = true;
    this.commonApi
      .fetchData(payload, 'institue/phase', 'bulkupload')
      .subscribe({
        next: (res: any) => {
          this.importLoading = false;
          if (!res?.status) {
            this.alert.error(res?.message || 'Import failed');
            return;
          }
          this.importResult = {
            message: res?.message,
            ...res?.data,
          };
          this.alert.success(res?.message || 'Import completed');
          if (this.isProceed) this.onProceed();
        },
        error: (e) => {
          this.importLoading = false;
          const msg = e?.error?.message || 'Import failed. Please try again.';
          this.alert.error(msg);
        },
      });
  }
}
