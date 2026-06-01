import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges, HostListener, ElementRef
} from '@angular/core';
import { BatchOption } from '../../report.service';

export interface BatchSelectionChange {
  ids: string[];
  codes: string[];
}

@Component({
  selector: 'app-batch-multiselect',
   standalone: false,
  templateUrl: `./batch-multiselect.component.html`,
  styles: [`
    .batch-ms-option:hover { background: #f8f9fa; }
    .batch-ms-wrapper button.form-select:focus { box-shadow: 0 0 0 .25rem rgba(13,110,253,.25); }
  `]
})
export class BatchMultiselectComponent implements OnInit, OnChanges {
  @Input() options: BatchOption[] = [];
  @Input() label = 'Batch';
  @Input() optional = true;
  @Input() required = false;
  @Input() touched = false;

  @Output() selectionChange = new EventEmitter<BatchSelectionChange>();

  selectedIds: string[] = [];
  open = false;
  search = '';

  constructor(private el: ElementRef) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    // If options change and some selected ids are no longer valid, clean up
    if (changes['options']) {
      const validIds = new Set(this.options.map(o => o.value));
      this.selectedIds = this.selectedIds.filter(id => validIds.has(id));
    }
  }

  get filtered(): BatchOption[] {
    const q = this.search.toLowerCase().trim();
    return q ? this.options.filter(b => b.label.toLowerCase().includes(q)) : this.options;
  }

  get allSelected(): boolean {
    return this.options.length > 0 && this.selectedIds.length === this.options.length;
  }

  get selectionLabel(): string {
    if (!this.selectedIds.length) return 'All Batches';
    if (this.allSelected) return 'All Batches';
    if (this.selectedIds.length === 1) {
      return this.options.find(b => b.value === this.selectedIds[0])?.label || '1 selected';
    }
    return `${this.selectedIds.length} batches selected`;
  }

  get showError(): boolean {
    return this.required && this.touched && !this.selectedIds.length;
  }

  get selectedCodes(): string[] {
    return this.options
      .filter(b => this.selectedIds.includes(b.value))
      .map(b => b.batchCode);
  }

  isSelected(value: string): boolean {
    return this.selectedIds.includes(value);
  }

  toggle(value: string): void {
    const batch = this.options.find(b => b.value === value);
    if (this.isSelected(value)) {
      this.selectedIds = this.selectedIds.filter(id => id !== value);
    } else {
      this.selectedIds = [...this.selectedIds, value];
    }
    this.emit();
  }

  toggleAll(): void {
    if (this.allSelected) {
      this.selectedIds = [];
    } else {
      this.selectedIds = this.options.map(b => b.value);
    }
    this.emit();
  }

  clear(): void {
    this.selectedIds = [];
    this.emit();
  }

  setSelection(ids: string[]): void {
    this.selectedIds = ids.filter(id => this.options.some(b => b.value === id));
    this.emit();
  }

  toggleDropdown(): void {
    this.open = !this.open;
    if (!this.open) this.search = '';
  }

  private emit(): void {
    this.selectionChange.emit({
      ids: [...this.selectedIds],
      codes: this.selectedCodes
    });
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.open = false;
      this.search = '';
    }
  }
}