import {
  Component, Input, forwardRef, OnInit
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl } from '@angular/forms';

@Component({
  selector: 'select-or-input',
  standalone: false,
  templateUrl: './select-or-input.component.html',
  styleUrls: ['./select-or-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectOrInputComponent),
      multi: true
    }
  ]
})
export class SelectOrInputComponent implements ControlValueAccessor, OnInit {
  @Input() label        = '';
  @Input() placeholder  = 'Type here...';
  @Input() required     = false;
  @Input() options:     any[] = [];
  @Input() optionLabel  = 'label';
  @Input() optionValue  = 'value';
  @Input() control:     AbstractControl | null = null;

  isManual   = false;   // false = dropdown, true = text input
  selectVal  = '';
  inputVal   = '';

  onChange  = (_: any) => {};
  onTouched = () => {};

  ngOnInit(): void {
    // If options are empty, default to manual
    if (!this.options?.length) this.isManual = true;
  }

  registerOnChange(fn: any):  void { this.onChange  = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  writeValue(value: any): void {
    // null / undefined / empty → clear both, stay in current mode
    if (value === null || value === undefined || value === '') {
      this.selectVal = '';
      this.inputVal  = '';
      return;
    }

    // If value matches one of the loaded options → select mode
    const match = this.options?.find(o => o[this.optionValue] === value);
    if (match) {
      this.isManual  = false;
      this.selectVal = value;
      this.inputVal  = '';
    } else {
      // No match (free-text name or options not yet loaded) → manual mode
      this.isManual  = true;
      this.inputVal  = value;
      this.selectVal = '';
    }
  }

  toggleMode(): void {
    this.isManual = !this.isManual;
    // Clear value on mode switch
    this.selectVal = '';
    this.inputVal  = '';
    this.emit('');
  }

  onSelectChange(val: string): void {
    this.selectVal = val;
    this.emit(val);
  }

  onInputChange(val: string): void {
    this.inputVal = val;
    this.emit(val);
  }

  private emit(val: string): void {
    this.onChange(val);
    this.onTouched();
  }

  get currentValue(): string {
    return this.isManual ? this.inputVal : this.selectVal;
  }
}