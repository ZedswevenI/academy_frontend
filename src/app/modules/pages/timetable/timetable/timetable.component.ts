import { Component } from '@angular/core';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import { forkJoin } from 'rxjs';

const safeTrim = (v: any) =>
  v === undefined || v === null ? '' : String(v).trim();


@Component({
  selector: 'app-timetable',
  standalone: false,
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss'
})
export class TimetableComponent {
  timetableForm!: FormGroup;
  dataArray: any[] = [];
  originalData: any[] = [];
  totalRecords = 0;

  loading: boolean = false;

  program_options = []
  batch_options = []
  center_options = [];

  showUpload = false;
  // Parsed Data Holder
  parsedPayload: any = null;
  parseStats = { daysFound: 0, periodsFound: 0 };
  uploadForm!: FormGroup;
  file: File | null = null;

  columnsArray = [
    { key: 'batchCode', label: 'Batch', sortable: true },
    { key: 'centerCode', label: 'Center', sortable: true },
    { key: 'wkStartOn', label: 'Week Starting', sortable: true },
    { key: 'phase', label: 'Phase', sortable: true },
    { key: 'status', label: 'Status', sortable: true }
  ];

  actions = [
    {
      type: 'icon',
      icon: 'fa-regular fa-eye',
      tooltip: 'View',
      color: '#6B7280',
      hoverColor: '#0066FF',
      callback: (row: any) => this.viewTimetable(row)
    },
  ]

  constructor(
    private breadcrump: BredcrumpService,
    private fb: FormBuilder,
    private router: Router,
    private commonApi: CommonapiService,
    private alert: AlertService) {
    this.breadcrump.set([{ label: 'Time Table' }]);
  }

  ngOnInit(): void {
    this.timetableForm = this.fb.group({
      filter: ['', [Validators.required]]
    })

    this.loadAllLookupsAndInit();
  }

  // program, batch, center List
  loadAllLookupsAndInit() {
    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.loading = true;

    forkJoin({
      program: this.commonApi.fetchData(body, 'ims', 'program/list?list=full'),
      batch: this.commonApi.fetchData(body, 'batch', 'list?list=full'),
      center: this.commonApi.fetchData(body, 'ims', 'center/list?list=full'),
    }).subscribe({
      next: ({ program, batch, center }) => {
        this.program_options = program.data || [];
        this.batch_options = batch.data || [];
        this.center_options = center.data || [];
      },
      error: (err) => {
        this.loading = false;
        this.alert.error(`Unable to load initial data!`);
      }
    });
  }

  fetchTableData(params: {
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

    //filter (optional)
    // if (this.statusFilter && this.statusFilter !== 'all') {
    //   query.status = this.statusFilter;
    // }
    // if (this.selectedProgram) {
    //   query.programId = this.selectedProgram;
    // }
    // if (this.selectedCenter) {
    //   query.centerId = this.selectedCenter;
    // }

    // Build query string
    const queryString = Object.keys(query)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
      )
      .join('&');

    const body = {
      entiId: localStorage.getItem('tenantId')
    };

    this.commonApi.fetchData(body, 'timetable', `list?${queryString}`).subscribe({
      next: (res: any) => {
        this.dataArray = res.data;
        this.totalRecords = res?.count || 0;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.alert.error('Error loading admissions');
      }
    });
  }

  // --- CSV / Upload Handling ---
  openUpload(): void {
    this.showUpload = true;
    this.parsedPayload = null;
    this.parseStats = { daysFound: 0, periodsFound: 0 };
  }

  closeUpload(): void {
    this.showUpload = false;
    this.file = null;
    this.uploadForm.reset();
    this.parsedPayload = null;
  }

