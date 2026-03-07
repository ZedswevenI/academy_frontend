import {
  Component, Input, forwardRef, Output, EventEmitter,
  HostListener, ElementRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl } from '@angular/forms';

@Component({
  selector: 'multiselect',
  standalone: false,
  templateUrl: './multiselect.component.html',
  styleUrl: './multiselect.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiselectComponent),
      multi: true
    }
  ]
})
export class MultiselectComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = 'Select';
  @Input() required: boolean = false;
  @Input() options: any[] = [];
  @Input() optionLabel: string = 'label';
  @Input() optionValue: string = 'value';
  @Input() control: AbstractControl | null = null;
  @Output() selectionChange = new EventEmitter<any[]>();

  isOpen        = false;
  selectedItems: any[] = [];
  value:         any[] = [];

  onChange  = (_: any) => {};
  onTouched = () => {};

  constructor(private elRef: ElementRef) {}

  // ── Close when clicking outside the component ────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.onTouched();
  }

  close(): void {
    this.isOpen = false;
  }

  // ── ControlValueAccessor ─────────────────────────────────────────────────
  registerOnChange(fn: any): void  { this.onChange  = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  writeValue(value: any): void {
    if (value && Array.isArray(value)) {
      this.value = value.map((v: any) =>
        typeof v === 'object' ? v[this.optionValue] : v
      );
      this.selectedItems = [...this.value];
    } else {
      this.selectedItems = [];
      this.value = [];
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  isSelected(option: any): boolean {
    return this.selectedItems.some(item => item === option[this.optionValue]);
  }

  toggleSelection(option: any): void {
    const val = option[this.optionValue];
    this.selectedItems = this.isSelected(option)
      ? this.selectedItems.filter(v => v !== val)
      : [...this.selectedItems, val];
    this.emit();
  }

  isAllSelected(): boolean {
    return this.options.length > 0 &&
           this.selectedItems.length === this.options.length;
  }

  isIndeterminate(): boolean {
    return this.selectedItems.length > 0 &&
           this.selectedItems.length < this.options.length;
  }

  toggleSelectAll(): void {
    this.selectedItems = this.isAllSelected()
      ? []
      : this.options.map(o => o[this.optionValue]);
    this.emit();
  }

  clearAll(): void {
    this.selectedItems = [];
    this.emit();
  }

  private emit(): void {
    this.value = [...this.selectedItems];
    this.onChange(this.value);
    this.onTouched();
    this.selectionChange.emit(this.value);
  }

  getSelectedLabels(): string {
    return this.selectedItems
      .map(val => {
        const found = this.options.find(o => o[this.optionValue] === val);
        return found ? found[this.optionLabel] : val;
      })
      .join(', ');
  }
}