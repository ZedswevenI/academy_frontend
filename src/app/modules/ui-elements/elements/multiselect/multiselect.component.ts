import { Component, Input, forwardRef, Output, EventEmitter } from '@angular/core';
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
  @Output() selectionChange = new EventEmitter<any>();

  selectedItems: any[] = [];
  value: any = [];
  onChange = (_: any) => { };
  onTouched = () => { };
 
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  } 

  writeValue(value: any): void {
  if (value && Array.isArray(value)) {
    // ✅ Normalize — store as plain value array (strings/numbers)
    this.value = value.map((v: any) =>
      typeof v === 'object' ? v[this.optionValue] : v
    );
    this.selectedItems = this.value;
  } else {
    this.selectedItems = [];
    this.value = [];
  }
}

isSelected(option: any): boolean {
  // ✅ Compare by optionValue field, not object reference
  return this.selectedItems.some(
    item => item === option[this.optionValue]
  );
}

toggleSelection(option: any): void {
  const val = option[this.optionValue];
  const index = this.selectedItems.indexOf(val);

  if (index === -1) {
    this.selectedItems = [...this.selectedItems, val];
  } else {
    this.selectedItems = this.selectedItems.filter(v => v !== val);
  }

  this.value = [...this.selectedItems];
  this.onChange(this.value);
  this.onTouched();
  this.selectionChange.emit(this.value);
}

getSelectedLabels(): string {
  // ✅ Find labels by matching optionValue
  return this.selectedItems
    .map(val => {
      const found = this.options.find(o => o[this.optionValue] === val);
      return found ? found[this.optionLabel] : val;
    })
    .join(', ');
}
}
