import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, HostListener, ElementRef
} from '@angular/core';
import { StaffOption } from '../../report.service';

@Component({
  selector: 'app-staff-multiselect',
  standalone: false,
  templateUrl: './staff-multiselect.component.html',
  styles: [`.staff-ms-option:hover { background: #f8f9fa; }`]
})
export class StaffMultiselectComponent implements OnChanges {
  @Input() options: StaffOption[] = [];
  @Input() label = 'Staff';
  @Input() optional = true;
  @Input() required = false;
  @Input() touched = false;

  @Output() selectionChange = new EventEmitter<string[]>();

  selectedIds: string[] = [];
  open = false;
  search = '';

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      const validIds = new Set(this.options.map(o => o.value));
      this.selectedIds = this.selectedIds.filter(id => validIds.has(id));
    }
  }

  get filtered(): StaffOption[] {
    const q = this.search.toLowerCase().trim();
    return q ? this.options.filter(s => s.label.toLowerCase().includes(q)) : this.options;
  }

  get allSelected(): boolean {
    return this.options.length > 0 && this.selectedIds.length === this.options.length;
  }

  get selectionLabel(): string {
    if (!this.selectedIds.length) return 'All Staff';
    if (this.allSelected) return 'All Staff';
    if (this.selectedIds.length === 1)
      return this.options.find(s => s.value === this.selectedIds[0])?.label || '1 selected';
    return `${this.selectedIds.length} staff selected`;
  }

  get showError(): boolean {
    return this.required && this.touched && !this.selectedIds.length;
  }

  isSelected(value: string): boolean { return this.selectedIds.includes(value); }

  toggle(value: string): void {
    if (this.isSelected(value)) this.selectedIds = this.selectedIds.filter(id => id !== value);
    else this.selectedIds = [...this.selectedIds, value];
    this.emit();
  }

  toggleAll(): void {
    this.selectedIds = this.allSelected ? [] : this.options.map(s => s.value);
    this.emit();
  }

  clear(): void { this.selectedIds = []; this.emit(); }

  private emit(): void { this.selectionChange.emit([...this.selectedIds]); }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.open = false; this.search = '';
    }
  }

  toggleDropdown(): void {
    this.open = !this.open;
    if (!this.open) this.search = '';
  }
}