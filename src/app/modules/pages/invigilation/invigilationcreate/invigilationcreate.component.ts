import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AlertService } from '../../../../service/alert/alert.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-invigilationcreate',
  standalone: false,
  templateUrl: './invigilationcreate.component.html',
  styleUrl: './invigilationcreate.component.scss',
})
export class InvigilationcreateComponent implements OnInit {
  tenantId = localStorage.getItem('tenantId') || '';
  isEdit = false;
  editId = '';
  loading = false;
  saving = false;
  touched = false;
  examName = '';
  examDate = '';
  session = '';
  examStartTime = '';
  examEndTime = '';
  slot1StartTime = '';
  slot1EndTime = '';
  slot2StartTime = '';
  slot2EndTime = '';
  parsedRooms: any[] = [];
  parseErrors: string[] = [];
  parseLoading = false;
  fileName = '';
  selectedFile: File | null = null;
  existingRooms: any[] = [];
  replaceRooms = false;

  readonly sessionOptions = [
    { value: 'MORNING', label: 'Morning' },
    { value: 'AFTERNOON', label: 'Afternoon' },
  ];

  constructor(
    private commonApi: CommonapiService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.editId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit = !!this.editId;
    if (this.isEdit) this.loadRecord();
  }

  private loadRecord(): void {
    this.loading = true;
    this.commonApi
      .fetchData({ entiId: this.tenantId }, 'invigi', `get/${this.editId}`)
      .subscribe({
        next: (res: any) => {
          const d = res.data;
          const dt = new Date(d.examDate);
          this.examName = d.examName;
          this.examDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          this.session = d.session;
          this.examStartTime = d.examStartTime || '';
          this.examEndTime = d.examEndTime || '';
          this.slot1StartTime = d.slot1StartTime || '';
          this.slot1EndTime = d.slot1EndTime || '';
          this.slot2StartTime = d.slot2StartTime || '';
          this.slot2EndTime = d.slot2EndTime || '';
          this.existingRooms = d.rooms || [];
          this.loading = false;
        },
        error: () => {
          this.alert.error('Failed to load record');
          this.loading = false;
          this.router.navigate(['/app/invigilation']);
        },
      });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.parsedRooms = [];
    this.parseErrors = [];
    this.selectedFile = null;
    this.fileName = '';
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      this.alert.error('Only .xlsx or .xls files allowed');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.selectedFile = file;
    this.fileName = file.name;
    this.parseLoading = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), {
          type: 'array',
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
        const errors: string[] = [];
        const rooms: any[] = [];
        const seenRooms = new Set<string>();
        if (!rows.length) {
          errors.push('Excel file is empty');
        }
        rows.forEach((r, idx) => {
          const rowNo = idx + 2;
          const roomNo = String(
            r['Room No'] || r['roomNo'] || r['ROOM NO'] || '',
          ).trim();
          const s1Code = String(
            r['Slot 1 Staff Code'] || r['slot1StaffCode'] || r['SLOT1'] || '',
          )
            .trim()
            .toUpperCase();
          const s2Code = String(
            r['Slot 2 Staff Code'] || r['slot2StaffCode'] || r['SLOT2'] || '',
          )
            .trim()
            .toUpperCase();
          if (!roomNo && !s1Code && !s2Code) return;
          if (!roomNo) {
            errors.push(`Row ${rowNo}: Room No is empty`);
            return;
          }
          if (!s1Code && !s2Code) {
            errors.push(
              `Row ${rowNo} (${roomNo}): Both Slot 1 and Slot 2 staff codes are empty`,
            );
          }
          if (seenRooms.has(roomNo.toLowerCase())) {
            errors.push(`Row ${rowNo}: Duplicate room "${roomNo}"`);
          }
          seenRooms.add(roomNo.toLowerCase());
          rooms.push({
            roomNo,
            slot1StaffCode: s1Code || null,
            slot2StaffCode: s2Code || null,
          });
        });
        this.parsedRooms = rooms;
        this.parseErrors = errors;
        this.parseLoading = false;
        if (errors.length) {
          this.alert.error(`${errors.length} validation error(s) in Excel`);
        } else if (rooms.length) {
          this.alert.success(`${rooms.length} rooms parsed`);
        }
      } catch {
        this.alert.error('Failed to parse Excel file');
        this.selectedFile = null;
        this.fileName = '';
        this.parseLoading = false;
        (event.target as HTMLInputElement).value = '';
      }
    };
    reader.onerror = () => {
      this.alert.error('Failed to read file');
      this.parseLoading = false;
    };
    reader.readAsArrayBuffer(file);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.parsedRooms = [];
    this.parseErrors = [];
  }

  downloadSample(): void {
    const wb = XLSX.utils.book_new();
    const data = [
      {
        'Room No': 'Room-1',
        'Slot 1 Staff Code': 'CSR',
        'Slot 2 Staff Code': 'HST',
      },
      {
        'Room No': 'Room-2',
        'Slot 1 Staff Code': 'PAKG',
        'Slot 2 Staff Code': 'PSS',
      },
      {
        'Room No': 'Room-3',
        'Slot 1 Staff Code': 'EPK',
        'Slot 2 Staff Code': '',
      },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Rooms');
    XLSX.writeFile(wb, 'invigilation_rooms_sample.xlsx');
  }

  get activeRooms(): any[] {
    if (!this.isEdit) return this.parsedRooms;
    if (this.replaceRooms) return this.parsedRooms;
    return this.existingRooms.map((r) => ({
      roomNo: r.roomNo,
      slot1StaffCode: r.slot1StaffCode,
      slot2StaffCode: r.slot2StaffCode,
    }));
  }

  get isFormValid(): boolean {
    const base = !!this.examName.trim() && !!this.examDate && !!this.session;
    if (!base || this.parseErrors.length) return false;
    if (!this.isEdit) return this.parsedRooms.length > 0;
    if (this.replaceRooms)
      return this.parsedRooms.length > 0 && !this.parseErrors.length;
    return true;
  }

  save(): void {
    this.touched = true;
    if (!this.isFormValid) return;
    this.saving = true;
    // const epochDate = new Date(this.examDate).setHours(0, 0, 0, 0);
    const [year, month, day] = this.examDate.split('-').map(Number);
    const epochDate = Date.UTC(year, month - 1, day);
    const payload: any = {
      entiId: this.tenantId,
      examName: this.examName.trim(),
      examDate: epochDate,
      session: this.session,
      examStartTime: this.examStartTime || null,
      examEndTime: this.examEndTime || null,
      slot1StartTime: this.slot1StartTime || null,
      slot1EndTime: this.slot1EndTime || null,
      slot2StartTime: this.slot2StartTime || null,
      slot2EndTime: this.slot2EndTime || null,
      rooms: this.activeRooms,
    };
    const endpoint = this.isEdit ? `update/${this.editId}` : 'create';
    this.commonApi.fetchData(payload, 'invigi', endpoint).subscribe({
      next: () => {
        this.alert.success(
          `Invigilation ${this.isEdit ? 'updated' : 'created'} successfully`,
        );
        this.router.navigate(['/app/invigilation']);
      },
      error: (err: any) => {
        this.alert.error(
          err?.error?.message ||
            `Failed to ${this.isEdit ? 'update' : 'create'}`,
        );
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/app/invigilation']);
  }
}