  downloadSample() {
    const header =
      'BatchCode,TimeStart,TimeEnd,Dates,FacultyID,Descriptions,Venue,RearrangedTo,Reason,IfCancelled,Phase,CentCode,WkStartOn';
    const row1 =
      'JEE-2025-A,09:00:00,10:30:00,2025-06-02,FAC001,Physics - Kinematics,Hall A,,,,Phase 1,CEN01,2025-06-02';
    const row2 =
      'JEE-2025-A,10:45:00,12:15:00,2025-06-02,FAC002,Maths - Calculus,Hall A,,,,Phase 1,CEN01,2025-06-02';
    const csvContent =
      'data:text/csv;charset=utf-8,' + [header, row1, row2].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Timetable_Upload_Format.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileChange(e: any): void {
    const f = e.target.files?.[0];
    if (!f) return;

    // Simple check for CSV
    if (f.name.endsWith('.csv') || f.type === 'text/csv') {
      this.file = f;
      this.parseCsv(f);
    } else {
      this.alert.warning('Please upload a .csv file for automatic parsing.');
      // If xlsx, you would need a library. For now, we handle CSV.
    }
  }

  parseCsv(file: File) {
    const reader = new FileReader();
    reader.onload = (evt: any) => {
      const text = evt.target.result;
      this.processCsvData(text);
    };
    reader.readAsText(file);
  }
  processCsvData(csvText: string) {
    const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim());
    const data = [];

    // Parse Rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length < headers.length) continue;
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = safeTrim(row[idx]);
      });
      data.push(obj);
    }

    if (data.length === 0) {
      this.alert.error('No valid data found in CSV');
      return;
    }

    // Extract Meta from first row (assuming uniform file)
    const first = data[0];
    const batchCode = first['BatchCode'];
    const centerCode = first['CentCode'];
    const phase = first['Phase'];

    // Parse WkStartOn (Assume YYYY-MM-DD)
    const wkStartRaw = first['WkStartOn']; // e.g. 2014-05-03

    // Auto-fill Form
    this.uploadForm.patchValue({
      batchCode: batchCode,
      centerCode: centerCode,
      phase: phase,
      wkStartOn: wkStartRaw, // Input type=date expects yyyy-mm-dd
    });

    // Group Periods by Day
    const weekMap = new Map<string, any[]>();
    const daysOrder = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ];

    data.forEach((row) => {
      const dateStr = row['Dates']; // e.g. 25/12/2014 or 2014-12-25
      if (!dateStr) return;

      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return; // Skip invalid dates

      const dayName =
        daysOrder[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]; // JS: Sun=0, Mon=1. Map to Mon=0

      if (!weekMap.has(dayName)) weekMap.set(dayName, []);

      // Convert Time to Min
      const startMin = this.timeToMin(row['TimeStart']);
      const endMin = this.timeToMin(row['TimeEnd']);

      if (startMin !== null && endMin !== null) {
        weekMap.get(dayName)?.push({
          startMin,
          endMin,
          facultyId: row['FacultyID'],
          topic: row['Descriptions'],
          venue: row['Venue'],
        });
      }
    });

    // Construct Final Payload 'week' array
    const weekPayload: any[] = [];
    weekMap.forEach((periods, day) => {
      // Sort periods by start time
      periods.sort((a, b) => a.startMin - b.startMin);

      // Assign Period No
      const periodsWithNo = periods.map((p, idx) => ({
        periodNo: idx + 1,
        time: { startMin: p.startMin, endMin: p.endMin },
        facultyId: p.facultyId,
        topic: p.topic,
        venue: p.venue,
      }));

      weekPayload.push({
        day: day,
        periods: periodsWithNo,
      });
    });

    this.parsedPayload = weekPayload;
    this.parseStats = {
      daysFound: weekPayload.length,
      periodsFound: weekPayload.reduce((acc, d) => acc + d.periods.length, 0),
    };
  }

  timeToMin(timeStr: string): number | null {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return h * 60 + m;
  }

  submitUpload() {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    if (!this.parsedPayload) {
      this.alert.error('No schedule data parsed. Please check the CSV.');
      return;
    }

    const v = this.uploadForm.value;

    const payload = {
      entiId: localStorage.getItem('tenantId'),
      batchCode: safeTrim(v.batchCode),
      centerCode: safeTrim(v.centerCode),
      phase: safeTrim(v.phase),
      wkStartOn: new Date(v.wkStartOn).getTime(), // Convert to Epoch
      week: this.parsedPayload,
    };

    this.loading = true;
    this.commonApi.fetchData(payload, 'timetable', 'create').subscribe({
      next: () => {
        this.loading = false;
        this.alert.success('Timetable created successfully');
        this.closeUpload();
        // this.loadTimetables();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Create failed');
      },
    });
  }

  viewTimetable(row: any) {
    // this.router.navigate(['/app/timetable/view'])
    const item = row?._raw || row;
    this.router.navigate(['/app/timetable/view', item._id]);
  }
}
