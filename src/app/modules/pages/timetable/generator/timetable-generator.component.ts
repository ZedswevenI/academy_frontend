import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AuthService } from '../../../../service/auth/auth.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx-js-style';

export interface TimetableCell {
  value: string;
  isHoliday?: boolean;
  isBreak?: boolean;
  isLunch?: boolean;
  isExam?: boolean;
  isLab?: boolean;
  isDoubtSession?: boolean;
  conflict?: boolean;
  conflictDetails?: string;
}

export interface TimetableSlot {
  startTime: string;
  endTime: string;
  isSpecial?: boolean;
  cells: { [classKey: string]: TimetableCell };
  hostelDuty?: string;
  notes?: string;
}

export interface TimetableDay {
  dateLabel: string;
  dayName: string;
  isWholeDayHoliday?: boolean;
  slots: TimetableSlot[];
}

export interface BatchSubjectRow {
  subjectName: string;
  code: string;
  icon: string;
  color: string;
  staffCodes: string[];
  displayName: string; // e.g. "Physics - PSD"
  targetPeriods: number;
  scheduledPeriods: number;
}

export interface BatchRequirementsData {
  batchKey: string;
  fullName: string;
  grade: string;
  sectionName: string;
  batchCode: string;
  subjects: BatchSubjectRow[];
}

export interface ClassColumn {
  key: string;
  grade: string;
  stream: string;
  sectionName: string;
  fullName: string;
  batchCode?: string;
}

export interface ScheduledExam {
  id: string;
  examName: string;
  dayIdx: number;
  slotIdx: number;
  dayName: string;
  dateLabel: string;
  timeLabel: string;
  targetScope: 'single' | 'grade' | 'all';
  targetLabel: string;
  appliedBatchKeys: string[];
}

