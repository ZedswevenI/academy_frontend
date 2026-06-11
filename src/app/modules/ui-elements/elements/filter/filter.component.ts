import { Component, Input, forwardRef, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl } from '@angular/forms';

@Component({
  selector: 'filter',
  standalone: false,
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterComponent),
      multi: true
    }
  ]
})

export class FilterComponent implements ControlValueAccessor {
 
  @Input() label1 = '';
  @Input() label2 = '';
  @Input() label3 = '';

  @Input() options1: any[] = [];
  @Input() options2: any[] = [];
  @Input() options3: any[] = [];

  @Input() optionLabel1 = 'label';
  @Input() optionLabel2 = 'label';
  @Input() optionLabel3 = 'label';

  @Input() optionValue1 = 'value';
  @Input() optionValue2 = 'value';
  @Input() optionValue3 = 'value';

  @Input() placeholder = 'Select';
  @Input() required = false;
  @Input() disabled = false;
  @Input() control: AbstractControl | null = null;

  @Output() selectionChange = new EventEmitter<any>();

  value = {
    value1: null,
    value2: null,
    value3: null
  };

  onChange = (_: any) => {};
  onTouched = () => {};

  writeValue(val: any): void {
    if (val) {
      this.value = { ...this.value, ...val };
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  onSelect1(val: any) {
    this.value.value1 = val;
    this.value.value2 = null;
    this.value.value3 = null;
    this.propagate();
  }

  onSelect2(val: any) {
    this.value.value2 = val;
    this.value.value3 = null;
    this.propagate();
  }

  onSelect3(val: any) {
    this.value.value3 = val;
    this.propagate();
  }

  propagate() {
    this.onChange(this.value);
    this.selectionChange.emit(this.value);
    this.onTouched();
  }

  getLabel1(opt: any) { return opt[this.optionLabel1]; }
  getLabel2(opt: any) { return opt[this.optionLabel2]; }
  getLabel3(opt: any) { return opt[this.optionLabel3]; }
}
