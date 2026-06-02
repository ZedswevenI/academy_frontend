import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, HostListener, ElementRef
} from '@angular/core';
import { StudentOption, ReportService } from '../../report.service';

@Component({
  selector: 'app-student-multiselect',
  standalone: false,
  templateUrl: `./student-multiselect.component.html`,
  styles: [`.student-ms-option:hover { background: #f8f9fa; }`]
})
export class StudentMultiselectComponent implements OnChanges {
  @Input() batchCodes: string[] = [];
  @Input() label = 'Student';
  @Input() allowManual = true;
  @Input() touched = false;

  @Output() selectionChange = new EventEmitter<{ ids: string[]; admissionNos: string[] }>();

  options: StudentOption[] = [];
  selectedIds: string[] = [];
  selectedAdmissionNos: string[] = [];
  open = false;
  search = '';
  loading = false;

  constructor(
    private el: ElementRef,
    private reportService: ReportService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['batchCodes']) {
      // Clear selection when batches change
      this.selectedIds = [];
      this.selectedAdmissionNos = [];
      this.options = [];
      this.emit();
      if (this.batchCodes.length) {
        this.loadStudents();
      }
    }
  }

  private loadStudents(): void {
    this.loading = true;
    this.reportService.loadStudentsByBatchCodes(this.batchCodes).subscribe({
      next: (opts) => {
        this.options = opts;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filtered(): StudentOption[] {
    const q = this.search.toLowerCase().trim();
    return q ? this.options.filter(s => s.label.toLowerCase().includes(q)) : this.options;
  }

  get allSelected(): boolean {
    return this.options.length > 0 && this.selectedIds.length === this.options.length;
  }

  get selectionLabel(): string {
    if (!this.selectedIds.length) return 'Select Students';
    if (this.allSelected) return 'All Students';
    if (this.selectedIds.length === 1)
      return this.options.find(s => s.value === this.selectedIds[0])?.label || '1 selected';
    return `${this.selectedIds.length} students selected`;
  }

  get showError(): boolean {
    return this.touched && !this.selectedIds.length && !this.selectedAdmissionNos.length;
  }

  isSelected(value: string): boolean { return this.selectedIds.includes(value); }

  toggle(value: string): void {
    const student = this.options.find(s => s.value === value);
    if (this.isSelected(value)) {
      this.selectedIds = this.selectedIds.filter(id => id !== value);
      this.selectedAdmissionNos = this.selectedAdmissionNos.filter(a => a !== student?.admissionNo);
    } else {
      this.selectedIds = [...this.selectedIds, value];
      if (student?.admissionNo) this.selectedAdmissionNos = [...this.selectedAdmissionNos, student.admissionNo];
    }
    this.emit();
  }

  toggleAll(): void {
    if (this.allSelected) {
      this.selectedIds = [];
      this.selectedAdmissionNos = [];
    } else {
      this.selectedIds = this.options.map(s => s.value);
      this.selectedAdmissionNos = this.options.map(s => s.admissionNo).filter(Boolean);
    }
    this.emit();
  }

  clear(): void {
    this.selectedIds = [];
    this.selectedAdmissionNos = [];
    this.emit();
  }

  onManualInput(event: any): void {
    const val = event.target.value || '';
    this.selectedAdmissionNos = val.split(',').map((s: string) => s.trim()).filter(Boolean);
    this.selectedIds = [...this.selectedAdmissionNos];
    this.emit();
  }

  toggleDropdown(): void {
    this.open = !this.open;
    if (!this.open) this.search = '';
  }

  private emit(): void {
    this.selectionChange.emit({
      ids: [...this.selectedIds],
      admissionNos: [...this.selectedAdmissionNos]
    });
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.open = false; this.search = '';
    }
  }
}