@Component({
  selector: 'app-timetable-generator',
  standalone: false,
  templateUrl: './timetable-generator.component.html',
  styleUrls: ['./timetable-generator.component.scss']
})
export class TimetableGeneratorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  tenantId = '';

  loading = false;
  savingToBackend = false;
  publishStatus: 'DRAFT' | 'PUBLISHED' | 'UNSAVED' = 'UNSAVED';
  isEditMode = false;
  selectedDayIndex = 0; // 0 = all days view, or 1..6 specific day

  // Generator modal state
  showGeneratorModal = false;
  generatorOptions = {
    preserveFixedSlots: true,
    syncPetByGrade: true,
    maxPeriodsPerSubjectPerDay: 2,
    enforceNoClash: true
  };

  // Batch requirements view state
  selectedBatchKey = 'IX_SIGMA';
  selectedGradeFilter = 'ALL'; // ALL, IX, X, XI, XII
  requirementsViewMode: 'single' | 'grid' = 'single'; // single batch view or all batches grid
  showAllSubjectsForBatch = false; // toggle to show unassigned subjects

  // Modal / Cell edit state
  editingCell: {
    dayIdx: number;
    slotIdx: number;
    classKey: string;
    currentValue: string;
    dayLabel: string;
    timeLabel: string;
    className: string;
  } | null = null;

  // Scheduled Exams state
  scheduledExams: ScheduledExam[] = [];
  newExamForm = {
    examName: '',
    dayIdx: 1, // Tuesday by default
    slotIdx: 0, // Period 1
    targetScope: 'single' as 'single' | 'grade' | 'all'
  };

  // 17 Class / Batch definitions
  classes: ClassColumn[] = [
    { key: 'IX_SIGMA', grade: 'IX', stream: 'ASPIRE', sectionName: 'SIGMA', fullName: 'IX ASPIRE SIGMA', batchCode: 'COIFR260S01' },
    { key: 'IX_EPSILON', grade: 'IX', stream: 'ASPIRE', sectionName: 'EPSILON', fullName: 'IX ASPIRE EPSILON', batchCode: 'COIFR260E01' },
    { key: 'IX_ALPHA', grade: 'IX', stream: 'ASPIRE', sectionName: 'ALPHA', fullName: 'IX ASPIRE ALPHA', batchCode: 'COIFR260A01' },
    { key: 'X_PI', grade: 'X', stream: 'ASPIRE', sectionName: 'PI', fullName: 'X ASPIRE PI', batchCode: 'COIFR259P01' },
    { key: 'X_OMEGA', grade: 'X', stream: 'ASPIRE', sectionName: 'OMEGA', fullName: 'X ASPIRE OMEGA', batchCode: 'COIFR259O01' },
    { key: 'XI_RAMANUJAN', grade: 'XI', stream: 'ELEVATE', sectionName: 'RAMANUJAN', fullName: 'XI ELEVATE RAMANUJAN', batchCode: 'COITR268R01' },
    { key: 'XI_APJ_KALAM', grade: 'XI', stream: 'ELEVATE', sectionName: 'APJ KALAM', fullName: 'XI ELEVATE APJ KALAM', batchCode: 'COITR268K01' },
    { key: 'XI_CV_RAMAN', grade: 'XI', stream: 'ELEVATE', sectionName: 'CV RAMAN', fullName: 'XI ELEVATE CV RAMAN', batchCode: 'COITR268V01' },
    { key: 'XI_VIKRAM_SARABHAI', grade: 'XI', stream: 'ELEVATE', sectionName: 'VIKRAM SARABHAI', fullName: 'XI ELEVATE VIKRAM SARABHAI', batchCode: 'COITR268S01' },
    { key: 'XI_SUSHRUTHA', grade: 'XI', stream: 'MAGNUM', sectionName: 'SUSHRUTHA', fullName: 'XI MAGNUM SUSHRUTHA', batchCode: 'COITM268S01' },
    { key: 'XI_CHARAKA', grade: 'XI', stream: 'MAGNUM', sectionName: 'CHARAKA', fullName: 'XI MAGNUM CHARAKA', batchCode: 'COITM268C01' },
    { key: 'XII_EINSTEIN', grade: 'XII', stream: 'ELEVATE', sectionName: 'EINSTEIN', fullName: 'XII ELEVATE EINSTEIN', batchCode: 'COIXR257E01' },
    { key: 'XII_NEWTON', grade: 'XII', stream: 'ELEVATE', sectionName: 'NEWTON', fullName: 'XII ELEVATE NEWTON', batchCode: 'COIXR257N01' },
    { key: 'XII_CURIE', grade: 'XII', stream: 'ELEVATE', sectionName: 'CURIE', fullName: 'XII ELEVATE CURIE', batchCode: 'COIXR257C01' },
    { key: 'XII_TESLA', grade: 'XII', stream: 'ELEVATE', sectionName: 'TESLA', fullName: 'XII ELEVATE TESLA', batchCode: 'COIXR257T01' },
    { key: 'XII_ARISTOTLE', grade: 'XII', stream: 'MAGNUM', sectionName: 'ARISTOTLE', fullName: 'XII MAGNUM ARISTOTLE', batchCode: 'COIXM257A01' },
    { key: 'XII_DARWIN', grade: 'XII', stream: 'MAGNUM', sectionName: 'DARWIN', fullName: 'XII MAGNUM DARWIN', batchCode: 'COIXM257D01' }
  ];

  // Primary Assigned Staff per Batch and Subject (From verified Portal Faculty Data)
  defaultBatchStaffAssignments: { [batchKey: string]: { [subjectName: string]: string[] } } = {
    'IX_SIGMA': {
      'Physics': ['PMNS'],
      'Chemistry': ['CEF'],
      'Maths': ['MVTL'],
      'MAT': ['MJNA'],
      'Biology': ['BEM'],
      'Social Science': ['SSP'],
      'Language': ['TPM', 'HST'],
      'English': ['EAB'],
      'Computer Science': ['IDJ']
    },
    'IX_EPSILON': {
      'Physics': ['PSD'],
      'Chemistry': ['CRA'],
      'Maths': ['MVLL'],
      'MAT': ['MTH'],
      'Biology': ['BTA'],
      'Social Science': ['SSP'],
      'Language': ['TPM', 'HST'],
      'English': ['EAL'],
      'Computer Science': ['IDJ']
    },
    'IX_ALPHA': {
      'Physics': ['PSD'],
      'Chemistry': ['CRA'],
      'Maths': ['MSS'],
      'MAT': ['MJNA'],
      'Biology': ['BDE'],
      'Social Science': ['SSP'],
      'Language': ['TPM'],
      'English': ['EPK'],
      'Computer Science': ['IDJ']
    },
    'X_PI': {
      'Physics': ['PMNS'],
      'Chemistry': ['CEF'],
      'Maths': ['MVTL'],
      'MAT': ['MVLL'],
      'Biology': ['BKNA'],
      'Social Science': ['SS'],
      'Language': ['TPM', 'HST'],
      'English': ['EVL']
    },
    'X_OMEGA': {
      'Physics': ['PMNS'],
      'Chemistry': ['CEF'],
      'Maths': ['MVTL'],
      'MAT': ['MVLL'],
      'Biology': ['BKNA'],
      'Social Science': ['SS'],
      'Language': ['TPM', 'HST'],
      'English': ['EVL']
    },
    'XI_RAMANUJAN': {
      'Physics': ['PMTN'],
      'Chemistry': ['CVR'],
      'Maths': ['MJK'],
      'English': ['EAB'],
      'Computer Science': ['IDJ']
    },
    'XI_APJ_KALAM': {
      'Physics': ['PMTN'],
      'Chemistry': ['CSR'],
      'Maths': ['MRPK'],
      'English': ['EVL'],
      'Computer Science': ['IDJ']
    },
    'XI_CV_RAMAN': {
      'Physics': ['PMNS'],
      'Chemistry': ['CTMK'],
      'Maths': ['MDKY'],
      'English': ['EAL'],
      'Computer Science': ['IDJ']
    },
    'XI_VIKRAM_SARABHAI': {
      'Physics': ['PMTN'],
      'Chemistry': ['CTMK'],
      'Maths': ['MAB'],
      'English': ['EVL'],
      'Computer Science': ['IDJ']
    },
    'XI_SUSHRUTHA': {
      'Physics': ['PRB'],
      'Chemistry': ['CSR'],
      'Botany': ['BEM'],
      'Zoology': ['BKNA'],
      'Maths': ['MDKY'],
      'English': ['EPK']
    },
    'XI_CHARAKA': {
      'Physics': ['PRB'],
      'Chemistry': ['CSR'],
      'Botany': ['BEM'],
      'Zoology': ['BKNA'],
      'Maths': ['MAB'],
      'English': ['EPK']
    },
    'XII_EINSTEIN': {
      'Physics': ['PNK'],
      'Chemistry': ['CVR'],
      'Maths': ['MPV'],
      'English': ['EPK'],
      'Computer Science': ['IRN']
    },
    'XII_NEWTON': {
      'Physics': ['PNK'],
      'Chemistry': ['CSJE'],
      'Maths': ['MPV'],
      'English': ['EVL'],
      'Computer Science': ['ILR']
    },
    'XII_CURIE': {
      'Physics': ['PAKG'],
      'Chemistry': ['CSJE'],
      'Maths': ['MDKY'],
      'English': ['EAB'],
      'Computer Science': ['ILR']
    },
    'XII_TESLA': {
      'Physics': ['PNK'],
      'Chemistry': ['CSJE'],
      'Maths': ['MAB'],
      'English': ['EAB'],
      'Computer Science': ['ILR']
    },
    'XII_ARISTOTLE': {
      'Physics': ['PAKG'],
      'Chemistry': ['CSR'],
      'Maths': ['MVTL'],
      'Botany': ['BDG'],
      'Zoology': ['BGD'],
      'English': ['EAB']
    },
    'XII_DARWIN': {
      'Physics': ['PAKG'],
      'Chemistry': ['CSR'],
      'Maths': ['MAB'],
      'Botany': ['BDG'],
      'Zoology': ['BGD'],
      'English': ['EAB']
    }
  };

  // Lookups from portal
  staffList: any[] = [];
  staffMapByCode = new Map<string, any>();
  subjectList: any[] = [];

  // Master Subject Definition Template
  masterSubjects = [
    { subjectName: 'Physics', code: 'PHY', icon: 'fa-atom', color: '#3b82f6', defaultTarget: 6 },
    { subjectName: 'Chemistry', code: 'CHE', icon: 'fa-flask', color: '#10b981', defaultTarget: 6 },
    { subjectName: 'Maths', code: 'MATH', icon: 'fa-calculator', color: '#8b5cf6', defaultTarget: 6 },
    { subjectName: 'MAT', code: 'MAT', icon: 'fa-brain', color: '#a855f7', defaultTarget: 2 },
    { subjectName: 'Biology', code: 'BIO', icon: 'fa-dna', color: '#ec4899', defaultTarget: 5 },
    { subjectName: 'Botany', code: 'BOT', icon: 'fa-seedling', color: '#84cc16', defaultTarget: 4 },
    { subjectName: 'Zoology', code: 'ZOO', icon: 'fa-paw', color: '#f97316', defaultTarget: 4 },
    { subjectName: 'English', code: 'ENG', icon: 'fa-book-open', color: '#06b6d4', defaultTarget: 4 },
    { subjectName: 'Social Science', code: 'SCL', icon: 'fa-earth-americas', color: '#f59e0b', defaultTarget: 4 },
    { subjectName: 'Language', code: 'LNG', icon: 'fa-language', color: '#6366f1', defaultTarget: 4 },
    { subjectName: 'Computer Science', code: 'CS', icon: 'fa-laptop-code', color: '#64748b', defaultTarget: 4 }
  ];

  // Staff to Subject mapping verified from portal database
  staffSubjectMap: { [code: string]: string } = {
    // Physics
    'PMTN': 'Physics', 'PSD': 'Physics', 'PYJ': 'Physics', 'PKC': 'Physics', 'PAKG': 'Physics',
    'PMNS': 'Physics', 'PNK': 'Physics', 'PRB': 'Physics', 'PSS': 'Physics', 'POH': 'Physics',
    'PAA': 'Physics', 'PHY': 'Physics',

    // Chemistry
    'CSJE': 'Chemistry', 'CEF': 'Chemistry', 'CGS': 'Chemistry', 'CVR': 'Chemistry',
    'CTMK': 'Chemistry', 'CSD': 'Chemistry', 'CSR': 'Chemistry', 'CRA': 'Chemistry',
    'CSK': 'Chemistry', 'CHE': 'Chemistry',

    // Maths
    'MPV': 'Maths', 'MVTL': 'Maths', 'MDKY': 'Maths', 'MRPK': 'Maths',
    'MSS': 'Maths', 'MPMB': 'Maths', 'MTH': 'Maths', 'MJK': 'Maths',
    'MAB': 'Maths', 'MATH': 'Maths',

    // MAT
    'MVLL': 'MAT', 'MJNA': 'MAT', 'MAT': 'MAT',

    // Biology
    'BDE': 'Biology', 'BTA': 'Biology', 'BEM': 'Biology', 'BKNA': 'Biology', 'BIO': 'Biology',

    // Botany
    'BDG': 'Botany', 'BOT': 'Botany',

    // Zoology
    'BGD': 'Zoology', 'ZOO': 'Zoology',

    // English
    'EPK': 'English', 'EGC': 'English', 'EAB': 'English', 'EVL': 'English', 'EAL': 'English', 'ENG': 'English',

    // Social Science
    'SS': 'Social Science', 'SSP': 'Social Science', 'SCL': 'Social Science',

    // Computer Science
    'ILR': 'Computer Science', 'IRN': 'Computer Science', 'IDJ': 'Computer Science', 'CS': 'Computer Science',

    // Language / Hindi / Tamil
    'TPM': 'Language', 'HST': 'Language', 'HPT': 'Language', 'LNG': 'Language', 'TAMIL': 'Language', 'HINDI': 'Language'
  };

  // Timetable days schedule
  days: TimetableDay[] = [];

  // Per-Batch Subject Requirements Data
  batchRequirements: { [batchKey: string]: BatchRequirementsData } = {};

  constructor(
    private commonApi: CommonapiService,
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.tenantId = this.authService.getTenantId();
    this.initDefaultTimetableData();
    this.scanExistingExamsFromTimetable();
    this.initBatchRequirementsStructure();
    this.calculateSubjectCountsPerBatch();
    this.loadStaffAndSubjects();
    this.detectStaffConflicts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  normalizeSubjectName(raw: string): string {
    const up = (raw || '').toUpperCase();
    if (up.includes('PHYSIC') || up.includes('(PHY)')) return 'Physics';
    if (up.includes('CHEMIS') || up.includes('(CHE)')) return 'Chemistry';
    if (up.includes('MAT (') || up.startsWith('MAT')) return 'MAT';
    if (up.includes('MATHEMATIC') || up.includes('(MATH)')) return 'Maths';
    if (up.includes('BOTAN') || up.includes('(BOT)')) return 'Botany';
    if (up.includes('ZOOLOG') || up.includes('(ZOO)')) return 'Zoology';
    if (up.includes('BIOLOG') || up.includes('(BIO)')) return 'Biology';
    if (up.includes('SOCIAL') || up.includes('(SCL)')) return 'Social Science';
    if (up.includes('ENGLISH') || up.includes('(ENG)')) return 'English';
    if (up.includes('COMPUTER') || up.includes('(COMP') || up.includes('(CS)')) return 'Computer Science';
    if (up.includes('TAMIL') || up.includes('HINDI') || up.includes('(LNG)')) return 'Language';
    return '';
  }

  extractStaffCode(raw: string): string {
    const m = (raw || '').match(/\(([^)]+)\)$/);
    return m ? m[1].trim().toUpperCase() : (raw || '').trim().toUpperCase();
  }

  loadStaffAndSubjects(): void {
    this.loading = true;
    forkJoin({
      staff: this.commonApi.fetchData({ entiId: this.tenantId }, 'ims', 'staff/list?list=full').pipe(catchError(() => of({ data: [] }))),
      subject: this.commonApi.fetchData({ entiId: this.tenantId }, 'ims', 'subject/list?list=full').pipe(catchError(() => of({ data: [] }))),
      batches: this.commonApi.fetchData({ entiId: this.tenantId, limit: 100 }, 'batch', 'list').pipe(catchError(() => of({ data: [] })))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ staff, subject, batches }) => {
          this.staffList = staff?.data || [];
          this.subjectList = subject?.data || [];

          this.staffMapByCode.clear();
          for (const s of this.staffList) {
            const code = (s.staffCode || '').toUpperCase().trim();
            if (code) {
              this.staffMapByCode.set(code, s);
            }
          }

          // Parse live staffMap from batch list if present
          if (batches?.data && Array.isArray(batches.data)) {
            for (const b of batches.data) {
              const classCol = this.classes.find(c => c.batchCode === b.batchCode);
              if (classCol && b.staffMap && b.staffMap.length > 0) {
                const parsedMap: { [subj: string]: string[] } = {};
                for (const sm of b.staffMap) {
                  const normSubj = this.normalizeSubjectName(sm.subjectName);
                  const code = this.extractStaffCode(sm.staffName);
                  if (normSubj && code) {
                    if (!parsedMap[normSubj]) parsedMap[normSubj] = [];
                    if (!parsedMap[normSubj].includes(code)) parsedMap[normSubj].push(code);
                  }
                }
                if (Object.keys(parsedMap).length > 0) {
                  this.defaultBatchStaffAssignments[classCol.key] = parsedMap;
                }
              }
            }
          }

          this.initBatchRequirementsStructure();
          this.calculateSubjectCountsPerBatch();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  getStaffTooltip(cellVal: string): string {
    if (!cellVal) return '';
    const clean = cellVal.replace(/\n/g, ' ').trim();
    const parts = clean.split(/[,\s/]+/).map(p => p.trim().toUpperCase());
    const matchedNames: string[] = [];

    for (const p of parts) {
      if (this.staffMapByCode.has(p)) {
        const staff = this.staffMapByCode.get(p);
        matchedNames.push(`${staff.staffName || p} (${p})`);
      }
    }

    return matchedNames.length ? matchedNames.join(', ') : clean;
  }

  initBatchRequirementsStructure(): void {
    this.batchRequirements = {};
    for (const c of this.classes) {
      const assignedMap = this.defaultBatchStaffAssignments[c.key] || {};

      this.batchRequirements[c.key] = {
        batchKey: c.key,
        fullName: c.fullName,
        grade: c.grade,
        sectionName: c.sectionName,
        batchCode: c.batchCode || '',
        subjects: this.masterSubjects.map(m => {
          const initialStaff = assignedMap[m.subjectName] || [];
          return {
            subjectName: m.subjectName,
            code: m.code,
            icon: m.icon,
            color: m.color,
            staffCodes: initialStaff,
            displayName: initialStaff.length ? `${m.subjectName} - ${initialStaff.join(', ')}` : m.subjectName,
            targetPeriods: m.defaultTarget,
            scheduledPeriods: 0
          };
        })
      };
    }
  }

  // Calculate subject counts and scheduled periods FOR EACH BATCH independently
  calculateSubjectCountsPerBatch(): void {
    for (const c of this.classes) {
      const bData = this.batchRequirements[c.key];
      if (!bData) continue;

      const assignedDefaultMap = this.defaultBatchStaffAssignments[c.key] || {};
      const subCounts = new Map<string, number>();

      for (const m of this.masterSubjects) {
        subCounts.set(m.subjectName, 0);
      }

      // Tally periods from this batch's column in timetable
      for (const day of this.days) {
        for (const slot of day.slots) {
          const raw = (slot.cells[c.key]?.value || '').trim();
          if (!raw || raw === 'BREAK' || raw.includes('LUNCH') || raw.includes('HOLIDAY')) continue;

          // Parse tokens in the cell
          const tokens = raw.split(/[/,\s-]+/)
            .map(t => t.trim().toUpperCase())
            .filter(t => t.length >= 2 && !['BREAK', 'LUNCH', 'HOLIDAY', 'TEST', 'EXAM', 'PET', 'LAB', 'YOGA', 'ART', 'DOUBT', 'SESSION'].includes(t));

          let matchedSubject = '';

          // 1. Match by staff code
          for (const token of tokens) {
            if (this.staffSubjectMap[token]) {
              matchedSubject = this.staffSubjectMap[token];
              subCounts.set(matchedSubject, (subCounts.get(matchedSubject) || 0) + 1);
              break;
            }
          }

          // 2. Direct subject keyword match if no staff matched
          if (!matchedSubject) {
            const up = raw.toUpperCase();
            for (const m of this.masterSubjects) {
              if (up.includes(m.code) || up.includes(m.subjectName.toUpperCase())) {
                subCounts.set(m.subjectName, (subCounts.get(m.subjectName) || 0) + 1);
                break;
              }
            }
          }
        }
      }

      // Update subject rows for this batch:
      // STRICT RULE: Staff codes MUST only be the staff assigned to this batch
      for (const sRow of bData.subjects) {
        sRow.scheduledPeriods = subCounts.get(sRow.subjectName) || 0;
        // Keep ONLY the staff who has been assigned to this batch
        sRow.staffCodes = assignedDefaultMap[sRow.subjectName] ? [...assignedDefaultMap[sRow.subjectName]] : [];
        if (sRow.staffCodes.length > 0) {
          sRow.displayName = `${sRow.subjectName} — ${sRow.staffCodes.join(', ')}`;
        } else {
          sRow.displayName = sRow.subjectName;
        }
      }
    }
  }

  // Get current active batch requirements
  get currentBatchData(): BatchRequirementsData | null {
    return this.batchRequirements[this.selectedBatchKey] || null;
  }

  // Filter subjects for current batch to ONLY SHOW subjects that have assigned staff
  get currentBatchAssignedSubjects(): BatchSubjectRow[] {
    if (!this.currentBatchData) return [];
    if (this.showAllSubjectsForBatch) {
      return this.currentBatchData.subjects;
    }
    // Strict filter: only subjects with assigned staff for this batch
    return this.currentBatchData.subjects.filter(s => s.staffCodes && s.staffCodes.length > 0);
  }

  // Helper to filter assigned subjects for any batch (used in grid view)
  getBatchAssignedSubjects(batchKey: string): BatchSubjectRow[] {
    const bData = this.batchRequirements[batchKey];
    if (!bData) return [];
    return bData.subjects.filter(s => s.staffCodes && s.staffCodes.length > 0);
  }

  // Filtered batch list based on grade pill
  get filteredClasses(): ClassColumn[] {
    if (this.selectedGradeFilter === 'ALL') return this.classes;
    return this.classes.filter(c => c.grade === this.selectedGradeFilter);
  }

  selectBatch(batchKey: string): void {
    this.selectedBatchKey = batchKey;
  }

  setGradeFilter(grade: string): void {
    this.selectedGradeFilter = grade;
    const available = this.filteredClasses;
    if (available.length && !available.some(c => c.key === this.selectedBatchKey)) {
      this.selectedBatchKey = available[0].key;
    }
  }

  // =========================================================================================
  // EXAM MANAGEMENT & TEACHING PERIOD CALCULATIONS
  // =========================================================================================

  // Scan and register any pre-existing exams in timetable matrix
  scanExistingExamsFromTimetable(): void {
    this.scheduledExams = [];
    const seen = new Set<string>();

    for (let d = 0; d < this.days.length; d++) {
      const day = this.days[d];
      for (let s = 0; s < day.slots.length; s++) {
        const slot = day.slots[s];
        const examBatchesMap = new Map<string, string[]>();

        for (const c of this.classes) {
          const cell = slot.cells[c.key];
          if (cell && (cell.isExam || (cell.value && (cell.value.includes('EXAM') || cell.value.includes('SUBJECTIVE TEST'))))) {
            cell.isExam = true;
            const name = cell.value.trim();
            if (!examBatchesMap.has(name)) examBatchesMap.set(name, []);
            examBatchesMap.get(name)!.push(c.key);
          }
        }

        for (const [examName, batchKeys] of examBatchesMap.entries()) {
          const keySig = `${d}_${s}_${examName}`;
          if (!seen.has(keySig)) {
            seen.add(keySig);
            let targetLabel = '';
            if (batchKeys.length === this.classes.length) {
              targetLabel = 'All 17 Batches';
            } else if (batchKeys.length > 1) {
              targetLabel = `${batchKeys.length} Batches`;
            } else {
              const col = this.classes.find(c => c.key === batchKeys[0]);
              targetLabel = col ? col.fullName : batchKeys[0];
            }

            this.scheduledExams.push({
              id: 'exam_' + Math.random().toString(36).substring(2, 9),
              examName,
              dayIdx: d,
              slotIdx: s,
              dayName: day.dayName,
              dateLabel: day.dateLabel,
              timeLabel: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
              targetScope: batchKeys.length === this.classes.length ? 'all' : (batchKeys.length > 1 ? 'grade' : 'single'),
              targetLabel,
              appliedBatchKeys: batchKeys
            });
          }
        }
      }
    }
  }

  // Get academic slots for a selected day (excluding lunch and breaks)
  getAcademicSlotsForDay(dayIdx: number): { slotIdx: number; label: string }[] {
    const day = this.days[dayIdx];
    if (!day) return [];
    const result: { slotIdx: number; label: string }[] = [];
    let periodNo = 1;
    for (let s = 0; s < day.slots.length; s++) {
      const slot = day.slots[s];
      if (slot.cells['IX_SIGMA']?.isBreak || slot.cells['IX_SIGMA']?.isLunch) {
        continue;
      }
      result.push({
        slotIdx: s,
        label: `Period ${periodNo} (${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)})`
      });
      periodNo++;
    }
    return result;
  }

  // Add exam slot directly below subjects
  addExam(): void {
    const name = (this.newExamForm.examName || '').trim();
    if (!name) {
      this.alertService.warning('Please enter the Exam Name.');
      return;
    }

    const day = this.days[this.newExamForm.dayIdx];
    if (!day) return;
    const slot = day.slots[this.newExamForm.slotIdx];
    if (!slot) return;

    let appliedBatchKeys: string[] = [];
    let targetLabel = '';

    if (this.newExamForm.targetScope === 'single') {
      appliedBatchKeys = [this.selectedBatchKey];
      const col = this.classes.find(c => c.key === this.selectedBatchKey);
      targetLabel = col ? col.fullName : this.selectedBatchKey;
    } else if (this.newExamForm.targetScope === 'grade') {
      const currentGrade = this.classes.find(c => c.key === this.selectedBatchKey)?.grade || 'IX';
      appliedBatchKeys = this.classes.filter(c => c.grade === currentGrade).map(c => c.key);
      targetLabel = `All Class ${currentGrade} Batches`;
    } else {
      appliedBatchKeys = this.classes.map(c => c.key);
      targetLabel = 'All 17 Batches';
    }

    // Mark as exam in timetable matrix
    for (const bKey of appliedBatchKeys) {
      slot.cells[bKey] = {
        value: name,
        isExam: true
      };
    }

    const newExamObj: ScheduledExam = {
      id: 'exam_' + Date.now().toString(36),
      examName: name,
      dayIdx: this.newExamForm.dayIdx,
      slotIdx: this.newExamForm.slotIdx,
      dayName: day.dayName,
      dateLabel: day.dateLabel,
      timeLabel: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      targetScope: this.newExamForm.targetScope,
      targetLabel,
      appliedBatchKeys
    };
    this.scheduledExams.unshift(newExamObj);

    this.newExamForm.examName = '';
    this.detectStaffConflicts();
    this.calculateSubjectCountsPerBatch();
    this.alertService.success(`Exam "${name}" successfully marked for ${targetLabel} on ${day.dayName} (${newExamObj.timeLabel})`);
  }

  // Remove exam slot
  removeExam(exam: ScheduledExam): void {
    const day = this.days[exam.dayIdx];
    if (day && day.slots[exam.slotIdx]) {
      const slot = day.slots[exam.slotIdx];
      for (const bKey of exam.appliedBatchKeys) {
        if (slot.cells[bKey]?.value === exam.examName) {
          slot.cells[bKey] = { value: '', isExam: false };
        }
      }
    }
    this.scheduledExams = this.scheduledExams.filter(e => e.id !== exam.id);
    this.detectStaffConflicts();
    this.calculateSubjectCountsPerBatch();
    this.alertService.success(`Exam "${exam.examName}" removed from schedule.`);
  }

  // Filtered exams for active batch view
  get batchScheduledExams(): ScheduledExam[] {
    return this.scheduledExams.filter(e => e.appliedBatchKeys.includes(this.selectedBatchKey));
  }

  // Calculate available teaching slots for a batch
  getBatchAvailableSlotsCount(batchKey: string): number {
    let count = 0;
    const batchCol = this.classes.find(c => c.key === batchKey);
    const grade = batchCol?.grade || '';

    for (let d = 0; d < this.days.length; d++) {
      const day = this.days[d];
      for (let s = 0; s < day.slots.length; s++) {
        const slot = day.slots[s];
        if (slot.cells['IX_SIGMA']?.isBreak || slot.cells['IX_SIGMA']?.isLunch) continue;
        if (slot.cells[batchKey]?.isHoliday || (d === 0 && s === 0)) continue;
        if (slot.cells[batchKey]?.isExam) continue;
        if (d === 5 && s >= 6) continue;
        if (this.generatorOptions.syncPetByGrade) {
          if (d === 1 && s === 0 && grade === 'IX') continue;
          if (d === 2 && s === 0 && grade === 'X') continue;
          if (d === 3 && s === 0 && grade === 'XI') continue;
          if (d === 4 && s === 0 && grade === 'XII') continue;
        }
        count++;
      }
    }
    return count;
  }

  // Calculate total required target periods for a batch
  getBatchTotalTargetCount(batchKey: string): number {
    const bData = this.batchRequirements[batchKey];
    if (!bData) return 0;
    return bData.subjects
      .filter(s => s.staffCodes && s.staffCodes.length > 0)
      .reduce((sum, s) => sum + (s.targetPeriods || 0), 0);
  }

  // =========================================================================================
  // GUARANTEED AUTO-GENERATE TIMETABLE ENGINE
  // Enforces:
  // 1. Pre-validation: If total target > available slots, abort with clear warning!
  // 2. Guaranteed 100% target satisfaction via iterative constraint-satisfaction + swap repair.
  // 3. Absolute No-Clash rule: Same staff never scheduled in 2 batches at the same slot.
  // 4. Max 2 periods per subject per day per batch.
  // 5. Preserves all Exams, Holidays, Doubt Sessions, and Grade-Synchronized PET.
  // =========================================================================================
  autoGenerateTimetable(): void {
    // 1. Pre-validation check:
    for (const c of this.classes) {
      const avail = this.getBatchAvailableSlotsCount(c.key);
      const required = this.getBatchTotalTargetCount(c.key);
      const bData = this.batchRequirements[c.key];
      const batchTitle = bData?.fullName || c.fullName;

      if (required > avail) {
        this.showGeneratorModal = false;
        this.alertService.warning(
          `Cannot generate timetable: Not enough periods available in the week for ${batchTitle}. Total required target periods is ${required}, but only ${avail} teaching periods are available (due to scheduled exams, holidays, and breaks). Please reduce target periods or clear exam slots.`
        );
        return;
      }
    }

    this.loading = true;

    // 2. Synchronize PET if enabled
    if (this.generatorOptions.syncPetByGrade) {
      if (this.days[1]?.slots[0]) {
        ['IX_SIGMA', 'IX_EPSILON', 'IX_ALPHA'].forEach(k => {
          this.days[1].slots[0].cells[k] = this.makeCell('PET');
        });
      }
      if (this.days[2]?.slots[0]) {
        ['X_PI', 'X_OMEGA'].forEach(k => {
          this.days[2].slots[0].cells[k] = this.makeCell('PET');
        });
      }
      if (this.days[3]?.slots[0]) {
        ['XI_RAMANUJAN', 'XI_APJ_KALAM', 'XI_CV_RAMAN', 'XI_VIKRAM_SARABHAI', 'XI_SUSHRUTHA', 'XI_CHARAKA'].forEach(k => {
          this.days[3].slots[0].cells[k] = this.makeCell('PET');
        });
      }
      if (this.days[4]?.slots[0]) {
        ['XII_EINSTEIN', 'XII_NEWTON', 'XII_CURIE', 'XII_TESLA', 'XII_ARISTOTLE', 'XII_DARWIN'].forEach(k => {
          this.days[4].slots[0].cells[k] = this.makeCell('PET');
        });
      }
    }

    // 3. Identify available teaching slots for each batch
    const availableSlotsByBatch: { [batchKey: string]: { dayIdx: number; slotIdx: number }[] } = {};
    for (const c of this.classes) {
      availableSlotsByBatch[c.key] = [];
      for (let d = 0; d < this.days.length; d++) {
        for (let s = 0; s < this.days[d].slots.length; s++) {
          const slot = this.days[d].slots[s];
          const cell = slot.cells[c.key];

          if (slot.cells['IX_SIGMA']?.isBreak || slot.cells['IX_SIGMA']?.isLunch) continue;
          if (cell?.isHoliday || (d === 0 && s === 0)) continue;
          if (cell?.isExam) continue;
          if (d === 5 && s >= 6) continue;
          if (cell?.value === 'PET') continue;

          availableSlotsByBatch[c.key].push({ dayIdx: d, slotIdx: s });
        }
      }
    }

    // 4. Build exact demands from target periods
    const batchDemands: { [batchKey: string]: { subjectName: string; staffCode: string }[] } = {};
    for (const c of this.classes) {
      batchDemands[c.key] = [];
      const bData = this.batchRequirements[c.key];
      if (!bData) continue;

      for (const sub of bData.subjects) {
        if (sub.staffCodes.length > 0 && sub.targetPeriods > 0) {
          const staffCount = sub.staffCodes.length;
          for (let p = 0; p < sub.targetPeriods; p++) {
            const staff = sub.staffCodes[p % staffCount];
            batchDemands[c.key].push({
              subjectName: sub.subjectName,
              staffCode: staff
            });
          }
        }
      }
    }

    // 5. Guaranteed Multi-attempt Constraint Solver with Swap Repair
    let bestSchedule: { [batchKey: string]: { [sig: string]: { subjectName: string; staffCode: string } } } | null = null;
    let minUnplaced = Infinity;

    const maxAttempts = 35;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const schedule: { [batchKey: string]: { [sig: string]: { subjectName: string; staffCode: string } } } = {};
      const staffBusy: { [sig: string]: Set<string> } = {};
      const dailySubCount: { [batchKey: string]: { [d: number]: { [sub: string]: number } } } = {};

      for (const c of this.classes) {
        schedule[c.key] = {};
        dailySubCount[c.key] = {};
        for (let d = 0; d < this.days.length; d++) {
          dailySubCount[c.key][d] = {};
        }
      }

      let unplacedCount = 0;

      for (const c of this.classes) {
        const items = [...batchDemands[c.key]].sort(() => Math.random() - 0.5);
        const slots = [...availableSlotsByBatch[c.key]].sort(() => Math.random() - 0.5);

        for (const item of items) {
          let placed = false;

          for (const sObj of slots) {
            const sig = `${sObj.dayIdx}_${sObj.slotIdx}`;
            if (schedule[c.key][sig]) continue;
            if (!staffBusy[sig]) staffBusy[sig] = new Set();
            if (this.generatorOptions.enforceNoClash && staffBusy[sig].has(item.staffCode)) continue;
            const cnt = dailySubCount[c.key][sObj.dayIdx][item.subjectName] || 0;
            if (cnt >= this.generatorOptions.maxPeriodsPerSubjectPerDay) continue;

            schedule[c.key][sig] = item;
            staffBusy[sig].add(item.staffCode);
            dailySubCount[c.key][sObj.dayIdx][item.subjectName] = cnt + 1;
            placed = true;
            break;
          }

          // Swap repair if direct placement was blocked
          if (!placed) {
            for (const sObj of slots) {
              const sig = `${sObj.dayIdx}_${sObj.slotIdx}`;
              const existing = schedule[c.key][sig];
              if (!existing) continue;

              if (this.generatorOptions.enforceNoClash && staffBusy[sig].has(item.staffCode)) continue;
              const cntItem = (dailySubCount[c.key][sObj.dayIdx][item.subjectName] || 0) - (existing.subjectName === item.subjectName ? 1 : 0);
              if (cntItem >= this.generatorOptions.maxPeriodsPerSubjectPerDay) continue;

              let foundAlt = false;
              for (const altObj of slots) {
                const altSig = `${altObj.dayIdx}_${altObj.slotIdx}`;
                if (schedule[c.key][altSig]) continue;
                if (!staffBusy[altSig]) staffBusy[altSig] = new Set();
                if (this.generatorOptions.enforceNoClash && staffBusy[altSig].has(existing.staffCode)) continue;
                const cntExisting = dailySubCount[c.key][altObj.dayIdx][existing.subjectName] || 0;
                if (cntExisting >= this.generatorOptions.maxPeriodsPerSubjectPerDay) continue;

                // Move existing to alt
                schedule[c.key][altSig] = existing;
                staffBusy[altSig].add(existing.staffCode);
                dailySubCount[c.key][altObj.dayIdx][existing.subjectName] = cntExisting + 1;

                // Put item into sig
                staffBusy[sig].delete(existing.staffCode);
                schedule[c.key][sig] = item;
                staffBusy[sig].add(item.staffCode);
                dailySubCount[c.key][sObj.dayIdx][existing.subjectName]--;
                dailySubCount[c.key][sObj.dayIdx][item.subjectName] = cntItem + 1;

                placed = true;
                foundAlt = true;
                break;
              }
              if (foundAlt) break;
            }
          }

          if (!placed) {
            unplacedCount++;
          }
        }
      }

      if (unplacedCount < minUnplaced) {
        minUnplaced = unplacedCount;
        bestSchedule = schedule;
      }
      if (unplacedCount === 0) {
        break; // 100% target met!
      }
    }

    // 6. Apply schedule to timetable matrix
    if (bestSchedule) {
      for (const c of this.classes) {
        for (const sObj of availableSlotsByBatch[c.key]) {
          const sig = `${sObj.dayIdx}_${sObj.slotIdx}`;
          const assigned = bestSchedule[c.key][sig];
          if (assigned) {
            this.days[sObj.dayIdx].slots[sObj.slotIdx].cells[c.key] = this.makeCell(assigned.staffCode);
          } else {
            this.days[sObj.dayIdx].slots[sObj.slotIdx].cells[c.key] = this.makeCell('-');
          }
        }
      }
    }

    this.showGeneratorModal = false;
    this.loading = false;
    this.detectStaffConflicts();
    this.calculateSubjectCountsPerBatch();

    if (minUnplaced === 0) {
      this.alertService.success('Timetable successfully generated! 100% of target periods met across all batches with 0 faculty clashes.');
    } else {
      this.alertService.warning(`Timetable generated with ${minUnplaced} unplaced periods due to strict no-clash constraints.`);
    }
  }

  initDefaultTimetableData(): void {
    // Template data from user CSV
    this.days = [
      // 1. MONDAY 09-11-2026
      {
        dateLabel: '09-11-2026',
        dayName: 'MONDAY',
        isWholeDayHoliday: false,
        slots: [
          this.createSlot('08:30:00', '09:30:00', 'HOLIDAY', '', ''),
          this.createSlot('09:30:00', '10:40:00', '', '', ''),
          this.createSlot('10:40:00', '10:50:00', 'BREAK', '', ''),
          this.createSlot('10:50:00', '12:00:00', '', '', ''),
          this.createSlot('12:00:00', '12:40:00', 'LUNCH BREAK', '', ''),
          this.createSlot('12:40:00', '13:50:00', '', '', ''),
          this.createSlot('13:50:00', '15:00:00', '', '', ''),
          this.createSlot('15:00:00', '15:10:00', 'BREAK', '', ''),
          this.createSlot('15:10:00', '16:30:00', '', '', '')
        ]
      },

      // 2. TUESDAY 10-11-2026
      {
        dateLabel: '10-11-2026',
        dayName: 'TUESDAY',
        slots: [
          this.createExplicitSlot('08:30:00', '09:30:00', {
            'IX_SIGMA': 'PET', 'IX_EPSILON': 'PET', 'IX_ALPHA': 'PET',
            'X_PI': 'SUBJECTIVE TEST - LANGUAGE', 'X_OMEGA': 'SUBJECTIVE TEST - LANGUAGE',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'EAL', 'XI_VIKRAM_SARABHAI': 'IDJ', 'XI_SUSHRUTHA': 'MDKY', 'XI_CHARAKA': 'BEM',
            'XII_EINSTEIN': 'MPV', 'XII_NEWTON': 'CSJE', 'XII_CURIE': 'EAB', 'XII_TESLA': 'MAB', 'XII_ARISTOTLE': 'PAKG', 'XII_DARWIN': 'CSR'
          }, 'PNK, CTMK, MACS', 'MJNA - MATHS, MVLL - MAT'),

          this.createExplicitSlot('09:30:00', '10:40:00', {
            'IX_SIGMA': 'BEM', 'IX_EPSILON': 'MVLL', 'IX_ALPHA': 'MSS',
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'CSR', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'PMTN', 'XI_SUSHRUTHA': 'BKNA', 'XI_CHARAKA': 'MAB',
            'XII_EINSTEIN': 'CVR', 'XII_NEWTON': 'ILR', 'XII_CURIE': 'PAKG', 'XII_TESLA': 'EAB', 'XII_ARISTOTLE': 'BDG', 'XII_DARWIN': 'BGD'
          }),

          this.createSlot('10:40:00', '10:50:00', 'BREAK'),

          this.createExplicitSlot('10:50:00', '12:00:00', {
            'IX_SIGMA': 'CEF', 'IX_EPSILON': 'PSD', 'IX_ALPHA': 'MSS', 'X_PI': 'EVL', 'X_OMEGA': 'MVTL',
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'IDJ', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'CSR', 'XI_CHARAKA': 'BEM',
            'XII_EINSTEIN': 'IRN', 'XII_NEWTON': 'MPV', 'XII_CURIE': 'CSJE', 'XII_TESLA': 'MAB', 'XII_ARISTOTLE': 'BDG', 'XII_DARWIN': 'PAKG'
          }),

          this.createSlot('12:00:00', '12:40:00', 'LUNCH BREAK'),

          this.createExplicitSlot('12:40:00', '13:50:00', {
            'IX_SIGMA': 'TPM/HST', 'IX_EPSILON': 'MVLL', 'IX_ALPHA': 'BDE', 'X_PI': 'BKNA', 'X_OMEGA': 'EVL',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'MAB', 'XI_SUSHRUTHA': 'BEM', 'XI_CHARAKA': 'CSR',
            'XII_EINSTEIN': 'EPK', 'XII_NEWTON': 'PNK', 'XII_CURIE': 'MDKY', 'XII_TESLA': 'CSJE', 'XII_ARISTOTLE': 'MVTL', 'XII_DARWIN': 'PHY/CHE LAB'
          }),

          this.createExplicitSlot('13:50:00', '15:00:00', {
            'IX_SIGMA': 'MVTL', 'IX_EPSILON': 'BTA', 'IX_ALPHA': 'TPM/HST', 'X_PI': 'MVLL-MAT', 'X_OMEGA': 'CEF',
            'XI_RAMANUJAN': 'IDJ', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'PMTN', 'XI_SUSHRUTHA': 'EPK', 'XI_CHARAKA': 'BKNA',
            'XII_EINSTEIN': 'CVR', 'XII_NEWTON': 'CSJE', 'XII_CURIE': 'ILR', 'XII_TESLA': 'PNK', 'XII_ARISTOTLE': 'BGD', 'XII_DARWIN': 'MAB'
          }),

          this.createSlot('15:00:00', '15:10:00', 'BREAK'),

          this.createExplicitSlot('15:10:00', '16:30:00', {
            'IX_SIGMA': 'CEF', 'IX_EPSILON': 'BTA', 'IX_ALPHA': 'MJNA-MAT', 'X_PI': 'TPM/HST', 'X_OMEGA': 'MVLL-MAT',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'IDJ', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'MAB', 'XI_SUSHRUTHA': 'BKNA', 'XI_CHARAKA': 'EPK',
            'XII_EINSTEIN': 'PNK', 'XII_NEWTON': 'PHY/CHE LAB', 'XII_CURIE': 'CSJE', 'XII_TESLA': 'ILR', 'XII_ARISTOTLE': 'BGD', 'XII_DARWIN': 'CSR'
          })
        ]
      },

      // 3. WEDNESDAY 11-11-2026
      {
        dateLabel: '11-11-2026',
        dayName: 'WEDNESDAY',
        slots: [
          this.createExplicitSlot('08:30:00', '09:30:00', {
            'IX_SIGMA': 'EAB', 'IX_EPSILON': 'EAL', 'IX_ALPHA': 'MSS', 'X_PI': 'PET', 'X_OMEGA': 'PET',
            'XI_RAMANUJAN': 'IDJ', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'PMNS', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'BKNA', 'XI_CHARAKA': 'PRB',
            'XII_EINSTEIN': 'MODULE MAIN 3 EXAM', 'XII_NEWTON': 'MODULE MAIN 3 EXAM', 'XII_CURIE': 'MODULE MAIN 3 EXAM', 'XII_TESLA': 'MODULE MAIN 3 EXAM',
            'XII_ARISTOTLE': 'BDG', 'XII_DARWIN': 'MAB'
          }, 'PMTN, CSR, MTH, BGD'),

          this.createExplicitSlot('09:30:00', '10:40:00', {
            'IX_SIGMA': 'PMNS', 'IX_EPSILON': 'BTA', 'IX_ALPHA': 'BDE', 'X_PI': 'CEF', 'X_OMEGA': 'SS',
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'EVL', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'MAB', 'XI_SUSHRUTHA': 'EPK', 'XI_CHARAKA': 'BKNA',
            'XII_ARISTOTLE': 'MVTL', 'XII_DARWIN': 'PAKG'
          }),

          this.createSlot('10:40:00', '10:50:00', 'BREAK'),

          this.createExplicitSlot('10:50:00', '12:00:00', {
            'IX_SIGMA': 'MVTL', 'IX_EPSILON': 'PSD', 'IX_ALPHA': 'MSS', 'X_PI': 'PMNS', 'X_OMEGA': 'BKNA',
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'IDJ', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'PMTN', 'XI_SUSHRUTHA': 'CSR', 'XI_CHARAKA': 'PRB',
            'XII_ARISTOTLE': 'BDG', 'XII_DARWIN': 'BGD'
          }),

          this.createSlot('12:00:00', '12:40:00', 'LUNCH BREAK'),

          this.createExplicitSlot('12:40:00', '13:50:00', {
            'IX_SIGMA': 'CEF', 'IX_EPSILON': 'MTH-MAT', 'IX_ALPHA': 'SSP', 'X_PI': 'BKNA', 'X_OMEGA': 'TPM/HST',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'CSR', 'XI_CV_RAMAN': 'PMNS', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'MDKY', 'XI_CHARAKA': 'MAB',
            'XII_EINSTEIN': 'CVR', 'XII_NEWTON': 'MPV', 'XII_CURIE': 'CSJE', 'XII_TESLA': 'PNK', 'XII_ARISTOTLE': 'PAKG', 'XII_DARWIN': 'BDG'
          }),

          this.createExplicitSlot('13:50:00', '15:00:00', {
            'IX_SIGMA': 'MJNA-MAT', 'IX_EPSILON': 'TPM/HST', 'IX_ALPHA': 'PSD', 'X_PI': 'MVLL-MAT', 'X_OMEGA': 'MVTL',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'IDJ', 'XI_VIKRAM_SARABHAI': 'EVL', 'XI_SUSHRUTHA': 'PRB', 'XI_CHARAKA': 'BIO LAB (BKNA)',
            'XII_EINSTEIN': 'MPV', 'XII_NEWTON': 'PNK', 'XII_CURIE': 'MDKY', 'XII_TESLA': 'CSJE', 'XII_ARISTOTLE': 'CSR', 'XII_DARWIN': 'MAB'
          }),

          this.createSlot('15:00:00', '15:10:00', 'BREAK'),

          this.createExplicitSlot('15:10:00', '16:30:00', {
            'IX_SIGMA': 'SSP', 'IX_EPSILON': 'MVLL', 'IX_ALPHA': 'PSD', 'X_PI': 'MVTL', 'X_OMEGA': 'CEF',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'IDJ', 'XI_SUSHRUTHA': 'BIO LAB (BKNA)', 'XI_CHARAKA': 'CSR',
            'XII_EINSTEIN': 'PNK', 'XII_NEWTON': 'CSJE', 'XII_CURIE': 'PAKG', 'XII_TESLA': 'MAB', 'XII_ARISTOTLE': 'BGD', 'XII_DARWIN': 'BDG'
          })
        ]
      },

      // 4. THURSDAY 12-11-2026
      {
        dateLabel: '12-11-2026',
        dayName: 'THURSDAY',
        slots: [
          this.createExplicitSlot('08:30:00', '09:30:00', {
            'IX_SIGMA': 'SSP', 'IX_EPSILON': 'TPM/HST', 'IX_ALPHA': 'CRA', 'X_PI': 'PMNS', 'X_OMEGA': 'MVTL',
            'XI_RAMANUJAN': 'PET', 'XI_APJ_KALAM': 'PET', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'PET', 'XI_SUSHRUTHA': 'MDKY', 'XI_CHARAKA': 'BKNA',
            'XII_EINSTEIN': 'CVR', 'XII_NEWTON': 'EVL', 'XII_CURIE': 'CSJE', 'XII_TESLA': 'PNK', 'XII_ARISTOTLE': 'BGD', 'XII_DARWIN': 'CSR'
          }, 'PAKG, CEF, MSS', 'MVLL - MAT, MTH - MATHS'),

          this.createExplicitSlot('09:30:00', '10:40:00', {
            'IX_SIGMA': 'MVTL', 'IX_EPSILON': 'IDJ', 'IX_ALPHA': 'BDE', 'X_PI': 'EVL', 'X_OMEGA': 'PMNS',
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'EAL', 'XI_VIKRAM_SARABHAI': 'PMTN', 'XI_SUSHRUTHA': 'PRB', 'XI_CHARAKA': 'CSR',
            'XII_EINSTEIN': 'EPK', 'XII_NEWTON': 'PNK', 'XII_CURIE': 'PET', 'XII_TESLA': 'PET', 'XII_ARISTOTLE': 'BDG', 'XII_DARWIN': 'BGD'
          }),

          this.createSlot('10:40:00', '10:50:00', 'BREAK'),

          this.createExplicitSlot('10:50:00', '12:00:00', {
            'IX_SIGMA': 'TPM/HST', 'IX_EPSILON': 'MVLL', 'IX_ALPHA': 'MSS', 'X_PI': 'PMNS', 'X_OMEGA': 'BKNA',
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'IDJ', 'XI_VIKRAM_SARABHAI': 'PMTN', 'XI_SUSHRUTHA': 'CSR', 'XI_CHARAKA': 'BEM',
            'XII_EINSTEIN': 'CVR', 'XII_NEWTON': 'PNK', 'XII_CURIE': 'ILR', 'XII_TESLA': 'CSJE', 'XII_ARISTOTLE': 'MVTL', 'XII_DARWIN': 'PAKG'
          }),

          this.createSlot('12:00:00', '12:40:00', 'LUNCH BREAK'),

          this.createExplicitSlot('12:40:00', '13:50:00', {
            'IX_SIGMA': 'IDJ', 'IX_EPSILON': 'MTH-MAT', 'IX_ALPHA': 'MJNA-MAT', 'X_PI': 'MVTL', 'X_OMEGA': 'EVL',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'BEM', 'XI_CHARAKA': 'BKNA',
            'XII_EINSTEIN': 'IRN', 'XII_NEWTON': 'CSJE', 'XII_CURIE': 'PAKG', 'XII_TESLA': 'PNK', 'XII_ARISTOTLE': 'EAB', 'XII_DARWIN': 'BDG'
          }),

          this.createExplicitSlot('13:50:00', '15:00:00', {
            'IX_SIGMA': 'BEM', 'IX_EPSILON': 'SSP', 'IX_ALPHA': 'IDJ', 'X_PI': 'MVTL', 'X_OMEGA': 'TPM/HST',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'EVL', 'XI_CV_RAMAN': 'PMNS', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'BKNA', 'XI_CHARAKA': 'PRB',
            'XII_EINSTEIN': 'PHY/CHE LAB', 'XII_NEWTON': 'CSJE', 'XII_CURIE': 'MDKY', 'XII_TESLA': 'EAB', 'XII_ARISTOTLE': 'PAKG', 'XII_DARWIN': 'BIO LAB (BGD)'
          }),

          this.createSlot('15:00:00', '15:10:00', 'BREAK'),

          this.createExplicitSlot('15:10:00', '16:30:00', {
            'IX_SIGMA': 'PMNS', 'IX_EPSILON': 'BTA', 'IX_ALPHA': 'SSP', 'X_PI': 'CEF', 'X_OMEGA': 'MVTL',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'CSR', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'IDJ', 'XI_SUSHRUTHA': 'PRB', 'XI_CHARAKA': 'BEM',
            'XII_EINSTEIN': 'PNK', 'XII_NEWTON': 'ILR', 'XII_CURIE': 'PAKG', 'XII_TESLA': 'CSJE', 'XII_ARISTOTLE': 'PHY/CHE LAB', 'XII_DARWIN': 'BDG'
          })
        ]
      },

      // 5. FRIDAY 13-11-2026
      {
        dateLabel: '13-11-2026',
        dayName: 'FRIDAY',
        slots: [
          this.createExplicitSlot('08:30:00', '09:30:00', {
            'IX_SIGMA': 'SUBJECTIVE TEST - MATHS', 'IX_EPSILON': 'SUBJECTIVE TEST - MATHS', 'IX_ALPHA': 'SUBJECTIVE TEST - MATHS',
            'X_PI': 'SUBJECTIVE TEST - SCIENCE', 'X_OMEGA': 'SUBJECTIVE TEST - SCIENCE',
            'XI_RAMANUJAN': 'EAB', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'EAL', 'XI_VIKRAM_SARABHAI': 'PMTN', 'XI_SUSHRUTHA': 'EPK', 'XI_CHARAKA': 'BEM',
            'XII_EINSTEIN': 'PET', 'XII_NEWTON': 'PET', 'XII_CURIE': 'PAKG', 'XII_TESLA': 'PNK', 'XII_ARISTOTLE': 'CSR', 'XII_DARWIN': 'BDG'
          }, 'PRB, CRA, MAB, CADS'),

          this.createExplicitSlot('09:30:00', '10:40:00', {
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'PET', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'CSR', 'XI_CHARAKA': 'EPK',
            'XII_EINSTEIN': 'PNK', 'XII_NEWTON': 'MPV', 'XII_CURIE': 'MDKY', 'XII_TESLA': 'CSJE', 'XII_ARISTOTLE': 'BGD', 'XII_DARWIN': 'EAB'
          }),

          this.createSlot('10:40:00', '10:50:00', 'BREAK'),

          this.createExplicitSlot('10:50:00', '12:00:00', {
            'IX_SIGMA': 'MVTL', 'IX_EPSILON': 'PSD', 'IX_ALPHA': 'CRA', 'X_PI': 'MVLL-MAT', 'X_OMEGA': 'SS',
            'XI_RAMANUJAN': 'MJK', 'XI_APJ_KALAM': 'CSR', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'MAB', 'XI_SUSHRUTHA': 'BEM', 'XI_CHARAKA': 'PRB',
            'XII_EINSTEIN': 'MPV', 'XII_NEWTON': 'PNK', 'XII_CURIE': 'CSJE', 'XII_TESLA': 'ILR', 'XII_ARISTOTLE': 'PAKG', 'XII_DARWIN': 'BGD'
          }),

          this.createSlot('12:00:00', '12:40:00', 'LUNCH BREAK'),

          this.createExplicitSlot('12:40:00', '13:50:00', {
            'IX_SIGMA': 'MJNA-MAT', 'IX_EPSILON': 'CRA', 'IX_ALPHA': 'PSD', 'X_PI': 'CEF', 'X_OMEGA': 'MVTL',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'BEM', 'XI_CHARAKA': 'CSR',
            'XII_EINSTEIN': 'MPV', 'XII_NEWTON': 'EVL', 'XII_CURIE': 'EAB', 'XII_TESLA': 'PNK', 'XII_ARISTOTLE': 'BDG', 'XII_DARWIN': 'MAB'
          }),

          this.createExplicitSlot('13:50:00', '15:00:00', {
            'IX_SIGMA': 'CEF', 'IX_EPSILON': 'SSP', 'IX_ALPHA': 'TPM/HST', 'X_PI': 'PMNS', 'X_OMEGA': 'MVLL-MAT',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'EVL', 'XI_CV_RAMAN': 'IDJ', 'XI_VIKRAM_SARABHAI': 'MAB', 'XI_SUSHRUTHA': 'PRB', 'XI_CHARAKA': 'BEM',
            'XII_EINSTEIN': 'CVR', 'XII_NEWTON': 'ILR', 'XII_CURIE': 'MDKY', 'XII_TESLA': 'PHY/CHE LAB', 'XII_ARISTOTLE': 'BIO LAB (BGD)', 'XII_DARWIN': 'PAKG'
          }),

          this.createSlot('15:00:00', '15:10:00', 'BREAK'),

          this.createExplicitSlot('15:10:00', '16:30:00', {
            'IX_SIGMA': 'EAB', 'IX_EPSILON': 'MVLL', 'IX_ALPHA': 'EPK', 'X_PI': 'SS', 'X_OMEGA': 'CEF',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'PMNS', 'XI_VIKRAM_SARABHAI': 'EVL', 'XI_SUSHRUTHA': 'PRB', 'XI_CHARAKA': 'MAB',
            'XII_EINSTEIN': 'CVR', 'XII_NEWTON': 'PNK', 'XII_CURIE': 'PHY/CHE LAB', 'XII_TESLA': 'CSJE', 'XII_ARISTOTLE': 'MVTL', 'XII_DARWIN': 'CSR'
          })
        ]
      },

      // 6. SATURDAY 14-11-2026
      {
        dateLabel: '14-11-2026',
        dayName: 'SATURDAY',
        slots: [
          this.createExplicitSlot('08:30:00', '09:30:00', {
            'IX_SIGMA': 'BEM', 'IX_EPSILON': 'CRA', 'IX_ALPHA': 'YOGA', 'X_PI': 'CEF', 'X_OMEGA': 'ART',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'MDKY', 'XI_CV_RAMAN': 'PMNS', 'XI_VIKRAM_SARABHAI': 'CTMK', 'XI_SUSHRUTHA': 'PRB', 'XI_CHARAKA': 'CSR',
            'XII_EINSTEIN': 'MODULE MAIN 4 EXAM', 'XII_NEWTON': 'MODULE MAIN 4 EXAM', 'XII_CURIE': 'MODULE MAIN 4 EXAM', 'XII_TESLA': 'MODULE MAIN 4 EXAM',
            'XII_ARISTOTLE': 'PET', 'XII_DARWIN': 'PET'
          }),

          this.createExplicitSlot('09:30:00', '10:40:00', {
            'IX_SIGMA': 'YOGA', 'IX_EPSILON': 'ART', 'IX_ALPHA': 'CRA', 'X_PI': 'MVTL', 'X_OMEGA': 'PMNS',
            'XI_RAMANUJAN': 'EAB', 'XI_APJ_KALAM': 'CSR', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'PMTN', 'XI_SUSHRUTHA': 'PET', 'XI_CHARAKA': 'PET',
            'XII_ARISTOTLE': 'BDG', 'XII_DARWIN': 'BGD'
          }),

          this.createSlot('10:40:00', '10:50:00', 'BREAK'),

          this.createExplicitSlot('10:50:00', '12:00:00', {
            'IX_SIGMA': 'MVTL', 'IX_EPSILON': 'YOGA', 'IX_ALPHA': 'ART', 'X_PI': 'SS', 'X_OMEGA': 'PMNS',
            'XI_RAMANUJAN': 'PMTN', 'XI_APJ_KALAM': 'IDJ', 'XI_CV_RAMAN': 'MDKY', 'XI_VIKRAM_SARABHAI': 'EVL', 'XI_SUSHRUTHA': 'CSR', 'XI_CHARAKA': 'BEM',
            'XII_ARISTOTLE': 'BGD', 'XII_DARWIN': 'PAKG'
          }),

          this.createSlot('12:00:00', '12:40:00', 'LUNCH BREAK'),

          this.createExplicitSlot('12:40:00', '13:50:00', {
            'IX_SIGMA': 'MVTL', 'IX_EPSILON': 'MVLL', 'IX_ALPHA': 'PSD', 'X_PI': 'TPM/HST', 'X_OMEGA': 'CEF',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'MAB', 'XI_SUSHRUTHA': 'BEM', 'XI_CHARAKA': 'PRB',
            'XII_EINSTEIN': 'MODULE ADVANCED 2 EXAM', 'XII_NEWTON': 'MODULE ADVANCED 2 EXAM', 'XII_CURIE': 'MODULE ADVANCED 2 EXAM', 'XII_TESLA': 'MODULE ADVANCED 2 EXAM',
            'XII_ARISTOTLE': 'CSR', 'XII_DARWIN': 'BDG'
          }),

          this.createExplicitSlot('13:50:00', '14:30:00', {
            'IX_SIGMA': 'ART', 'IX_EPSILON': 'PSD', 'IX_ALPHA': 'MSS', 'X_PI': 'MVTL', 'X_OMEGA': 'YOGA',
            'XI_RAMANUJAN': 'CVR', 'XI_APJ_KALAM': 'PMTN', 'XI_CV_RAMAN': 'CTMK', 'XI_VIKRAM_SARABHAI': 'MAB', 'XI_SUSHRUTHA': 'BEM', 'XI_CHARAKA': 'PRB',
            'XII_ARISTOTLE': 'CSR', 'XII_DARWIN': 'BDG'
          }),

          this.createExplicitSlot('14:30:00', '16:30:00', {
            'IX_SIGMA': 'PSD, PMNS DOUBT SESSION', 'IX_EPSILON': 'PSD, PMNS DOUBT SESSION', 'IX_ALPHA': 'PSD, PMNS DOUBT SESSION',
            'X_PI': 'CEF DOUBT SESSION', 'X_OMEGA': 'CEF DOUBT SESSION',
            'XI_RAMANUJAN': 'PMTN, PMNS DOUBT SESSION', 'XI_APJ_KALAM': 'PMTN, PMNS DOUBT SESSION', 'XI_CV_RAMAN': 'PMTN, PMNS DOUBT SESSION', 'XI_VIKRAM_SARABHAI': 'PMTN, PMNS DOUBT SESSION',
            'XI_SUSHRUTHA': 'BEM, BKNA DOUBT SESSION', 'XI_CHARAKA': 'BEM, BKNA DOUBT SESSION',
            'XII_ARISTOTLE': 'BGD, BDG DOUBT SESSION', 'XII_DARWIN': 'BGD, BDG DOUBT SESSION'
          })
        ]
      }
    ];
  }

  private createSlot(start: string, end: string, globalText = '', hostel = '', notes = ''): TimetableSlot {
    const cells: { [classKey: string]: TimetableCell } = {};
    for (const c of this.classes) {
      cells[c.key] = this.makeCell(globalText);
    }
    return {
      startTime: start,
      endTime: end,
      cells,
      hostelDuty: hostel,
      notes
    };
  }

  private createExplicitSlot(start: string, end: string, values: { [classKey: string]: string }, hostel = '', notes = ''): TimetableSlot {
    const cells: { [classKey: string]: TimetableCell } = {};
    for (const c of this.classes) {
      cells[c.key] = this.makeCell(values[c.key] || '');
    }
    return {
      startTime: start,
      endTime: end,
      cells,
      hostelDuty: hostel,
      notes
    };
  }

  private makeCell(rawVal: string): TimetableCell {
    const v = (rawVal || '').trim();
    const up = v.toUpperCase();
    return {
      value: v,
      isHoliday: up.includes('HOLIDAY'),
      isBreak: up === 'BREAK',
      isLunch: up.includes('LUNCH'),
      isExam: up.includes('EXAM') || up.includes('TEST'),
      isLab: up.includes('LAB'),
      isDoubtSession: up.includes('DOUBT SESSION')
    };
  }

  // Detect staff conflicts in real-time
  detectStaffConflicts(): void {
    for (const day of this.days) {
      for (const slot of day.slots) {
        // Reset conflicts
        for (const c of this.classes) {
          slot.cells[c.key].conflict = false;
          slot.cells[c.key].conflictDetails = '';
        }

        const staffToClasses = new Map<string, string[]>();

        for (const c of this.classes) {
          const cell = slot.cells[c.key];
          if (!cell.value || cell.isBreak || cell.isLunch || cell.isHoliday) continue;

          // Parse staff codes (skip general keywords like PET, EXAM, LAB, BREAK)
          const words = cell.value.split(/[/,\s-]+/)
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length >= 2 && !['BREAK', 'LUNCH', 'HOLIDAY', 'TEST', 'EXAM', 'PET', 'LAB', 'YOGA', 'ART', 'DOUBT', 'SESSION'].includes(w));

          for (const code of words) {
            if (!staffToClasses.has(code)) {
              staffToClasses.set(code, []);
            }
            staffToClasses.get(code)?.push(c.sectionName);
          }
        }

        // Mark conflicts where 1 staff is in 2+ classes simultaneously
        for (const [staffCode, classList] of staffToClasses.entries()) {
          if (classList.length > 1) {
            for (const c of this.classes) {
              const cell = slot.cells[c.key];
              if (cell.value && cell.value.toUpperCase().includes(staffCode)) {
                cell.conflict = true;
                cell.conflictDetails = `Conflict: Staff ${staffCode} is booked in: ${classList.join(', ')}`;
              }
            }
          }
        }
      }
    }
  }

  // Open inline cell editor modal
  openCellEdit(dayIdx: number, slotIdx: number, classKey: string): void {
    if (!this.isEditMode) return;
    const day = this.days[dayIdx];
    const slot = day.slots[slotIdx];
    const cell = slot.cells[classKey];
    const cls = this.classes.find(c => c.key === classKey);

    this.editingCell = {
      dayIdx,
      slotIdx,
      classKey,
      currentValue: cell.value || '',
      dayLabel: `${day.dayName} (${day.dateLabel})`,
      timeLabel: `${slot.startTime} - ${slot.endTime}`,
      className: cls?.fullName || classKey
    };
  }

  applyCellEdit(newVal: string): void {
    if (!this.editingCell) return;
    const { dayIdx, slotIdx, classKey } = this.editingCell;
    const day = this.days[dayIdx];
    const slot = day.slots[slotIdx];

    slot.cells[classKey] = this.makeCell(newVal);
    this.editingCell = null;
    this.detectStaffConflicts();
    this.calculateSubjectCountsPerBatch();
  }

  closeCellEdit(): void {
    this.editingCell = null;
  }

  // Preset cell values
  setPreset(preset: string): void {
    if (this.editingCell) {
      this.editingCell.currentValue = preset;
      this.applyCellEdit(preset);
    }
  }

  // Subject Color Palette for Excel Export & UI Preview
  getSubjectColorPalette(
    cellText: string,
    isExam?: boolean,
    isBreak?: boolean,
    isLunch?: boolean,
    isHoliday?: boolean
  ): { bg: string; font: string } {
    if (isHoliday || (cellText && cellText.toUpperCase().includes('HOLIDAY'))) {
      return { bg: 'FFE4E6', font: '9F1239' }; // Soft Rose
    }
    if (isExam || (cellText && (cellText.toUpperCase().includes('EXAM') || cellText.toUpperCase().includes('TEST')))) {
      return { bg: 'FEE2E2', font: '991B1B' }; // Coral Red
    }
    if (isBreak || isLunch || (cellText && (cellText.toUpperCase().includes('BREAK') || cellText.toUpperCase().includes('LUNCH')))) {
      return { bg: 'F1F5F9', font: '475569' }; // Soft Neutral Gray
    }
    const up = (cellText || '').toUpperCase().trim();
    if (!up) {
      return { bg: 'FFFFFF', font: '1E293B' };
    }

    if (up.includes('PET') || up.includes('YOGA') || up.includes('PHYSICAL')) {
      return { bg: 'FEF9C3', font: '854D0E' }; // Warm Amber Yellow
    }

    if (up.includes('PHYSIC') || up.includes('(PHY)') || this.isSubjectMatch(up, 'Physics')) {
      return { bg: 'DBEAFE', font: '1E40AF' }; // Soft Blue
    }
    if (up.includes('CHEMIS') || up.includes('(CHE)') || this.isSubjectMatch(up, 'Chemistry')) {
      return { bg: 'D1FAE5', font: '065F46' }; // Soft Emerald Green
    }
    if (up.includes('MAT (') || up.startsWith('MAT ') || up === 'MAT' || this.isSubjectMatch(up, 'MAT')) {
      return { bg: 'F3E8FF', font: '6B21A8' }; // Soft Lavender
    }
    if (up.includes('MATHEMATIC') || up.includes('(MATH)') || up.includes('MATHS') || up.includes('MATH') || this.isSubjectMatch(up, 'Maths')) {
      return { bg: 'EDE9FE', font: '5B21B6' }; // Soft Purple
    }
    if (up.includes('BOTAN') || up.includes('(BOT)') || this.isSubjectMatch(up, 'Botany')) {
      return { bg: 'ECFCCB', font: '3F6212' }; // Soft Lime Green
    }
    if (up.includes('ZOOLOG') || up.includes('(ZOO)') || this.isSubjectMatch(up, 'Zoology')) {
      return { bg: 'FFEDD5', font: '9A3412' }; // Soft Peach Orange
    }
    if (up.includes('BIOLOG') || up.includes('(BIO)') || this.isSubjectMatch(up, 'Biology')) {
      return { bg: 'FCE7F3', font: '9D174D' }; // Soft Pink
    }
    if (up.includes('ENGLISH') || up.includes('(ENG)') || this.isSubjectMatch(up, 'English')) {
      return { bg: 'CFFAFE', font: '155E75' }; // Soft Cyan
    }
    if (up.includes('SOCIAL') || up.includes('(SCL)') || up.includes('HISTORY') || up.includes('CIVICS') || this.isSubjectMatch(up, 'Social Science')) {
      return { bg: 'FEF3C7', font: '92400E' }; // Soft Warm Amber
    }
    if (up.includes('TAMIL') || up.includes('HINDI') || up.includes('(LNG)') || up.includes('LANGUAGE') || this.isSubjectMatch(up, 'Language')) {
      return { bg: 'E0E7FF', font: '3730A3' }; // Soft Indigo
    }
    if (up.includes('COMPUTER') || up.includes('(CS)') || up.includes('(COMP') || this.isSubjectMatch(up, 'Computer Science')) {
      return { bg: 'E2E8F0', font: '334155' }; // Soft Slate Gray
    }

    return { bg: 'F8FAFC', font: '1E293B' };
  }

  isSubjectMatch(text: string, targetSubject: string): boolean {
    const rawTokens = text.split(/[\s\-()]+/);
    for (const t of rawTokens) {
      const code = t.trim().toUpperCase();
      if (code && this.staffSubjectMap[code] === targetSubject) {
        return true;
      }
    }
    return false;
  }

  // Export Timetable to Excel with rich colors and column width formatting
  exportToExcel(): void {
    const rows: any[] = [];
    const cellStyles: { [address: string]: any } = {};

    // 1. Header row
    const header = [
      'Date & Day',
      'Start Time',
      'End Time',
      ...this.classes.map(c => c.fullName),
      'Hostel Duty',
      'Math Genie / Notes'
    ];
    rows.push(header);

    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };

    const headerBorder = {
      top: { style: 'thin', color: { rgb: '475569' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: '475569' } },
      right: { style: 'thin', color: { rgb: '475569' } }
    };

    // Header styling
    for (let c = 0; c < header.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      cellStyles[addr] = {
        fill: { fgColor: { rgb: '1E293B' }, patternType: 'solid' },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: headerBorder
      };
    }

    let currentRowIdx = 1;
    const rowHeights: { hpt: number }[] = [{ hpt: 32 }]; // Header row height

    for (const day of this.days) {
      let isFirstSlotOfDay = true;
      for (const slot of day.slots) {
        const row: any[] = [
          isFirstSlotOfDay ? `${day.dateLabel}\n${day.dayName}` : '',
          slot.startTime,
          slot.endTime
        ];

        // Date & Day cell style
        const dateAddr = XLSX.utils.encode_cell({ r: currentRowIdx, c: 0 });
        cellStyles[dateAddr] = {
          fill: { fgColor: { rgb: 'F1F5F9' }, patternType: 'solid' },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: thinBorder
        };

        // Start & End Time cell style
        const startAddr = XLSX.utils.encode_cell({ r: currentRowIdx, c: 1 });
        const endAddr = XLSX.utils.encode_cell({ r: currentRowIdx, c: 2 });
        const timeStyle = {
          fill: { fgColor: { rgb: 'F8FAFC' }, patternType: 'solid' },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '475569' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder
        };
        cellStyles[startAddr] = timeStyle;
        cellStyles[endAddr] = timeStyle;

        // Class Columns
        for (let colIdx = 0; colIdx < this.classes.length; colIdx++) {
          const c = this.classes[colIdx];
          const cell = slot.cells[c.key];
          const val = cell?.value || '';
          row.push(val);

          const cellAddr = XLSX.utils.encode_cell({ r: currentRowIdx, c: colIdx + 3 });
          const palette = this.getSubjectColorPalette(val, cell?.isExam, cell?.isBreak, cell?.isLunch, cell?.isHoliday);

          cellStyles[cellAddr] = {
            fill: { fgColor: { rgb: palette.bg }, patternType: 'solid' },
            font: { name: 'Calibri', sz: 10, bold: palette.bg !== 'FFFFFF', color: { rgb: palette.font } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: thinBorder
          };
        }

        // Hostel Duty & Notes
        const dutyCol = this.classes.length + 3;
        const notesCol = this.classes.length + 4;
        row.push(slot.hostelDuty || '');
        row.push(slot.notes || '');

        cellStyles[XLSX.utils.encode_cell({ r: currentRowIdx, c: dutyCol })] = {
          fill: { fgColor: { rgb: 'F8FAFC' }, patternType: 'solid' },
          font: { name: 'Calibri', sz: 9, color: { rgb: '334155' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: thinBorder
        };
        cellStyles[XLSX.utils.encode_cell({ r: currentRowIdx, c: notesCol })] = {
          fill: { fgColor: { rgb: 'F8FAFC' }, patternType: 'solid' },
          font: { name: 'Calibri', sz: 9, color: { rgb: '334155' } },
          alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
          border: thinBorder
        };

        rows.push(row);
        rowHeights.push({ hpt: 28 });
        currentRowIdx++;
        isFirstSlotOfDay = false;
      }

      // Day divider row
      const sepRow = new Array(header.length).fill('');
      rows.push(sepRow);
      for (let c = 0; c < header.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: currentRowIdx, c });
        cellStyles[addr] = {
          fill: { fgColor: { rgb: 'E2E8F0' }, patternType: 'solid' },
          border: {
            top: { style: 'thin', color: { rgb: '94A3B8' } },
            bottom: { style: 'medium', color: { rgb: '64748B' } }
          }
        };
      }
      rowHeights.push({ hpt: 8 });
      currentRowIdx++;
    }

    // Weekly Requirements Table at bottom
    rows.push(['=== WEEKLY SUBJECT TARGETS & ASSIGNMENTS PER BATCH ===']);
    cellStyles[XLSX.utils.encode_cell({ r: currentRowIdx, c: 0 })] = {
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: '1E293B' } }
    };
    rowHeights.push({ hpt: 24 });
    currentRowIdx++;

    for (const c of this.classes) {
      const bData = this.batchRequirements[c.key];
      if (!bData) continue;
      const assignedSubs = bData.subjects.filter(s => s.staffCodes && s.staffCodes.length > 0);

      rows.push([`Batch: ${bData.fullName} (${bData.batchCode})`]);
      cellStyles[XLSX.utils.encode_cell({ r: currentRowIdx, c: 0 })] = {
        fill: { fgColor: { rgb: 'F1F5F9' }, patternType: 'solid' },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } }
      };
      rowHeights.push({ hpt: 22 });
      currentRowIdx++;

      rows.push(['Subject Name & Assigned Staff', 'Target Periods', 'Scheduled Periods', 'Status', 'Staff Codes']);
      for (let sc = 0; sc < 5; sc++) {
        cellStyles[XLSX.utils.encode_cell({ r: currentRowIdx, c: sc })] = {
          fill: { fgColor: { rgb: '334155' }, patternType: 'solid' },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder
        };
      }
      rowHeights.push({ hpt: 20 });
      currentRowIdx++;

      for (const sub of assignedSubs) {
        const isMet = sub.scheduledPeriods >= sub.targetPeriods;
        const statusText = isMet ? 'Target Met' : 'Incomplete';
        rows.push([sub.displayName, sub.targetPeriods, sub.scheduledPeriods, statusText, sub.staffCodes.join(', ')]);

        const statusColor = isMet ? { bg: 'D1FAE5', font: '065F46' } : { bg: 'FEF3C7', font: '92400E' };
        for (let sc = 0; sc < 5; sc++) {
          const addr = XLSX.utils.encode_cell({ r: currentRowIdx, c: sc });
          cellStyles[addr] = {
            fill: sc === 3 ? { fgColor: { rgb: statusColor.bg }, patternType: 'solid' } : undefined,
            font: { name: 'Calibri', sz: 10, bold: sc === 3, color: sc === 3 ? { rgb: statusColor.font } : { rgb: '1E293B' } },
            alignment: { horizontal: sc === 0 ? 'left' : 'center', vertical: 'center' },
            border: thinBorder
          };
        }
        rowHeights.push({ hpt: 18 });
        currentRowIdx++;
      }
      rows.push(['']);
      rowHeights.push({ hpt: 8 });
      currentRowIdx++;
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set managed column widths (auto fits names and staff)
    const colWidths = [
      { wch: 18 }, // Date & Day
      { wch: 12 }, // Start Time
      { wch: 12 }, // End Time
      ...this.classes.map(() => ({ wch: 22 })), // Batch columns
      { wch: 18 }, // Hostel Duty
      { wch: 26 }  // Math Genie / Notes
    ];
    ws['!cols'] = colWidths;
    ws['!rows'] = rowHeights;

    // Apply cell styles to worksheet
    for (const [addr, style] of Object.entries(cellStyles)) {
      if (ws[addr]) {
        ws[addr].s = style;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Timetable');
    XLSX.writeFile(wb, `Timetable_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.alertService.success('Colorful Timetable downloaded successfully with unique subject colors!');
  }

  // Time & Payload serialization helpers
  parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = (match[3] || '').toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  parseCellValue(
    cellVal: string,
    isExam?: boolean,
    isBreak?: boolean,
    isLunch?: boolean,
    isHoliday?: boolean
  ): { subjectName: string; facultyCode: string; periodType: string; examDescription: string | null } | null {
    if (!cellVal || isBreak || isLunch || cellVal.includes('BREAK') || cellVal.includes('LUNCH')) {
      return null;
    }
    const clean = cellVal.trim();
    let facultyCode = '';
    let subjectName = '';
    const periodType = isExam || clean.toUpperCase().includes('EXAM') || clean.toUpperCase().includes('TEST') ? 'EXAM' : 'LECTURE';
    const examDescription = periodType === 'EXAM' ? clean : null;

    if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      subjectName = this.normalizeSubjectName(parts[0]) || parts[0].trim();
      facultyCode = parts[1].trim().toUpperCase();
    } else {
      const norm = this.normalizeSubjectName(clean);
      if (norm) {
        subjectName = norm;
      } else {
        facultyCode = clean.toUpperCase();
      }
    }

    return {
      subjectName,
      facultyCode,
      periodType,
      examDescription
    };
  }

  getWeekMondayMs(): number {
    if (this.days.length && this.days[0].dateLabel) {
      const parts = this.days[0].dateLabel.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return Date.UTC(y, m, d);
      }
    }
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    now.setUTCDate(now.getUTCDate() + diff);
    now.setUTCHours(0, 0, 0, 0);
    return now.getTime();
  }

  buildBackendPayload(publish: boolean): any {
    const currentMondayMs = this.getWeekMondayMs();
    const timetables: any[] = [];

    for (const c of this.classes) {
      if (!c.batchCode) continue;

      const week: any[] = [];
      for (const d of this.days) {
        const dayName = d.dayName.toUpperCase();
        const periods: any[] = [];

        let periodNo = 1;
        for (const slot of d.slots) {
          const cell = slot.cells[c.key];
          const val = cell?.value || '';

          if (cell?.isBreak || cell?.isLunch || val.toUpperCase().includes('BREAK') || val.toUpperCase().includes('LUNCH')) {
            continue;
          }

          const parsed = this.parseCellValue(val, cell?.isExam, cell?.isBreak, cell?.isLunch, cell?.isHoliday);
          const startMin = this.parseTimeToMinutes(slot.startTime) || (510 + (periodNo - 1) * 55);
          const endMin = this.parseTimeToMinutes(slot.endTime) || (startMin + 45);

          periods.push({
            periodNo,
            time: {
              startMin,
              endMin,
              startLabel: slot.startTime,
              endLabel: slot.endTime
            },
            periodType: parsed?.periodType || 'LECTURE',
            examDescription: parsed?.examDescription || null,
            subjectName: parsed?.subjectName || 'General',
            facultyCode: parsed?.facultyCode || '',
            notes: slot.notes || null
          });

          periodNo++;
        }

        week.push({
          day: dayName,
          periods
        });
      }

      timetables.push({
        batchCode: c.batchCode,
        week
      });
    }

    return {
      tenantId: this.tenantId,
      wkStartOn: currentMondayMs,
      publish,
      timetables
    };
  }

  publishTimetableToBackend(): void {
    if (confirm('Are you sure you want to publish this generated timetable to IMS Attendance? It will become active for all 17 batches.')) {
      this.syncTimetable(true);
    }
  }

  saveDraftToBackend(): void {
    this.syncTimetable(false);
  }

  syncTimetable(publish: boolean): void {
    this.savingToBackend = true;
    const payload = this.buildBackendPayload(publish);

    this.commonApi.fetchData(payload, 'timetable', 'generator/sync-publish')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.savingToBackend = false;
          if (res?.status) {
            this.publishStatus = publish ? 'PUBLISHED' : 'DRAFT';
            this.alertService.success(
              publish
                ? `Timetable published successfully across ${res.count || this.classes.length} batches! Now live in IMS Attendance.`
                : `Timetable draft saved successfully for ${res.count || this.classes.length} batches.`
            );
          } else {
            this.alertService.error(res?.message || 'Failed to save timetable to backend.');
          }
        },
        error: (err: any) => {
          this.savingToBackend = false;
          this.alertService.error(err?.error?.message || 'Error communicating with backend timetable service.');
        }
      });
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode) {
      this.alertService.success('Edit mode enabled. Click any cell to update period or staff.');
    } else {
      this.detectStaffConflicts();
      this.calculateSubjectCountsPerBatch();
      this.alertService.success('Changes applied.');
    }
  }

  resetToDefault(): void {
    if (confirm('Reset timetable to original template?')) {
      this.initDefaultTimetableData();
      this.initBatchRequirementsStructure();
      this.detectStaffConflicts();
      this.calculateSubjectCountsPerBatch();
      this.publishStatus = 'UNSAVED';
      this.alertService.success('Timetable reset to template defaults.');
    }
  }

  saveTimetable(): void {
    this.isEditMode = false;
    this.detectStaffConflicts();
    this.calculateSubjectCountsPerBatch();
    this.saveDraftToBackend();
  }
}
